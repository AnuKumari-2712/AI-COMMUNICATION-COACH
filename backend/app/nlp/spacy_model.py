"""
Lazy-loaded spaCy pipeline, shared across the NLP module.

spaCy + its `en_core_web_sm` model are real, install-friendly NLP (no GPU,
~15MB model). If the model hasn't been downloaded yet (`python -m spacy
download en_core_web_sm`), every caller falls back to a simplified
whitespace/regex analysis rather than crashing the request — this fallback is
always reported to the client via `AnalysisSource.mock`.
"""
import logging

logger = logging.getLogger(__name__)

_nlp = None
_load_attempted = False


def get_nlp():
    global _nlp, _load_attempted
    if _nlp is not None or _load_attempted:
        return _nlp

    _load_attempted = True
    try:
        import spacy

        _nlp = spacy.load("en_core_web_sm")
        logger.info("spaCy model 'en_core_web_sm' loaded.")
    except Exception as exc:  # noqa: BLE001 - any load failure should degrade, not crash
        logger.warning(
            "spaCy model unavailable (%s). Run `python -m spacy download en_core_web_sm` "
            "to enable real NLP analysis. Falling back to heuristic analysis.",
            exc,
        )
        _nlp = None
    return _nlp
