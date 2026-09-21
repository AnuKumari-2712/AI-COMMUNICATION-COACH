"""
Central application settings, loaded from environment variables (.env).

USE_MOCK_AI is the single switch referenced throughout the codebase to decide
whether a route is allowed to fall back to deterministic mock output when a
real model/service (spaCy, the transformer pipeline, speech recognition) is
unavailable. It defaults to True so the API runs out of the box on a laptop
with no GPU and no internet, per the project requirement that mock data must
be used (and clearly labeled) whenever real AI services aren't configured.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Communication & Interview Coach API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Feature flags
    use_mock_ai: bool = True
    enable_transformer_confidence: bool = False

    # Auth (demo-grade; NOT production security)
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24

    # Storage
    data_dir: str = "data"

    # Speech recognition
    stt_language: str = "en-IN"


@lru_cache
def get_settings() -> Settings:
    return Settings()
