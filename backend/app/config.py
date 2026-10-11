from functools import lru_cache
from decimal import Decimal
from collections.abc import Mapping
import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = Field(default="GoodMorning MVP Template API", alias="APP_NAME")
    app_env: str = Field(default="local", alias="APP_ENV")
    cors_origins: str = Field(
        default="http://localhost:5173,https://dev.modocultiva.goodmorning.mx",
        alias="CORS_ORIGINS",
    )
    database_url: str = Field(
        default="postgresql+psycopg://goodmorning:goodmorning_local_password@localhost:5432/goodmorning_mvp",
        alias="DATABASE_URL",
    )
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-5", alias="OPENAI_MODEL")
    openai_timeout_seconds: float = Field(default=45.0, alias="OPENAI_TIMEOUT_SECONDS")
    jwt_secret: str = Field(
        default="local-development-only-change-this-secret-32-chars",
        alias="JWT_SECRET",
    )
    auth_issuer: str = Field(default="modocultiva-auth", alias="AUTH_ISSUER")
    default_organization_id: str = Field(default="modocultiva", alias="DEFAULT_ORGANIZATION_ID")
    default_organization_slug: str = Field(default="modocultiva", alias="DEFAULT_ORGANIZATION_SLUG")
    default_organization_name: str = Field(default="Modo Cultiva", alias="DEFAULT_ORGANIZATION_NAME")
    openai_input_per_million: Decimal = Field(default=Decimal("0"), alias="OPENAI_INPUT_PER_MILLION")
    openai_output_per_million: Decimal = Field(default=Decimal("0"), alias="OPENAI_OUTPUT_PER_MILLION")
    openai_cached_input_per_million: Decimal = Field(default=Decimal("0"), alias="OPENAI_CACHED_INPUT_PER_MILLION")
    openai_billing_markup: Decimal = Field(default=Decimal("1"), alias="OPENAI_BILLING_MARKUP")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# GoodMorning Factory may expose a managed binding under one of these runtime
# names depending on the deployment adapter. Keep the accepted names in one
# place so the health check and the agent use exactly the same resolution path.
MANAGED_OPENAI_KEY_ENV_NAMES = (
    "OPENAI_API_KEY",
    "GOODMORNING_OPENAI_API_KEY",
    "GM_OPENAI_API_KEY",
    "GM_AGENT_OPENAI_API_KEY",
    "GOODMORNING_MANAGED_OPENAI_API_KEY",
)


def get_runtime_openai_api_key(
    configured: Settings | None = None,
    environ: Mapping[str, str] | None = None,
) -> str | None:
    """Resolve the OpenAI key supplied by the runtime, without persisting it."""

    settings = configured or get_settings()
    settings_key = (settings.openai_api_key or "").strip()
    if settings_key:
        return settings_key

    values = environ if environ is not None else os.environ
    for name in MANAGED_OPENAI_KEY_ENV_NAMES:
        value = (values.get(name) or "").strip()
        if value:
            return value
    return None


@lru_cache
def get_settings() -> Settings:
    return Settings()
