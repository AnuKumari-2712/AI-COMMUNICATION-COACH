import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from app.api.routes import admin, assessment, auth, coach, interview, practice, students
from app.core.config import get_settings
from app.database.store import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description=(
        "Backend for the AI-Powered Personalized Communication & Interview Coach. "
        "Combines NLP (spaCy), a rule-based grammar engine, real speech-to-text "
        "(with mock fallback), a scikit-learn adaptive-difficulty model, and an "
        "optional transformer-based confidence model into one personalization "
        "pipeline — see README.md for which parts are real vs. mock and why."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(students.router, prefix=settings.api_v1_prefix)
app.include_router(assessment.router, prefix=settings.api_v1_prefix)
app.include_router(practice.router, prefix=settings.api_v1_prefix)
app.include_router(interview.router, prefix=settings.api_v1_prefix)
app.include_router(coach.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": settings.app_name}


@app.get(f"{settings.api_v1_prefix}/health", tags=["health"])
def health():
    from app.nlp.gec_model import is_t5_available
    from app.nlp.spacy_model import get_nlp
    from app.speech.whisper_stt import is_whisper_available, is_whisper_enabled

    spacy_loaded = get_nlp() is not None
    gemini_active = bool(settings.gemini_api_key and settings.gemini_api_key.strip())
    claude_active = bool(settings.anthropic_api_key and settings.anthropic_api_key.strip())
    t5_active = is_t5_available()
    whisper_active = is_whisper_available() or is_whisper_enabled()

    return {
        "status": "ok",
        "use_mock_ai": settings.use_mock_ai,
        "spacy_model_loaded": spacy_loaded,
        "transformer_confidence_enabled": settings.enable_transformer_confidence,
        "engines": {
            "gemini": gemini_active,
            "claude": claude_active,
            "t5": t5_active,
            "whisper": whisper_active,
            "spacy": spacy_loaded,
        },
    }

