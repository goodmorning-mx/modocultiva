from functools import lru_cache
from types import SimpleNamespace
from uuid import uuid4
from typing import Literal
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from gm_agent import AgentService, Conversation, OpenAIProvider
from gm_auth import AuthIdentity, AuthService, AuthSettings, create_auth_router, identity_dependency
from gm_billing import BillingService, PricingRule
from gm_mcp import RequestContext, ToolRegistry

from app.billing import PostgresBillingStore
from app.clarity import activity_alignment_instruction
from app.community_rules import (
    REVIEW_QUORUM, ActivityShareInput, AudienceInput, ConnectionAction, ConnectionInput,
    IdeaRequestInput, ImportActivityInput, PermissionAction, ProfileInput,
    ReactionInput, ReviewInput, SubmissionInput,
)
from app.community_errors import CommunityError
from app.community_media import CommunityMediaStore, MAX_VIDEO_BYTES
from app.community_status import community_storage_ready
from app.community_sharing import CommunitySharingService
from app.community_state import CommunityStateStore, StateConflict
from app.config import get_runtime_openai_api_key, get_settings
from app.database import create_database_engine

settings = get_settings()
engine = create_database_engine()
auth_service = AuthService(engine, AuthSettings(jwt_secret=settings.jwt_secret, issuer=settings.auth_issuer))
identity_required = identity_dependency(auth_service)
user_state_store = CommunityStateStore(engine)
community_media_store = CommunityMediaStore(engine)
community_service = CommunitySharingService(engine)
billing_service = BillingService(
    PostgresBillingStore(engine),
    [PricingRule(
        provider="openai", model=settings.openai_model,
        input_per_million=settings.openai_input_per_million,
        output_per_million=settings.openai_output_per_million,
        cached_input_per_million=settings.openai_cached_input_per_million,
        markup=settings.openai_billing_markup,
    )],
)

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(create_auth_router(auth_service))


@app.middleware("http")
async def private_community_responses(request: Request, call_next):
    response = await call_next(request)
    if request.url.path == "/state" or request.url.path.startswith(("/state/", "/community/")):
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


@app.exception_handler(CommunityError)
async def community_error_response(request: Request, error: CommunityError):
    return JSONResponse(status_code=error.status_code, content={"detail": {"code": error.code, "message": error.message}})


@app.exception_handler(StateConflict)
async def stale_state_response(request: Request, error: StateConflict):
    return JSONResponse(status_code=409, content={"detail": {"code": "state_conflict", "message": str(error)}, **error.snapshot.payload()})


class RegisterInput(BaseModel):
    email: str
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class ModeAIRequest(BaseModel):
    language: Literal["es", "en", "zh", "hi", "ar", "it", "pt", "ru", "de", "fr", "da"] = "es"
    mode_name: str = Field(min_length=1, max_length=120)
    level: int = Field(ge=0, le=8)
    level_name: str = Field(min_length=1, max_length=120)
    level_description: str = Field(min_length=1, max_length=800)
    effort: str = Field(min_length=1, max_length=160)
    context: str = Field(min_length=1, max_length=4000)
    user_name: str | None = Field(default=None, max_length=120)


class AgentChatInput(BaseModel):
    conversation_id: str | None = None
    prompt: str = Field(min_length=1, max_length=4000)
    model: str | None = None


class UserStatePayload(BaseModel):
    state: dict = Field(default_factory=dict)
    expected_revision: str | None = Field(default=None, max_length=36)


class ModeAIResponse(BaseModel):
    proposal: str
    model: str
    conversation_id: str


def _tokens(tokens) -> dict:
    return {
        "access_token": tokens.access_token, "refresh_token": tokens.refresh_token,
        "token_type": "bearer", "expires_in": tokens.expires_in,
        "identity": tokens.identity.as_dict(),
    }


