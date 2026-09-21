"""
Transformer-based confidence/tone scoring.

Real path (opt-in): a HuggingFace `transformers` sentiment-analysis pipeline
(DistilBERT, ~260MB, CPU-only via PyTorch) scores how assertive/positive the
phrasing of an answer is, which we fold into the confidence score alongside
filler-word frequency and pace stability.

This is intentionally NOT imported at module load time anywhere else in the
app — it's lazy-loaded on first real use, guarded by
`settings.enable_transformer_confidence`, and wrapped so a missing
`transformers`/`torch` install (see requirements-ml-optional.txt) or a
failed model download degrades to a fast lexical heuristic instead of
crashing the request. Every caller gets back an `AnalysisSource` so the
client can tell which path actually ran.
"""
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
        from transformers import pipeline

        _pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        logger.info("Transformer confidence model loaded.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transformer model unavailable (%s) — using lexical confidence heuristic.", exc)
        _pipeline = None
    return _pipeline


def _lexical_confidence(text: str) -> float:
    lower = text.lower()
    hedges = sum(1 for h in _HEDGING_WORDS if h in lower)
    assertive = sum(1 for a in _ASSERTIVE_WORDS if a in lower)
    exclamations = text.count("!")
    filler_ish = len(re.findall(r"\b(um|uh|like)\b", lower))

    score = 68.0 + assertive * 6 - hedges * 5 - filler_ish * 2 + min(exclamations, 2) * 2
    return max(20.0, min(98.0, score))


def score_confidence(text: str) -> tuple[float, AnalysisSource]:
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
