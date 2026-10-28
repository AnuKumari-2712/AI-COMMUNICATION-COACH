"""
Speech-to-text.

Real path: `speech_recognition` reads the uploaded WAV and calls Google's
free Web Speech API (no key required for light usage, but it does require
internet access from the server). This is a genuine STT integration, not a
mock — it fails loudly with specific, catchable exceptions rather than
silently returning junk.

The frontend converts the browser recording to WAV before upload, so the real
path is the normal path. Fallback: if the upload still isn't WAV, the network
call fails, or no speech is recognized, we return one of a small set of realistic mock transcripts and
mark the result `AnalysisSource.mock` so the frontend can label it honestly,
per the project's requirement to never present mock output as real AI
analysis.
"""
try:
    import audioop
except ImportError:
    audioop = None
import logging

from app.schemas.common import AnalysisSource

logger = logging.getLogger(__name__)

EMPTY_TRANSCRIPT_FALLBACK = "(No speech detected in audio recording)"


# Google's free Web Speech endpoint loses most of a continuous clip when it is
# called from the deployed server: measured on Render with the same audio, clips
# up to ~3 s came back complete, a 4 s clip returned only its last word and a
# 6 s clip only its last 6 words, while the same files were complete when run
# locally. Audio is therefore sent in pieces of at most ~3 s and the pieces are
# joined. Each cut is placed at the quietest 50 ms within BOUNDARY_SEARCH_SECONDS
# of the target so a word is not sliced in half. A piece with no recognizable
# speech is skipped rather than failing the whole recording.
TARGET_CHUNK_SECONDS = 2.5
BOUNDARY_SEARCH_SECONDS = 0.5
_PROBE_SECONDS = 0.05


def _chunk_boundaries(frame_data: bytes, sample_rate: int, sample_width: int) -> list[int]:
    """Frame indexes (mono PCM) at which to cut the recording, quietest point near each target."""
    if audioop is None:
        return []
    total = len(frame_data) // sample_width
    target = int(TARGET_CHUNK_SECONDS * sample_rate)
    search = int(BOUNDARY_SEARCH_SECONDS * sample_rate)
    probe = max(1, int(_PROBE_SECONDS * sample_rate))
    cuts: list[int] = []
    pos = 0
    while total - pos > target + search:
        best_frame, best_rms = pos + target - search, None
        for start in range(pos + target - search, pos + target + search - probe, probe):
            rms = audioop.rms(frame_data[start * sample_width : (start + probe) * sample_width], sample_width)
            if best_rms is None or rms < best_rms:
                best_rms, best_frame = rms, start + probe // 2
        cuts.append(best_frame)
        pos = best_frame
    return cuts


def _recognize(recognizer, sr, audio, language: str) -> str:
    """One Google call, retried once because the free endpoint drops requests occasionally."""
    try:
        return recognizer.recognize_google(audio, language=language)
    except sr.RequestError:
        return recognizer.recognize_google(audio, language=language)


import base64
import os
import requests
from app.core.config import get_settings
from app.speech import audio_utils
from app.speech import whisper_stt