def _ensure_default_organization() -> None:
    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO gm_auth_organizations (id, slug, name, created_at)
            VALUES (:id, :slug, :name, now()) ON CONFLICT (id) DO NOTHING
        """), {
            "id": settings.default_organization_id,
            "slug": settings.default_organization_slug,
            "name": settings.default_organization_name,
        })


@lru_cache(maxsize=1)
def _agent_service() -> AgentService:
    # GoodMorning Factory injects the managed binding into the backend at
    # runtime. No credential is stored in source control or returned by this API.
    api_key = get_runtime_openai_api_key(settings)
    if not api_key:
        raise HTTPException(status_code=503, detail="Modo IA no está configurado todavía.")
    provider = OpenAIProvider(AsyncOpenAI(api_key=api_key, timeout=settings.openai_timeout_seconds))
    return AgentService(provider, ToolRegistry(), billing_service)


conversations: dict[tuple[str, str, str], Conversation] = {}
guest_identity = SimpleNamespace(
    user_id="modo-cultiva-guest",
    organization_id=settings.default_organization_id,
    permissions=frozenset(),
    name="Persona invitada",
)


async def _respond(identity: AuthIdentity, conversation_id: str | None, prompt: str, model: str | None) -> tuple[str, str]:
    conversation_id = conversation_id or str(uuid4())
    key = (identity.organization_id, identity.user_id, conversation_id)
    conversation = conversations.setdefault(key, Conversation(id=conversation_id))
    context = RequestContext(identity.user_id, identity.organization_id, "modocultiva", frozenset(identity.permissions))
    message = await _agent_service().respond(
        conversation=conversation, prompt=prompt, context=context, model=model or settings.openai_model,
    )
    return message.content, conversation.id


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": settings.app_name, "status": "ok", "environment": settings.app_env}


@app.get("/agent/status")
def agent_status() -> dict[str, str | bool]:
    configured = bool(get_runtime_openai_api_key(settings))
    return {
        "module": "gm-agent",
        "mode": "embedded",
        "configured": configured,
        "model": settings.openai_model,
        "runtime_secret": "available" if configured else "missing",
    }


@app.get("/community/capabilities")
def community_capabilities() -> dict:
    # The integrated client/service is available only with the complete additive
    # evidence/audience schema. This read-only probe never changes storage.
    ready = community_storage_ready(engine)
    return {"storage_ready": ready, "features_enabled": ready,
            "review_quorum": REVIEW_QUORUM, "schema_version": "202610290003"}


@app.post("/community/media/video", status_code=201)
async def upload_private_evidence_video(request: Request, identity: AuthIdentity = Depends(identity_required)) -> dict:
    if request.headers.get("content-encoding", "identity") != "identity":
        raise CommunityError("video_encoding", "Upload the original video bytes, not a compressed request.", 415)
    length = request.headers.get("content-length")
    if length:
        try:
            declared_length = int(length)
        except ValueError as exc:
            raise CommunityError("video_size", "Invalid video size.", 400) from exc
        if declared_length < 1 or declared_length > MAX_VIDEO_BYTES:
            raise CommunityError("video_size", "A video must be nonempty and at most20MiB.", 413)
    content = bytearray()
    async for chunk in request.stream():
        if len(content) + len(chunk) > MAX_VIDEO_BYTES:
            raise CommunityError("video_size", "A video must be at most20MiB.", 413)
        content.extend(chunk)
    return await run_in_threadpool(community_media_store.upload, identity.user_id, identity.organization_id, bytes(content), request.headers.get("content-type", ""))


@app.get("/community/media/{asset_id}")
def read_private_evidence_video(asset_id: UUID, identity: AuthIdentity = Depends(identity_required)) -> Response:
    asset = community_media_store.read(identity.user_id, identity.organization_id, str(asset_id))
    extension = "mp4" if asset["mime_type"] == "video/mp4" else "webm"
    return Response(content=asset["content"], media_type=asset["mime_type"], headers={
        "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": f'inline; filename="activity-evidence.{extension}"',
    })


@app.put("/community/profile")
def community_profile(payload: ProfileInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.set_profile(identity.user_id, identity.organization_id, payload.display_name, payload.bio, payload.discoverable)


@app.get("/community/profile")
def get_community_profile(identity: AuthIdentity = Depends(identity_required)):
    return community_service.get_profile(identity.user_id, identity.organization_id)


@app.get("/community/members")
def community_members(identity: AuthIdentity = Depends(identity_required)):
    return community_service.directory(identity.user_id, identity.organization_id)


@app.post("/community/connections", status_code=201)
def request_community_connection(payload: ConnectionInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.request_connection(identity.user_id, identity.organization_id, payload.member_id)


@app.put("/community/connections/{connection_id}")
def respond_community_connection(connection_id: UUID, payload: ConnectionAction, identity: AuthIdentity = Depends(identity_required)):
    return community_service.change_connection(identity.user_id, identity.organization_id, str(connection_id), payload.action)


@app.post("/community/submissions", status_code=201)
def submit_community_evidence(payload: SubmissionInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.submit(identity.user_id, identity.organization_id, payload)


@app.get("/community/submissions")
def own_community_submissions(identity: AuthIdentity = Depends(identity_required)):
    return community_service.own_submissions(identity.user_id, identity.organization_id)


@app.get("/community/review-inbox")
def community_review_inbox(identity: AuthIdentity = Depends(identity_required)):
    return community_service.inbox(identity.user_id, identity.organization_id)


@app.get("/community/submissions/{submission_id}")
def read_community_submission(submission_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.read_submission(identity.user_id, identity.organization_id, str(submission_id))


@app.post("/community/submissions/{submission_id}/withdraw")
def withdraw_community_submission(submission_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.withdraw(identity.user_id, identity.organization_id, str(submission_id))


@app.post("/community/submissions/{submission_id}/reviews")
def review_community_evidence(submission_id: UUID, payload: ReviewInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.review(identity.user_id, identity.organization_id, str(submission_id), payload)


@app.get("/community/notifications")
def community_notifications(identity: AuthIdentity = Depends(identity_required)):
    return community_service.notices(identity.user_id, identity.organization_id)


@app.put("/community/notifications/{notification_id}/read")
def read_community_notification(notification_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.mark_notice(identity.user_id, identity.organization_id, str(notification_id))


@app.get("/community/feed")
def community_feed(identity: AuthIdentity = Depends(identity_required)):
    return community_service.feed(identity.user_id, identity.organization_id)


@app.post("/community/feed", status_code=201)
def share_community_card(payload: ActivityShareInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.share(identity.user_id, identity.organization_id, payload)


@app.put("/community/feed/{card_id}/audience")
def change_community_card_audience(card_id: UUID, payload: AudienceInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.change_audience(identity.user_id, identity.organization_id, str(card_id), payload)


@app.get("/community/public/cards/{card_id}")
def public_community_card(card_id: UUID):
    return community_service.card_detail(str(card_id), public_only=True)


@app.get("/community/cards/{card_id}")
def authenticated_community_card(card_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.card_detail(str(card_id), identity.user_id, identity.organization_id)


def card_video_response(asset):
    content = asset["content"]
    if not 0 < len(content) <= MAX_VIDEO_BYTES or len(content) != asset["byte_size"] or asset["mime_type"] not in {"video/mp4", "video/webm"}:
        raise CommunityError("media_not_found", "Uploaded evidence unavailable.", 404)
    extension = "mp4" if asset["mime_type"] == "video/mp4" else "webm"
    return Response(content=content, media_type=asset["mime_type"], headers={
        "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": f'inline; filename="activity-evidence.{extension}"',
    })


@app.get("/community/public/cards/{card_id}/video")
def public_community_card_video(card_id: UUID):
    return card_video_response(community_service.card_video(str(card_id), public_only=True))


@app.get("/community/cards/{card_id}/video")
def authenticated_community_card_video(card_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return card_video_response(community_service.card_video(str(card_id), identity.user_id, identity.organization_id))


@app.put("/community/feed/{card_id}/reaction")
def react_community_card(card_id: UUID, payload: ReactionInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.react(identity.user_id, identity.organization_id, str(card_id), payload.reaction)


@app.post("/community/feed/{card_id}/hide")
def hide_community_card(card_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.hide_card(identity.user_id, identity.organization_id, str(card_id))


@app.post("/community/feed/{card_id}/reuse", status_code=201)
def request_community_card_reuse(card_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.request_reuse(identity.user_id, identity.organization_id, str(card_id))


@app.get("/community/reuse-requests")
def community_reuse_requests(identity: AuthIdentity = Depends(identity_required)):
    return community_service.reuse_list(identity.user_id, identity.organization_id)


@app.put("/community/reuse-requests/{request_id}")
def respond_community_reuse(request_id: UUID, payload: PermissionAction, identity: AuthIdentity = Depends(identity_required)):
    return community_service.respond_reuse(identity.user_id, identity.organization_id, str(request_id), payload.action)


@app.post("/community/reuse-requests/{request_id}/import")
def import_community_reuse(request_id: UUID, payload: ImportActivityInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.import_reuse(identity.user_id, identity.organization_id, str(request_id), payload.expected_destination_hash)


@app.get("/community/ideas")
def community_local_ideas(identity: AuthIdentity = Depends(identity_required)):
    return community_service.list_ideas(identity.user_id, identity.organization_id)


@app.post("/community/ideas", status_code=201)
def request_community_idea(payload: IdeaRequestInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.create_idea(identity.user_id, identity.organization_id, payload)


@app.post("/community/ideas/{request_id}/cancel")
def cancel_community_idea(request_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.cancel_idea(identity.user_id, identity.organization_id, str(request_id))


@app.post("/community/ideas/{request_id}/offer", status_code=201)
def offer_community_idea(request_id: UUID, identity: AuthIdentity = Depends(identity_required)):
    return community_service.offer_idea(identity.user_id, identity.organization_id, str(request_id))


@app.post("/community/idea-offers/{offer_id}/import")
def import_community_idea(offer_id: UUID, payload: ImportActivityInput, identity: AuthIdentity = Depends(identity_required)):
    return community_service.import_idea(identity.user_id, identity.organization_id, str(offer_id), payload.expected_destination_hash)


@app.post("/auth/register")
def register(payload: RegisterInput) -> dict:
    _ensure_default_organization()
    try:
        auth_service.create_user(
            email=payload.email, name=payload.name, password=payload.password,
            organization_id=settings.default_organization_id,
        )
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo.") from exc
    tokens = auth_service.login(email=payload.email, password=payload.password, organization_id=settings.default_organization_id)
    if tokens is None:
        raise HTTPException(status_code=401, detail="No fue posible iniciar la cuenta.")
    return _tokens(tokens)


@app.get("/state")
def get_state(identity: AuthIdentity = Depends(identity_required)) -> dict:
    return user_state_store.load(identity.user_id, identity.organization_id).payload()


@app.put("/state")
def save_state(payload: UserStatePayload, identity: AuthIdentity = Depends(identity_required)) -> dict:
    return user_state_store.save(identity.user_id, identity.organization_id, payload.state, payload.expected_revision).payload()


@app.post("/state/merge")
def merge_device_state(payload: UserStatePayload, identity: AuthIdentity = Depends(identity_required)) -> dict:
    return user_state_store.merge_device(identity.user_id, identity.organization_id, payload.state).payload()


@app.post("/agent/chat")
async def agent_chat(payload: AgentChatInput, identity: AuthIdentity = Depends(identity_required)) -> dict[str, str]:
    content, conversation_id = await _respond(identity, payload.conversation_id, payload.prompt, payload.model)
    return {"conversationId": conversation_id, "content": content}


@app.post("/agent/chat/public")
async def public_agent_chat(payload: AgentChatInput) -> dict[str, str]:
    """Release-mode guest access; billing still receives the agent usage event."""
    content, conversation_id = await _respond(guest_identity, payload.conversation_id, payload.prompt, payload.model)
    return {"conversationId": conversation_id, "content": content}


@app.post("/ai/mode", response_model=ModeAIResponse)
async def consult_mode_ai(request: ModeAIRequest, identity: AuthIdentity = Depends(identity_required)) -> ModeAIResponse:
    prompt = (
        f"Eres Modo IA, el acompañante de desarrollo humano de Modo Cultiva. Responde en el idioma {request.language}, con calidez "
        "y sin prometer resultados. Propón una sola actividad concreta, observable y realista para avanzar un nivel "
        "en el modo indicado. Incluye duración o frecuencia, señal de finalización y una forma breve de registrar el "
        "aprendizaje. No diagnostiques ni sustituyas apoyo profesional. Niveles 0–2 sólo requieren tiempo; 3–5 "
        "requieren tiempo y energía; 6–8 requieren tiempo, energía e inversión.\n\n"
        f"{activity_alignment_instruction(request.level, request.language)}\n"
        f"Modo: {request.mode_name}\nNivel actual: {request.level} · {request.level_name}\n"
        f"Descripción: {request.level_description}\nEsfuerzo: {request.effort}\n"
        f"Persona: {request.user_name or identity.name or 'Persona usuaria'}\nContexto o pregunta: {request.context}"
    )
    content, conversation_id = await _respond(identity, f"mode-{request.mode_name}-{request.level}", prompt, settings.openai_model)
    if not content.strip():
        raise HTTPException(status_code=502, detail="Modo IA devolvió una respuesta vacía.")
    return ModeAIResponse(proposal=content.strip(), model=settings.openai_model, conversation_id=conversation_id)


@app.post("/ai/mode/public", response_model=ModeAIResponse)
async def public_consult_mode_ai(request: ModeAIRequest) -> ModeAIResponse:
    """Temporary public release endpoint; secrets remain server-side and usage is metered."""
    return await _public_mode_ai(request)


async def _public_mode_ai(request: ModeAIRequest) -> ModeAIResponse:
    prompt = (
        f"Eres Modo IA, el acompañante de desarrollo humano de Modo Cultiva. Responde en el idioma {request.language}, con calidez "
        "y sin prometer resultados. Propón una sola actividad concreta, observable y realista para avanzar un nivel "
        "en el modo indicado. Incluye duración o frecuencia, señal de finalización y una forma breve de registrar el "
        "aprendizaje. No diagnostiques ni sustituyas apoyo profesional. Niveles 0–2 sólo requieren tiempo; 3–5 "
        "requieren tiempo y energía; 6–8 requieren tiempo, energía e inversión.\n\n"
        f"{activity_alignment_instruction(request.level, request.language)}\n"
        f"Modo: {request.mode_name}\nNivel actual: {request.level} · {request.level_name}\n"
        f"Descripción: {request.level_description}\nEsfuerzo: {request.effort}\n"
        f"Persona: {request.user_name or guest_identity.name}\nContexto o pregunta: {request.context}"
    )
    content, conversation_id = await _respond(guest_identity, f"mode-public-{request.mode_name}-{request.level}", prompt, settings.openai_model)
    if not content.strip():
        raise HTTPException(status_code=502, detail="Modo IA devolvió una respuesta vacía.")
    return ModeAIResponse(proposal=content.strip(), model=settings.openai_model, conversation_id=conversation_id)
