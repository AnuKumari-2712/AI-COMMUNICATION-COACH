"""
Tests for the audio pipeline fixes (webm->WAV upstream, adaptive pause
detection, measured fluency, chunked STT, unpunctuated-transcript grammar).

All audio is synthetic WAV generated here, so results are exactly checkable:
sine "speech" bursts separated by silence of known length.
Run with:  cd backend && pytest tests/test_audio_pipeline.py -v
"""
import math
import random
import struct
import sys
import types
import wave

import pytest

from app.nlp import grammar_rules
from app.schemas.common import AnalysisSource
from app.speech import stt
from app.speech.audio_utils import PauseAnalysis, analyze_wav_pauses
from app.speech.speech_metrics import compute_speech_metrics, measured_fluency_score

RATE = 16000


def _write_wav(path, segments, amplitude=8000, noise=0):
    """segments: list of ("speech"|"silence", seconds). Returns path."""
    rng = random.Random(1)
    frames = bytearray()
    for kind, seconds in segments:
        for n in range(int(seconds * RATE)):
            v = int(amplitude * math.sin(2 * math.pi * 220 * n / RATE)) if kind == "speech" else 0
            if noise:
                v += rng.randint(-noise, noise)
            frames += struct.pack("<h", max(-32768, min(32767, v)))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(frames))
    return str(path)


SPEECH_WITH_GAPS = [("speech", 2.0), ("silence", 0.9), ("speech", 2.0), ("silence", 0.15), ("speech", 2.0), ("silence", 0.5), ("speech", 2.0)]


def test_pause_counts_between_speech_only_and_ignores_short_gaps(tmp_path):
    # 0.15s gap < 0.3s minimum -> not a pause; 0.9s (long) and 0.5s count.
    result = analyze_wav_pauses(_write_wav(tmp_path / "a.wav", SPEECH_WITH_GAPS))
    assert result.pause_count == 2
    assert result.long_pause_count == 1
    assert result.average_pause_seconds == pytest.approx(0.7, abs=0.11)


def test_leading_and_trailing_silence_is_not_a_pause(tmp_path):
    segments = [("silence", 2.0)] + SPEECH_WITH_GAPS + [("silence", 3.0)]
    result = analyze_wav_pauses(_write_wav(tmp_path / "b.wav", segments))
    assert result.pause_count == 2


def test_quiet_microphone_gives_same_pauses_as_loud_one(tmp_path):
    # The old fixed threshold (500) treated amplitude-700 speech as near-silence.
    loud = analyze_wav_pauses(_write_wav(tmp_path / "loud.wav", SPEECH_WITH_GAPS, amplitude=12000))
    quiet = analyze_wav_pauses(_write_wav(tmp_path / "quiet.wav", SPEECH_WITH_GAPS, amplitude=700))
    assert (quiet.pause_count, quiet.long_pause_count) == (loud.pause_count, loud.long_pause_count) == (2, 1)


def test_background_noise_does_not_hide_pauses(tmp_path):
    result = analyze_wav_pauses(_write_wav(tmp_path / "noisy.wav", SPEECH_WITH_GAPS, amplitude=8000, noise=300))
    assert result.pause_count == 2


def test_non_wav_bytes_return_none(tmp_path):
    fake_webm = tmp_path / "a.webm"
    fake_webm.write_bytes(b"\x1aE\xdf\xa3" + b"\x00" * 200)  # EBML/webm magic
    assert analyze_wav_pauses(str(fake_webm)) is None


def test_measured_fluency_formula_exact_values():
    # 60s recording, 2 long pauses, 3 fillers/min, voiced ratio 0.5:
    # hesitation = 2/min * 8 = 16; filler = 3 * 4 = 12; silence = (0.6-0.5)*100 = 10
    pauses = PauseAnalysis(pause_count=5, average_pause_seconds=0.8, voiced_seconds=30.0, total_seconds=60.0, long_pause_count=2)
    score, formula = measured_fluency_score(pauses, filler_per_minute=3.0)
    assert score == 62.0
    assert "= 62.0" in formula


