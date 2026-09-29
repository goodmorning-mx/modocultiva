import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ModeAIRequest(BaseModel):
    mode_name: str = Field(min_length=1, max_length=120)
    level: int = Field(ge=0, le=8)
    level_name: str = Field(min_length=1, max_length=120)
    level_description: str = Field(min_length=1, max_length=800)
    effort: str = Field(min_length=1, max_length=160)
    context: str = Field(min_length=1, max_length=4000)
    user_name: str | None = Field(default=None, max_length=120)


class ModeAIResponse(BaseModel):
    proposal: str
    model: str


def _extract_response_text(payload: dict) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    fragments: list[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") == "output_text":
                text = content.get("text")
                if isinstance(text, str):
                    fragments.append(text)
    return "\n".join(fragments).strip()


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "status": "ok",
        "environment": settings.app_env,
    }


@app.post("/ai/mode", response_model=ModeAIResponse)
async def consult_mode_ai(request: ModeAIRequest) -> ModeAIResponse:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="Modo IA no está configurado todavía.")

    user_context = (
        f"Modo: {request.mode_name}\n"
        f"Nivel actual: {request.level} · {request.level_name}\n"
        f"Descripción del nivel: {request.level_description}\n"
        f"Parámetro de esfuerzo: {request.effort}\n"
        f"Nombre de la persona: {request.user_name or 'Persona usuaria'}\n"
        f"Contexto o pregunta: {request.context}"
    )
    payload = {
        "model": settings.openai_model,
        "store": False,
        "instructions": (
            "Eres Modo IA, el acompañante de desarrollo humano de Modo Cultiva. "
            "Responde en español, con calidez y sin prometer resultados. Propón una sola actividad "
            "concreta, observable y realista para avanzar un nivel en el modo indicado. Respeta el "
            "parámetro de esfuerzo: niveles 0–2 sólo tiempo, 3–5 tiempo más energía, y 6–8 tiempo, "
            "energía más inversión. Incluye duración o frecuencia, una señal de finalización y una "
            "forma breve de registrar el aprendizaje. No diagnostiques ni sustituyas apoyo profesional. "
            "Devuelve sólo la propuesta lista para que la persona pueda usarla en su journey."
        ),
        "input": user_context,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.openai_timeout_seconds) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Modo IA tardó demasiado en responder.") from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Modo IA no pudo completar la consulta.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="No fue posible conectar con Modo IA.") from exc

    proposal = _extract_response_text(response.json())
    if not proposal:
        raise HTTPException(status_code=502, detail="Modo IA devolvió una respuesta vacía.")
    return ModeAIResponse(proposal=proposal, model=settings.openai_model)
