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
import audioop
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


# Google's free Web Speech endpoint handles long continuous speech badly: it can
# split the transcript into several segments and the SpeechRecognition library
# keeps only one of them, so a ~9 s answer came back as just its last 4 words
# (seen on the deployed backend; short clips were fine). Audio is therefore sent
# in pieces of about TARGET_CHUNK_SECONDS and the pieces are joined. Each cut is
# placed at the quietest 50 ms within BOUNDARY_SEARCH_SECONDS of the target so a
# word is not sliced in half. A piece with no recognizable speech is skipped
# rather than failing the whole recording.
TARGET_CHUNK_SECONDS = 6.0
BOUNDARY_SEARCH_SECONDS = 1.5
_PROBE_SECONDS = 0.05


def _chunk_boundaries(frame_data: bytes, sample_rate: int, sample_width: int) -> list[int]:
    """Frame indexes (mono PCM) at which to cut the recording, quietest point near each target."""
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
            whole = recognizer.record(source)
        edges = [0, *_chunk_boundaries(whole.frame_data, whole.sample_rate, whole.sample_width), len(whole.frame_data) // whole.sample_width]
        for start, end in zip(edges, edges[1:]):
            chunk = sr.AudioData(
                whole.frame_data[start * whole.sample_width : end * whole.sample_width], whole.sample_rate, whole.sample_width
            )
            try:
                piece = _recognize(recognizer, sr, chunk, language)
            except sr.UnknownValueError:
                continue  # this piece had no intelligible speech — keep going
            if piece.strip():
                pieces.append(piece.strip())
        text = " ".join(pieces)
        if not text.strip():
            raise ValueError("empty transcript")
        return text, AnalysisSource.real
    except Exception as exc:  # noqa: BLE001 - any STT failure should degrade gracefully
        logger.warning("Speech-to-text failed (%s) — returning mock transcript.", exc)
        return random.choice(_MOCK_TRANSCRIPTS), AnalysisSource.mock
