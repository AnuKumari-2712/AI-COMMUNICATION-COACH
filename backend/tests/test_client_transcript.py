"""
When the browser has already recognized the user's speech it sends that
transcript with the audio; the backend must use it (instead of calling the
server-side Google request, which was unreliable from the deployed host)
while still measuring pace and pauses from the uploaded audio.
Run with:  cd backend && pytest tests/test_client_transcript.py -v
"""
import math
import struct
import wave

import pytest

from app.schemas.common import AnalysisSource
from app.services import assessment_service
from app.speech import stt

# A student id with no profile, so analysis runs but nothing is written to the data store.
NO_PROFILE_STUDENT = "student-without-profile-for-tests"
SENTENCE = "I led a team of five engineers and we delivered the project two weeks early"


def _wav(path, seconds=6.0, rate=16000):
    frames = b"".join(
        struct.pack("<h", int(6000 * math.sin(2 * math.pi * 220 * n / rate))) for n in range(int(seconds * rate))
    )
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)
    return str(path)


def _fail_if_server_stt_called(monkeypatch):
    def boom(*args, **kwargs):
        raise AssertionError("server-side speech-to-text must not run when the browser sent a transcript")

    monkeypatch.setattr(stt, "transcribe_wav", boom)


def test_browser_transcript_is_used_and_server_stt_is_skipped(tmp_path, monkeypatch):
    _fail_if_server_stt_called(monkeypatch)
    result = assessment_service.analyze_voice_upload(
        NO_PROFILE_STUDENT, _wav(tmp_path / "a.wav"), 6.0, "en-IN", client_transcript=SENTENCE
    )
    assert result.transcript == SENTENCE
    assert result.transcript_source == "browser"
    assert result.source == AnalysisSource.real


def test_pace_uses_the_browser_transcript_words_and_real_duration(tmp_path, monkeypatch):
    _fail_if_server_stt_called(monkeypatch)
    result = assessment_service.analyze_voice_upload(
        NO_PROFILE_STUDENT, _wav(tmp_path / "b.wav", seconds=6.0), 6.0, "en-IN", client_transcript=SENTENCE
    )
    words = len(SENTENCE.split())
    assert result.word_count == words
    assert result.words_per_minute == pytest.approx(words / 6.0 * 60, abs=0.1)
    # pauses still come from the uploaded audio, not from the transcript
    assert result.pace_source == "measured"


def test_blank_browser_transcript_falls_back_to_server_stt(tmp_path, monkeypatch):
    monkeypatch.setattr(stt, "transcribe_wav", lambda *a, **k: ("from the server", AnalysisSource.real))
    result = assessment_service.analyze_voice_upload(
        NO_PROFILE_STUDENT, _wav(tmp_path / "c.wav"), 6.0, "en-IN", client_transcript="   "
    )
    assert result.transcript == "from the server"
    assert result.transcript_source == "server"


def test_no_browser_transcript_uses_server_stt(tmp_path, monkeypatch):
    monkeypatch.setattr(stt, "transcribe_wav", lambda *a, **k: ("from the server", AnalysisSource.real))
    result = assessment_service.analyze_voice_upload(NO_PROFILE_STUDENT, _wav(tmp_path / "d.wav"), 6.0, "en-IN")
    assert result.transcript_source == "server"


def test_failed_server_stt_is_labelled_as_a_sample_not_real(tmp_path, monkeypatch):
    monkeypatch.setattr(stt, "transcribe_wav", lambda *a, **k: ("a canned sentence", AnalysisSource.mock))
    result = assessment_service.analyze_voice_upload(NO_PROFILE_STUDENT, _wav(tmp_path / "e.wav"), 6.0, "en-IN")
    assert result.transcript_source == "sample"
    assert result.source == AnalysisSource.mock