def test_fluency_is_no_longer_a_constant_for_unpunctuated_transcripts():
    transcript = "so i worked on a project with my team and we shipped it on time " * 3  # no punctuation
    smooth = PauseAnalysis(pause_count=1, average_pause_seconds=0.4, voiced_seconds=17.0, total_seconds=20.0, long_pause_count=0)
    hesitant = PauseAnalysis(pause_count=8, average_pause_seconds=1.2, voiced_seconds=9.0, total_seconds=20.0, long_pause_count=6)
    a = compute_speech_metrics(transcript, 20.0, real_pause_analysis=smooth)
    b = compute_speech_metrics(transcript, 20.0, real_pause_analysis=hesitant)
    assert a.fluency_score > b.fluency_score
    assert a.fluency_score != 75.0 or b.fluency_score != 75.0


def test_fluency_falls_back_to_pace_consistency_without_audio():
    metrics = compute_speech_metrics("This is a normal sentence spoken at a normal pace.", 8.0)
    assert metrics.fluency_score == round(metrics.pace_consistency, 1)


def test_unpunctuated_transcript_grammar_is_not_over_penalised():
    transcript = " ".join(["we built a small project and shipped it on time"] * 6) + " he don't know"
    strict = grammar_rules.analyze(transcript)  # whole transcript = 1 sentence
    lenient = grammar_rules.analyze(transcript, assume_unpunctuated=True)
    assert strict["score"] < lenient["score"]
    assert lenient["sentence_count"] > 1
    assert "estimated as ceil" in lenient["formula"]


def test_punctuated_text_is_unchanged_by_the_new_flag():
    text = "I have worked on projects. He don't like delays."
    assert grammar_rules.analyze(text)["score"] == grammar_rules.analyze(text, assume_unpunctuated=True)["score"]


def _fake_speech_recognition(monkeypatch, outcomes):
    """Installs a fake `speech_recognition` whose recognize_google yields `outcomes` in order."""
    import speech_recognition as real_sr

    calls = {"n": 0}

    def fake_recognize(self, audio, language="en-US"):
        outcome = outcomes[calls["n"]]
        calls["n"] += 1
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(real_sr.Recognizer, "recognize_google", fake_recognize)
    return calls


def test_stt_sends_long_audio_in_chunks_and_skips_silent_chunk(tmp_path, monkeypatch):
    import speech_recognition as sr

    path = _write_wav(tmp_path / "long.wav", [("speech", 60.0)], amplitude=2000)  # 60s -> 3 chunks (25+25+10)
    calls = _fake_speech_recognition(monkeypatch, ["first part", sr.UnknownValueError(), "last part"])
    text, source = stt.transcribe_wav(path)
    assert calls["n"] == 3
    assert (text, source) == ("first part last part", AnalysisSource.real)


def test_stt_network_failure_still_degrades_to_labeled_mock(tmp_path, monkeypatch):
    import speech_recognition as sr

    path = _write_wav(tmp_path / "short.wav", [("speech", 3.0)], amplitude=2000)
    _fake_speech_recognition(monkeypatch, [sr.RequestError("no internet")])
    text, source = stt.transcribe_wav(path)
    assert source == AnalysisSource.mock and text


def test_short_clip_rate_uses_30s_floor():
    # 1 long pause in a 6s clip is 1 / 0.5min = 2 per minute (not 10/min): penalty 16, not 40.
    pauses = PauseAnalysis(pause_count=1, average_pause_seconds=0.9, voiced_seconds=5.0, total_seconds=6.0, long_pause_count=1)
    score, _ = measured_fluency_score(pauses, filler_per_minute=0.0)
    assert score == 84.0


def test_continuous_speech_without_pauses_is_all_voiced(tmp_path):
    # Regression: an uncapped adaptive threshold (2 x noise floor) exceeded the speech
    # level of a steady 20s recording and reported voiced_seconds == 0.
    result = analyze_wav_pauses(_write_wav(tmp_path / "steady.wav", [("speech", 20.0)], amplitude=8000))
    assert result.pause_count == 0
    assert result.voiced_seconds == pytest.approx(20.0, abs=0.2)


def test_silent_file_has_no_voiced_time_and_no_pauses(tmp_path):
    result = analyze_wav_pauses(_write_wav(tmp_path / "silent.wav", [("silence", 5.0)]))
    assert result.voiced_seconds == 0.0
    assert result.pause_count == 0
