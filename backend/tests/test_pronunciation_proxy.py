"""
MODULE 5 test plan (see AUDIT.md): pronunciation must never be presented
as a reliably measured score — this project has no audio phoneme-analysis
model, so pronunciation_proxy() is a documented transcript-only estimate
that always reports reliable=False and explains its method.
"""
from app.speech.speech_metrics import pronunciation_proxy


def test_always_reports_unreliable():
    result = pronunciation_proxy(average_word_length=5.0, stt_used=True)
    assert result["reliable"] is False


def test_never_reliable_even_with_stt_success():
    # stt_used=True is still just a weak proxy signal, never a real
    # audio-based pronunciation measurement
    result = pronunciation_proxy(average_word_length=6.0, stt_used=True)
    assert result["reliable"] is False


def test_method_explicitly_states_not_phoneme_analysis():
    result = pronunciation_proxy(average_word_length=5.0, stt_used=False)
    assert "not" in result["method"].lower()
    assert "phoneme" in result["method"].lower()


def test_stt_success_raises_base_score_over_no_stt():
    with_stt = pronunciation_proxy(average_word_length=4.0, stt_used=True)
    without_stt = pronunciation_proxy(average_word_length=4.0, stt_used=False)
    assert with_stt["score"] > without_stt["score"]


def test_longer_average_word_length_increases_score_up_to_cap():
    short_words = pronunciation_proxy(average_word_length=3.0, stt_used=True)
    long_words = pronunciation_proxy(average_word_length=7.0, stt_used=True)
    assert long_words["score"] > short_words["score"]


def test_score_never_exceeds_documented_cap():
    result = pronunciation_proxy(average_word_length=50.0, stt_used=True)
    assert result["score"] <= 96.0


def test_score_never_drops_below_documented_floor():
    result = pronunciation_proxy(average_word_length=0.0, stt_used=False)
    assert result["score"] >= 20.0


def test_signals_used_names_stt_when_used():
    result = pronunciation_proxy(average_word_length=5.0, stt_used=True)
    assert any("speech-to-text" in s.lower() for s in result["signals_used"])


def test_signals_used_notes_absence_of_stt_when_not_used():
    result = pronunciation_proxy(average_word_length=5.0, stt_used=False)
    assert any("no speech-to-text" in s.lower() for s in result["signals_used"])


def test_deterministic_across_repeated_calls():
    a = pronunciation_proxy(average_word_length=5.5, stt_used=True)
    b = pronunciation_proxy(average_word_length=5.5, stt_used=True)
    assert a == b
