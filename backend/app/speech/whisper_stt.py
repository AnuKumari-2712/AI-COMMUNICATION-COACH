"""
Faster-Whisper speech-to-text integration with CPU int8 quantization,
word-level timestamps, and hesitation/filler prompting.
"""
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_whisper_model = None
_load_attempted = False

INITIAL_FILLER_PROMPT = "Umm, uh, like, you know, so, basically, actually, I mean"


def is_whisper_enabled() -> bool:
    val = os.getenv("ENABLE_WHISPER", "true").strip().lower()
    return val not in ("false", "0", "no", "off")


def is_whisper_available() -> bool:
    """Returns True if Whisper is enabled in settings and the faster_whisper library is available."""
    if not is_whisper_enabled():
        return False
    try:
        import faster_whisper  # noqa: F401

        return True
    except ImportError:
        return False


def get_whisper_model_name() -> str:
    return os.getenv("WHISPER_MODEL", "base").strip()


def get_whisper_model() -> Optional[Any]:
    global _whisper_model, _load_attempted
    if _whisper_model is not None or _load_attempted:
        return _whisper_model

    if not is_whisper_enabled():
        logger.info("Whisper is disabled via ENABLE_WHISPER=false.")
        _load_attempted = True
        return None

    _load_attempted = True
    try:
        from faster_whisper import WhisperModel

        model_name = get_whisper_model_name()
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

        logger.info("Loading faster-whisper model '%s' on %s (%s)...", model_name, device, compute_type)
        _whisper_model = WhisperModel(model_name, device=device, compute_type=compute_type)
        logger.info("faster-whisper model '%s' loaded successfully.", model_name)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not load faster-whisper model (%s). Whisper STT will be unavailable. "
            "Will fall back down the STT chain.",
            exc,
        )
        _whisper_model = None

    return _whisper_model


def transcribe_whisper(
    audio_path: str,
    language: str = "en",
    initial_prompt: Optional[str] = None,
) -> dict:
    """
    Transcribes audio using faster-whisper with word timestamps.
    Returns:
        {
            "text": str,
            "words": [{"word": str, "start": float, "end": float, "probability": float}],
            "duration": float,
            "language": str,
            "engine": "whisper"
        }
    """
    if not is_whisper_enabled():
        raise RuntimeError("Whisper STT is disabled via ENABLE_WHISPER=false")

    model = get_whisper_model()
    if model is None:
        raise RuntimeError("faster-whisper model is not available or failed to load")

    prompt = initial_prompt if initial_prompt is not None else INITIAL_FILLER_PROMPT
    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,
        initial_prompt=prompt,
        beam_size=5,
    )

    full_text_pieces: list[str] = []
    all_words: list[dict] = []

    for segment in segments:
        text = segment.text.strip()
        if text:
            full_text_pieces.append(text)
        if hasattr(segment, "words") and segment.words:
            for w in segment.words:
                cleaned_word = w.word.strip()
                if cleaned_word:
                    all_words.append({
                        "word": cleaned_word,
                        "start": round(float(w.start), 3),
                        "end": round(float(w.end), 3),
                        "probability": round(float(getattr(w, "probability", 1.0)), 3),
                    })

    full_transcript = " ".join(full_text_pieces).strip()
    duration = float(getattr(info, "duration", 0.0))

    return {
        "text": full_transcript,
        "words": all_words,
        "duration": duration,
        "language": getattr(info, "language", language),
        "engine": "whisper",
    }
