
import logging
import re

from app.core.config import get_settings
from app.schemas.common import AnalysisSource

logger = logging.getLogger(__name__)

_pipeline = None
_load_attempted = False

_HEDGING_WORDS = ["maybe", "i guess", "i think", "not sure", "probably", "kind of", "sort of", "i don't know"]
_ASSERTIVE_WORDS = ["i led", "i built", "i achieved", "i delivered", "i am confident", "i ensured", "i successfully"]


def _load_pipeline():
    global _pipeline, _load_attempted
    if _pipeline is not None or _load_attempted:
        return _pipeline
    _load_attempted = True
    try:
        from transformers import pipeline  # type: ignore[import-untyped, import-not-found]

        _pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        logger.info("Transformer confidence model loaded successfully.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transformer model unavailable (%s) — falling back to lexical heuristic.", exc)
        _pipeline = None
    return _pipeline


def _lexical_confidence(text: str) -> float:
    if not text or not text.strip():
        return 0.0

    lower = text.lower()
    hedges = sum(1 for h in _HEDGING_WORDS if h in lower)
    assertive = sum(1 for a in _ASSERTIVE_WORDS if a in lower)
    exclamations = text.count("!")
    filler_ish = len(re.findall(r"\b(um|uh|like)\b", lower))

    score = 68.0 + assertive * 6 - hedges * 5 - filler_ish * 2 + min(exclamations, 2) * 2
    return max(20.0, min(98.0, score))


def score_confidence(text: str) -> tuple[float, AnalysisSource]:
    if not text or not text.strip():
        return 0.0, AnalysisSource.mock

    settings = get_settings()
    if not settings.enable_transformer_confidence:
        return round(_lexical_confidence(text), 1), AnalysisSource.mock

    pipe = _load_pipeline()
    if pipe is None:
        return round(_lexical_confidence(text), 1), AnalysisSource.mock

    try:
        result = pipe(text[:512])[0]
        base = 60.0 if result["label"] == "POSITIVE" else 45.0
        magnitude = result["score"] * 30
        lexical_adjustment = (_lexical_confidence(text) - 68.0) * 0.3
        score = max(15.0, min(99.0, base + magnitude + lexical_adjustment))
        return round(score, 1), AnalysisSource.real
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transformer inference failed (%s) — using lexical heuristic.", exc)
        return round(_lexical_confidence(text), 1), AnalysisSource.mock

