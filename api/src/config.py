from enum import StrEnum
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).parent.parent / ".env"


class Environment(StrEnum):
    LOCAL = "local"
    STAGING = "staging"
    PRODUCTION = "production"


class SettingsBase(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_ignore_empty=True, extra="ignore")


class AppSettings(SettingsBase):
    ENVIRONMENT: Environment = Environment.PRODUCTION
    PORT: int = 3000
    KAKAO_REST_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    FRONTEND_ORIGINS: str = ""
    APP_VERSION: str = "0.1.0"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]

    @property
    def SHOW_DOCS(self) -> bool:
        return self.ENVIRONMENT != Environment.PRODUCTION


app_config = AppSettings()
