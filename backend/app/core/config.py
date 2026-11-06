
import json
import os
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Communication & Interview Coach API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"

    
    cors_origins: list[str] | str = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
   
    cors_origin_regex: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors(cls, v: object) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [o.strip() for o in stripped.split(",") if o.strip()]
        return v  # type: ignore[return-value]

    
    use_mock_ai: bool = False
    enable_transformer_confidence: bool = False

    # Auth configuration
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24

    # Storage
    data_dir: str = "data"
    database_url: str | None = None

    # Speech recognition & Whisper configuration
    stt_language: str = "en-IN"
    enable_whisper: bool = True
    whisper_model: str = "base"

    # AI NLP & Grammar Engines (Gemini, Claude, T5, Rules)
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3-flash-preview"
    anthropic_api_key: str | None = None
    grammar_model: str = "claude-3-5-sonnet-20241022"
    gec_model_path: str = "models/gec-t5"
    grammar_engine_order: str = "gemini,claude,t5,rules"

    @model_validator(mode="after")
    def _auto_disable_mock_ai_if_real_engines_available(self) -> "Settings":
        """
        Honest AI Mode Validation:
        Automatically disable USE_MOCK_AI if any real engine is configured:
        - Gemini key present
        - Claude key present
        - T5 model path exists or is a Hugging Face Hub model ID
        - Whisper is enabled and available
        - spaCy is installed/available
        """
        if self.use_mock_ai:
            has_gemini = bool(self.gemini_api_key and self.gemini_api_key.strip())
            has_claude = bool(self.anthropic_api_key and self.anthropic_api_key.strip())

            t5_path = getattr(self, "gec_model_path", None) or os.getenv("GEC_MODEL_PATH", "models/gec-t5")
            has_t5 = False
            if t5_path:
                t5_str = str(t5_path).strip()
                backend_t5 = Path("backend") / t5_str
                if os.path.exists(t5_str) or backend_t5.exists():
                    has_t5 = True
                elif not t5_str.startswith(("models/", "models\\", "backend/", "backend\\", "./", ".\\")):
                    parts = t5_str.split("/")
                    if len(parts) == 2 and all(p.strip() for p in parts) and not os.path.isabs(t5_str):
                        has_t5 = True

            has_whisper = bool(
                self.enable_whisper and os.getenv("ENABLE_WHISPER", "true").lower() not in ("false", "0", "no", "off")
            )

            has_spacy = False
            try:
                import spacy
                has_spacy = spacy.util.is_package("en_core_web_sm")
            except Exception:
                has_spacy = False

            if has_gemini or has_claude or has_t5 or has_whisper or has_spacy:
                self.use_mock_ai = False

        return self



@lru_cache
def get_settings() -> Settings:
    return Settings()