def _recognize_gemini(file_path: str) -> str:
    """Transcribes audio using Google Gemini multimodal capabilities directly."""
    settings = get_settings()
    api_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "gemini_api_key", None)
    if not api_key or not api_key.strip():
        raise ValueError("GEMINI_API_KEY not configured")

    with open(file_path, "rb") as f:
        audio_bytes = f.read()

    if not audio_bytes:
        raise ValueError("Audio file is empty")

    b64_data = base64.b64encode(audio_bytes).decode("utf-8")
    lower = file_path.lower()
    mime = "audio/wav"
    if lower.endswith(".webm"):
        mime = "audio/webm"
    elif lower.endswith(".mp3"):
        mime = "audio/mp3"
    elif lower.endswith(".ogg"):
        mime = "audio/ogg"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime,
                            "data": b64_data,
                        }
                    },
                    {
                        "text": (
                            "Please transcribe all spoken words in this audio verbatim into English. "
                            "Output only the plain transcribed words. Do not add speaker tags, notes, or explanations."
                        )
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
        },
    }

    model = os.getenv("GEMINI_MODEL") or getattr(settings, "gemini_model", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key.strip()}"
    resp = requests.post(url, json=payload, timeout=25)
    if resp.status_code != 200:
        raise ValueError(f"Gemini audio transcription failed ({resp.status_code}): {resp.text}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError("No candidates from Gemini audio transcription")

    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
    return text


def _recognize_google_whole(file_path: str, language: str = "en-IN") -> str:
    import speech_recognition as sr
    recognizer = sr.Recognizer()
    with sr.AudioFile(file_path) as source:
        whole = recognizer.record(source)
    return recognizer.recognize_google(audio=whole, language=language)


def _recognize_google_chunks(file_path: str, language: str = "en-IN") -> str:
    import speech_recognition as sr

    recognizer = sr.Recognizer()
    pieces: list[str] = []
    with sr.AudioFile(file_path) as source:
        whole = recognizer.record(source)
    edges = [0, *_chunk_boundaries(whole.frame_data, whole.sample_rate, whole.sample_width), len(whole.frame_data) // whole.sample_width]
    for start, end in zip(edges, edges[1:]):
        chunk = sr.AudioData(
            whole.frame_data[start * whole.sample_width : end * whole.sample_width],
            whole.sample_rate,
            whole.sample_width,
        )
        try:
            piece = _recognize(recognizer, sr, chunk, language)
        except sr.UnknownValueError:
            continue
        if piece and piece.strip():
            pieces.append(piece.strip())
    text = " ".join(pieces).strip()
    if not text:
        raise ValueError("empty transcript")
    return text


def transcribe_audio(
    file_path: str,
    language: str = "en-IN",
    enable_whisper: bool | None = None,
) -> tuple[str, str, list[dict]]:
    """
    STT Priority Chain:
    1. Audio Conversion to 16kHz mono WAV (via audio_utils.convert_to_wav_16k).
    2. Gemini Multimodal Audio STT (high accuracy, verbatim, captures full speech without slice drops).
    3. Whisper STT (faster-whisper) with filler prompting and word timestamps.
    4. Google Web Speech (whole audio pass first, chunked fallback second).
    5. Failure: returns ("", "failed", []).
    """
    converted_path = file_path
    try:
        converted_path = audio_utils.convert_to_wav_16k(file_path)
    except Exception as exc:
        logger.warning("Audio conversion to 16kHz WAV failed (%s). Proceeding with original path.", exc)

    # 1. Try Gemini Multimodal STT first (captures full sentences accurately)
    try:
        gemini_text = _recognize_gemini(converted_path)
        if gemini_text and gemini_text.strip() and gemini_text.strip().lower() != "empty":
            logger.info("Speech transcribed successfully with Gemini Multimodal STT.")
            return gemini_text.strip(), "gemini", []
    except Exception as exc:
        logger.info("Gemini multimodal STT skipped/failed (%s), trying Whisper/Google...", exc)

    # 2. Try Whisper STT
    whisper_active = whisper_stt.is_whisper_enabled() if enable_whisper is None else enable_whisper
    if whisper_active:
        try:
            whisper_res = whisper_stt.transcribe_whisper(converted_path, language="en")
            w_text = whisper_res.get("text", "").strip()
            if w_text:
                logger.info("Speech transcribed successfully with faster-whisper.")
                return w_text, "whisper", whisper_res.get("words", [])
        except Exception as exc:
            logger.warning("Whisper STT failed or unavailable (%s), falling back to Google Web Speech.", exc)

    # 3. Try Google Web Speech on whole audio file
    try:
        google_whole = _recognize_google_whole(converted_path, language=language)
        if google_whole and google_whole.strip():
            logger.info("Speech transcribed successfully with Google Web Speech (whole).")
            return google_whole.strip(), "google", []
    except Exception:
        pass

    # 4. Fallback: chunked Google Web Speech
    try:
        google_text = _recognize_google_chunks(converted_path, language=language)
        if google_text.strip():
            logger.info("Speech transcribed successfully with Google Web Speech (chunked).")
            return google_text.strip(), "google", []
    except Exception as exc:
        logger.warning("Google Web Speech failed (%s).", exc)

    logger.warning("All STT engines failed for audio %s.", file_path)
    return "", "failed", []


last_transcript_engine: str = "gemini"
last_words: list[dict] = []


def transcribe_wav(file_path: str, language: str = "en-IN") -> tuple[str, AnalysisSource]:
    """Backward-compatible wrapper for transcribe_audio."""
    global last_transcript_engine, last_words
    text, engine, words = transcribe_audio(file_path, language=language)
    last_transcript_engine = engine
    last_words = words
    if engine in ("gemini", "whisper", "google") and text:
        return text, AnalysisSource.real
    return EMPTY_TRANSCRIPT_FALLBACK, AnalysisSource.mock

