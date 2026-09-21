"""
MODULE 4 test plan (see AUDIT.md): fluency/pace transparency.

Covers:
- WPM computed exactly from word_count / duration_seconds, not estimated
  from text length alone.
- pace_source correctly labeled "measured" (real WAV pause analysis given)
  vs "estimated" (transcript-based fallback).
- InvalidDurationError raised for zero/negative duration instead of a
  silent clamp.
- text_flow_consistency behaves sensibly on short / uniform / varied text.
"""
import pytest

from app.speech.audio_utils import PauseAnalysis
from app.speech.speech_metrics import (
    InvalidDurationError,
    compute_speech_metrics,
    text_flow_consistency,
)


def test_wpm_computed_exactly_from_word_count_and_duration():
    # exactly 20 words, 10 seconds -> 20 / (10/60) = 120.0 WPM
    transcript = " ".join(["word"] * 20)
    metrics = compute_speech_metrics(transcript, duration_seconds=10.0)
    assert metrics.word_count == 20
    assert metrics.words_per_minute == 120.0


def test_wpm_uses_real_duration_not_text_length_heuristic():
    # same 20-word transcript, different durations must give different WPM
    transcript = " ".join(["word"] * 20)
    fast = compute_speech_metrics(transcript, duration_seconds=5.0)
    slow = compute_speech_metrics(transcript, duration_seconds=20.0)
    assert fast.words_per_minute == 240.0
    assert slow.words_per_minute == 60.0
    assert fast.words_per_minute != slow.words_per_minute


def test_pace_source_measured_when_real_pause_analysis_given():
    transcript = "This is a normal sentence spoken at a normal pace."
    real_pauses = PauseAnalysis(pause_count=3, average_pause_seconds=0.5, voiced_seconds=6.0, total_seconds=8.0)
    metrics = compute_speech_metrics(transcript, duration_seconds=8.0, real_pause_analysis=real_pauses)
    assert metrics.pace_source == "measured"
    assert metrics.pause_count == 3
    assert metrics.average_pause_seconds == 0.5


def test_pace_source_estimated_when_no_pause_analysis_given():
    transcript = "This is a normal sentence spoken at a normal pace."
    metrics = compute_speech_metrics(transcript, duration_seconds=8.0, real_pause_analysis=None)
    assert metrics.pace_source == "estimated"


def test_zero_duration_raises_invalid_duration_error():
    with pytest.raises(InvalidDurationError):
        compute_speech_metrics("hello world", duration_seconds=0.0)


def test_negative_duration_raises_invalid_duration_error():
    with pytest.raises(InvalidDurationError):
        compute_speech_metrics("hello world", duration_seconds=-5.0)


def test_reference_range_wpm_is_documented_default():
    metrics = compute_speech_metrics("hello world this is a test", duration_seconds=5.0)
    assert metrics.reference_range_wpm == "130-160"


def test_text_flow_consistency_too_short_to_measure_returns_neutral_default():
    # a single sentence has no variance to measure at all
    assert text_flow_consistency("This is one sentence with no others.") == 75.0


def test_text_flow_consistency_uniform_sentence_lengths_scores_high():
    # four sentences, each exactly 4 words -> zero variance -> max score
    text = "I like this job. I want this role. I bring real value. I learn very fast."
    score = text_flow_consistency(text)
    assert score == 100.0


def test_text_flow_consistency_wildly_uneven_lengths_scores_lower():
    uniform = "I like this job. I want this role. I bring real value. I learn very fast."
    uneven = "Yes. I would very much like to take on this particular role for many good reasons today."
    assert text_flow_consistency(uneven) < text_flow_consistency(uniform)


def test_empty_transcript_has_zero_word_count_and_zero_wpm():
    metrics = compute_speech_metrics("", duration_seconds=10.0)
    assert metrics.word_count == 0
    assert metrics.words_per_minute == 0.0


def test_filler_count_never_exceeds_word_count():
    transcript = "um uh um uh hello"
    metrics = compute_speech_metrics(transcript, duration_seconds=5.0)
    assert metrics.filler_word_count <= metrics.word_count
