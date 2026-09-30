from functools import lru_cache
import os
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from gm_agent import AgentService, Conversation, OpenAIProvider
from gm_auth import AuthIdentity, AuthService, AuthSettings, create_auth_router, identity_dependency
from gm_billing import BillingService, PricingRule
from gm_mcp import RequestContext, ToolRegistry

from app.billing import PostgresBillingStore, UserStateStore
from app.config import get_settings
from app.database import create_database_engine

settings = get_settings()
engine = create_database_engine()
auth_service = AuthService(engine, AuthSettings(jwt_secret=settings.jwt_secret, issuer=settings.auth_issuer))
identity_required = identity_dependency(auth_service)
user_state_store = UserStateStore(engine)
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


class RegisterInput(BaseModel):
    email: str
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class ModeAIRequest(BaseModel):
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
    # GoodMorning Factory normally injects OPENAI_API_KEY. These aliases keep
    # the embedded module compatible with managed runtime bindings without
    # ever placing a credential in source control.
    api_key = next((os.getenv(name) for name in (
        "OPENAI_API_KEY", "GOODMORNING_OPENAI_API_KEY", "GM_OPENAI_API_KEY"
    ) if os.getenv(name)), None)
    if not api_key:
        raise HTTPException(status_code=503, detail="Modo IA no está configurado todavía.")
    provider = OpenAIProvider(AsyncOpenAI(api_key=api_key, timeout=settings.openai_timeout_seconds))
    return AgentService(provider, ToolRegistry(), billing_service)


conversations: dict[tuple[str, str, str], Conversation] = {}


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
    configured = any(os.getenv(name) for name in ("OPENAI_API_KEY", "GOODMORNING_OPENAI_API_KEY", "GM_OPENAI_API_KEY"))
    return {"module": "gm-agent", "mode": "embedded", "configured": configured, "model": settings.openai_model}


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
    return {"state": user_state_store.get(identity.user_id, identity.organization_id)}


@app.put("/state")
def save_state(payload: UserStatePayload, identity: AuthIdentity = Depends(identity_required)) -> dict[str, str]:
    user_state_store.save(identity.user_id, identity.organization_id, payload.state)
    return {"status": "saved"}


@app.post("/agent/chat")
async def agent_chat(payload: AgentChatInput, identity: AuthIdentity = Depends(identity_required)) -> dict[str, str]:
    content, conversation_id = await _respond(identity, payload.conversation_id, payload.prompt, payload.model)
    return {"conversationId": conversation_id, "content": content}


@app.post("/ai/mode", response_model=ModeAIResponse)
async def consult_mode_ai(request: ModeAIRequest, identity: AuthIdentity = Depends(identity_required)) -> ModeAIResponse:
    prompt = (
        "Eres Modo IA, el acompañante de desarrollo humano de Modo Cultiva. Responde en español, con calidez "
        "y sin prometer resultados. Propón una sola actividad concreta, observable y realista para avanzar un nivel "
        "en el modo indicado. Incluye duración o frecuencia, señal de finalización y una forma breve de registrar el "
        "aprendizaje. No diagnostiques ni sustituyas apoyo profesional. Niveles 0–2 sólo requieren tiempo; 3–5 "
        "requieren tiempo y energía; 6–8 requieren tiempo, energía e inversión.\n\n"
        f"Modo: {request.mode_name}\nNivel actual: {request.level} · {request.level_name}\n"
        f"Descripción: {request.level_description}\nEsfuerzo: {request.effort}\n"
        f"Persona: {request.user_name or identity.name or 'Persona usuaria'}\nContexto o pregunta: {request.context}"
    )
    content, conversation_id = await _respond(identity, f"mode-{request.mode_name}-{request.level}", prompt, settings.openai_model)
    if not content.strip():
        raise HTTPException(status_code=502, detail="Modo IA devolvió una respuesta vacía.")
    return ModeAIResponse(proposal=content.strip(), model=settings.openai_model, conversation_id=conversation_id)
