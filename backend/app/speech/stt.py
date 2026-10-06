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
import logging
import random

from app.schemas.common import AnalysisSource

logger = logging.getLogger(__name__)

_MOCK_TRANSCRIPTS = [
    "So, um, I think the biggest challenge in my last project was, like, coordinating between the "
    "frontend and backend teams because we didn't have, um, a shared timeline initially.",
    "I would say my greatest strength is, uh, being able to break down a complex problem into "
    "smaller pieces and, basically, communicate that plan clearly to the rest of the team.",
    "For this question, actually, I want to talk about a time when I had to learn a new framework "
    "very quickly, um, under a tight deadline for a client project.",
]


# Google's free Web Speech endpoint rejects or truncates long clips, so audio is
# sent in consecutive chunks of at most this many seconds and the pieces are
# joined. A chunk with no recognizable speech (a long pause) is skipped rather
# than failing the whole recording.
CHUNK_SECONDS = 25


def transcribe_wav(file_path: str, language: str = "en-IN") -> tuple[str, AnalysisSource]:
    try:
        import speech_recognition as sr
    except ImportError:
        logger.warning("speech_recognition not installed — returning mock transcript.")
        return random.choice(_MOCK_TRANSCRIPTS), AnalysisSource.mock

    recognizer = sr.Recognizer()
    try:
        pieces: list[str] = []
        with sr.AudioFile(file_path) as source:
            total_seconds = float(source.DURATION or 0)
            elapsed = 0.0
            while elapsed < total_seconds:
                audio = recognizer.record(source, duration=CHUNK_SECONDS)
                elapsed += CHUNK_SECONDS
                try:
                    piece = recognizer.recognize_google(audio, language=language)
                except sr.UnknownValueError:
                    continue  # this chunk had no intelligible speech — keep going
                if piece.strip():
                    pieces.append(piece.strip())
        text = " ".join(pieces)
        if not text.strip():
            raise ValueError("empty transcript")
        return text, AnalysisSource.real
    except Exception as exc:  # noqa: BLE001 - any STT failure should degrade gracefully
        logger.warning("Speech-to-text failed (%s) — returning mock transcript.", exc)
        return random.choice(_MOCK_TRANSCRIPTS), AnalysisSource.mock
