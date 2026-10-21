"""
End-to-end tests for Voice Practice feedback system:
- Sentence-by-sentence grammar analysis on voice transcripts
- Actionable correction cards with sentence context
- Full corrected answer reconstruction
- Evidence-based score reasons & confidence signals
- Transparent pronunciation unavailable handling
- Short utterance (< 4 words) handling
"""
import math
import struct
import wave
import pytest

from app.schemas.common import AnalysisSource
from app.services import assessment_service

NO_PROFILE_STUDENT = "student-without-profile-for-tests"

def _wav(path, seconds=6.0, rate=16000):
    frames = b"".join(
        struct.pack("<h", int(6000 * math.sin(2 * math.pi * 220 * n / rate)))
        for n in range(int(seconds * rate))
    )
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)
    return str(path)

def test_voice_practice_sentence_by_sentence_analysis(tmp_path):
    transcript = (
        "Hello, my name are Anu and I am a B.Tech student in Lovely Professional University. "
        "I am study in third year and I has a strong interest in web development. "
        "I have make many project like AI coach which help students to improves their skills."
    )
    wav_path = _wav(tmp_path / "voice_test.wav", seconds=15.0)

    result = assessment_service.analyze_voice_upload(
        NO_PROFILE_STUDENT, wav_path, 15.0, "en-IN", client_transcript=transcript
    )

    assert result.source == AnalysisSource.real
    assert result.transcript_source == "browser"
    assert result.transcript == transcript
    assert result.sufficient_data is True

    # Check that multiple corrections across sentences were captured
    assert len(result.corrections) >= 5
    corrections_map = {c.original.lower(): c.corrected.lower() for c in result.corrections}
    assert "my name are" in corrections_map or "name are" in corrections_map
    assert "i has" in corrections_map
    assert "am study" in corrections_map
    assert "have make" in corrections_map

    # Check sentence context and error type
    for c in result.corrections:
        assert c.sentence is not None
        assert len(c.sentence) > 0
        assert c.error_type is not None

    # Check corrected answer
    assert result.corrected_answer != ""
    assert "I have" in result.corrected_answer

    # Check transparent pronunciation (never fabricated 88/100)
    assert result.pronunciation_available is False
    assert result.pronunciation_score is None

    # Check score reasons
    assert "grammar" in result.score_reasons
    assert "fluency" in result.score_reasons
    assert "pronunciation" in result.score_reasons
    assert "confidence" in result.score_reasons
    assert len(result.confidence_signals) > 0


def test_voice_practice_short_utterance_handling(tmp_path):
    transcript = "yes sir"
    wav_path = _wav(tmp_path / "short_test.wav", seconds=2.0)

    result = assessment_service.analyze_voice_upload(
        NO_PROFILE_STUDENT, wav_path, 2.0, "en-IN", client_transcript=transcript
    )

    assert result.sufficient_data is False
    assert result.word_count == 2
    assert result.pronunciation_available is False
    assert result.pronunciation_score is None
    assert "insufficient data" in result.score_reasons["grammar"].lower() or "short" in result.score_reasons["grammar"].lower()
