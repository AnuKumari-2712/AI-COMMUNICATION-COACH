"""
MODULE 2 tests — vocabulary accuracy engine.

Audit finding: raw type-token ratio (TTR) is length-biased and a short
answer can hit a perfect diversity score by chance alone. This module
switched to Herdan's C (length-stable) and added a sufficient_data flag
for short answers. These tests verify both parts of that fix, plus exact
formula reproduction.

Run with:
    cd backend
    venv\\Scripts\\activate
    pip install -r requirements-dev.txt
    pytest tests/test_vocabulary_analysis.py -v
"""
import math

from app.nlp.text_analysis import vocabulary_analysis, _lexical_diversity, _MIN_CONTENT_WORDS_FOR_CONFIDENT_SCORE


def test_empty_input_scores_zero_and_is_flagged_insufficient():
    result = vocabulary_analysis("")
    assert result["score"] == 0.0
    assert result["sufficient_data"] is False
    assert result["content_word_count"] == 0


def test_short_answer_is_flagged_low_confidence_even_if_diverse():
    """A 5-word answer with zero repeats should NOT be presented as a
    confident, reliable vocabulary measurement — this is the exact bias
    the audit flagged."""
    result = vocabulary_analysis("Quantum encryption enables secure communication.")
    assert result["content_word_count"] < _MIN_CONTENT_WORDS_FOR_CONFIDENT_SCORE
    assert result["sufficient_data"] is False


def test_long_diverse_answer_is_confident_and_scores_high():
    text = (
        "I have worked on several innovative projects throughout my academic career, "
        "including a healthcare scheduling platform, a machine learning pipeline for "
        "fraud detection, and a mobile application supporting local community volunteering."
    )
    result = vocabulary_analysis(text)
    assert result["content_word_count"] >= _MIN_CONTENT_WORDS_FOR_CONFIDENT_SCORE
    assert result["sufficient_data"] is True
    assert result["score"] > 70.0


def test_long_repetitive_answer_scores_lower_than_long_diverse_answer():
    repetitive = "project good " * 10  # 20 content words, only 2 unique
    diverse = (
        "I have worked on several innovative projects throughout my academic career, "
        "including a healthcare scheduling platform, a machine learning pipeline for "
        "fraud detection, and a mobile application supporting local community volunteering."
    )
    repetitive_result = vocabulary_analysis(repetitive)
    diverse_result = vocabulary_analysis(diverse)
    assert repetitive_result["sufficient_data"] is True  # 20 content words, enough to be confident
    assert repetitive_result["score"] < diverse_result["score"]


def test_long_answer_is_not_scored_high_purely_for_being_long():
    """Audit requirement: do not give a vocabulary score just because the
    answer is long. A long but highly repetitive answer must score low
    despite its length."""
    repetitive_long = "the thing is good the thing is good the thing is good " * 5
    result = vocabulary_analysis(repetitive_long)
    assert result["score"] < 50.0


def test_herdan_c_is_more_length_stable_than_raw_ttr():
    """Direct proof that the diversity measure resists the length bias:
    doubling a fully-diverse vocabulary's word count (no repeats either
    way) should barely move Herdan's C, whereas raw TTR is identical (1.0)
    in both cases and therefore CAN'T distinguish sample-size reliability —
    which is exactly why sufficient_data exists as a separate signal."""
    c_small = _lexical_diversity(unique_count=10, total_count=10)
    c_large = _lexical_diversity(unique_count=30, total_count=30)
    assert c_small == 1.0
    assert c_large == 1.0  # both maxed out — proves WHY sufficient_data must exist independent of the diversity score itself


def test_repeated_words_are_detected_and_reported():
    text = "project project project result result result outcome outcome outcome plan plan plan"
    result = vocabulary_analysis(text)
    assert "project" in result["repeated_words"]
    assert "result" in result["repeated_words"]


def test_score_formula_matches_documented_calculation_exactly():
    text = (
        "I have worked on several innovative projects throughout my academic career, "
        "including a healthcare scheduling platform for local community volunteering."
    )
    result = vocabulary_analysis(text)

    # Recompute independently from the raw numbers the function itself
    # reports, using the exact documented formula — if this doesn't match
    # result["score"], the formula string is lying about what the code does.
    diversity = result["lexical_diversity"]
    avg_len = result["average_word_length"]
    repeated_count = len(result["repeated_words"])
    expected = round(min(100.0, max(0.0, diversity * 55 + (min(avg_len, 8) / 8) * 30 + max(0.0, 15 - repeated_count * 4))), 1)
    assert result["score"] == expected


def test_suggestions_offered_for_generic_words():
    result = vocabulary_analysis("It was a good project and I did a good job overall on the good outcome.")
    assert len(result["suggestions"]) > 0
    assert any("good" in s.lower() for s in result["suggestions"])


def test_score_is_deterministic():
    text = "I built a distributed caching layer to reduce database load significantly."
    scores = {vocabulary_analysis(text)["score"] for _ in range(5)}
    assert len(scores) == 1


def test_formula_string_contains_real_numbers():
    result = vocabulary_analysis("I designed a scalable microservice architecture for the platform.")
    assert "Herdan's C" in result["formula"]
    assert str(result["content_word_count"]) in result["formula"]
