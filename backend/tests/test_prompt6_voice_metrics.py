"""
Tests for Prompt 6: Real Voice Feedback
- Pauses derived from Whisper word timestamps (>0.7s pause, >1.5s long pause)
- Pronunciation confidence scoring & unclear words detection (<60% flagged)
- Voice practice sentence-by-sentence multi-engine grammar integration
- Exact hand-computed test assertions
"""
from unittest.mock import MagicMock
import pytest
from app.schemas.common import AnalysisSource
from app.services import assessment_service
from app.speech import speech_metrics, stt


class TestPrompt6VoiceFeedback:
    def test_compute_pauses_from_words_exact_math(self):
        """
        Gaps:
        w1->w2: 1.8 - 1.0 = 0.8s (>= 0.7s -> pause 1)
        w2->w3: 3.4 - 2.0 = 1.4s (>= 0.7s, < 1.5s -> pause 2)
        w3->w4: 5.6 - 3.9 = 1.7s (>= 1.5s -> pause 3 and long pause 1)
        w4->w5: 6.3 - 6.0 = 0.3s (< 0.7s -> ignored)
        Total pauses: 3. Long pauses: 1.
        Avg pause: (0.8 + 1.4 + 1.7) / 3 = 1.30s.
        """
        words = [
            {"word": "Hello", "start": 0.0, "end": 1.0},
            {"word": "everyone", "start": 1.8, "end": 2.0},
            {"word": "welcome", "start": 3.4, "end": 3.9},
            {"word": "to", "start": 5.6, "end": 6.0},
            {"word": "practice", "start": 6.3, "end": 7.0},
        ]
        duration = 7.0
        analysis = speech_metrics.compute_pauses_from_words(words, duration)

        assert analysis is not None
        assert analysis.pause_count == 3
        assert analysis.long_pause_count == 1
        assert analysis.average_pause_seconds == 1.30
        assert analysis.total_seconds == 7.0

    def test_analyze_pronunciation_confidence_flags_words_below_60(self):
        """
        Probabilities: 0.95, 0.45, 0.80, 0.50
        Average: (0.95 + 0.45 + 0.80 + 0.50) / 4 = 2.70 / 4 = 0.675 -> 67.5%
        Unclear words: 'difficult' (45.0%), 'pronunciation' (50.0%)
        """
        words = [
            {"word": "This", "start": 0.0, "end": 0.3, "probability": 0.95},
            {"word": "difficult", "start": 0.4, "end": 0.9, "probability": 0.45},
            {"word": "word", "start": 1.0, "end": 1.3, "probability": 0.80},
            {"word": "pronunciation", "start": 1.4, "end": 2.2, "probability": 0.50},
        ]
        res = speech_metrics.analyze_pronunciation_confidence(words)

        assert res["available"] is True
        assert res["score"] == 67.5
        assert len(res["unclear_words"]) == 2
        assert res["unclear_words"][0]["word"] == "difficult"
        assert res["unclear_words"][0]["confidence"] == 45.0
        assert res["unclear_words"][1]["word"] == "pronunciation"
        assert res["unclear_words"][1]["confidence"] == 50.0

    def test_pronunciation_unavailable_when_no_word_probabilities(self):
        res = speech_metrics.analyze_pronunciation_confidence([])
        assert res["available"] is False
        assert res["score"] is None
        assert res["unclear_words"] == []

    def test_analyze_voice_upload_sentence_breakdown_and_engine(self, monkeypatch):
        """
        Verifies analyze_voice_upload attaches sentence-by-sentence analysis,
        pronunciation confidence, and grammar_engine from the multi-engine chain.
        """
        test_words = [
            {"word": "I", "start": 0.0, "end": 0.2, "probability": 0.95},
            {"word": "dont", "start": 0.25, "end": 0.5, "probability": 0.45},
            {"word": "have", "start": 0.55, "end": 0.8, "probability": 0.92},
            {"word": "no", "start": 0.85, "end": 1.0, "probability": 0.90},
            {"word": "skills.", "start": 1.05, "end": 1.5, "probability": 0.88},
        ]

        def fake_transcribe_wav(path, language="en-IN"):
            stt.last_words = test_words
            stt.last_transcript_engine = "whisper"
            return "I dont have no skills.", AnalysisSource.real

        monkeypatch.setattr(stt, "transcribe_wav", fake_transcribe_wav)

        result = assessment_service.analyze_voice_upload(
            student_id="student_p6_test",
            tmp_path="dummy.wav",
            duration_seconds=5.0,
            language="en-IN",
        )

        assert result.transcript_engine == "whisper"
        assert result.pronunciation_available is True
        assert result.pronunciation_score is not None
        assert len(result.unclear_words) == 1
        assert result.unclear_words[0]["word"] == "dont"
        assert len(result.sentences) >= 1
        assert result.sentences[0].has_errors is True
        assert result.grammar_engine in ("claude", "t5", "rules")
