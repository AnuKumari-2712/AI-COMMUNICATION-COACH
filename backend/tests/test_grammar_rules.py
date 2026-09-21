"""
MODULE 1 tests — grammar accuracy engine.

Every score assertion here is an EXACT value computed by hand from the
documented formula in grammar_rules.py, not a "roughly right" range check —
per the project's testing requirements, these are meant to let you verify
the claims, not trust them.

Run with:
    cd backend
    venv\\Scripts\\activate
    pip install -r requirements-dev.txt
    pytest tests/test_grammar_rules.py -v
"""
import pytest

from app.nlp import grammar_rules
from app.nlp.spacy_model import get_nlp

_SPACY_AVAILABLE = get_nlp() is not None
requires_spacy = pytest.mark.skipif(not _SPACY_AVAILABLE, reason="spaCy model not downloaded — run: python -m spacy download en_core_web_sm")


def test_correct_sentence_scores_100_with_no_corrections():
    result = grammar_rules.analyze("I have worked on several projects during my internship.")
    assert result["corrections"] == []
    assert result["score"] == 100.0
    assert result["sufficient_data"] is True


def test_double_negative_is_detected_as_high_confidence_grammar_error():
    result = grammar_rules.analyze("I don't have no experience in this field.")
    grammar_issues = [c for c in result["corrections"] if c.category == "grammar"]
    assert len(grammar_issues) == 1
    assert grammar_issues[0].rule == "double_negative"
    assert grammar_issues[0].confidence == "high"
    # 1 sentence, 1 high-confidence (weight 1.0) grammar error:
    # score = 100 - (1.0 / 1) * 50 = 50.0
    assert result["score"] == 50.0


def test_subject_verb_agreement_neither_detected():
    result = grammar_rules.analyze("Neither of the teams were ready for the deadline.")
    grammar_issues = [c for c in result["corrections"] if c.category == "grammar"]
    assert len(grammar_issues) == 1
    assert grammar_issues[0].rule == "subject_verb_agreement"
    assert "was" in grammar_issues[0].corrected
    assert "were" not in grammar_issues[0].corrected.lower()
    assert result["score"] == 50.0


def test_repeated_word_detected_as_grammar():
    result = grammar_rules.analyze("The team finally finished the the project on time.")
    grammar_issues = [c for c in result["corrections"] if c.category == "grammar"]
    assert len(grammar_issues) == 1
    assert grammar_issues[0].rule == "repeated_word"
    assert result["score"] == 50.0


def test_homophone_confusion_counted_as_grammar_not_spelling():
    result = grammar_rules.analyze("Your going to love this project.")
    grammar_issues = [c for c in result["corrections"] if c.category == "grammar"]
    assert len(grammar_issues) == 1
    assert grammar_issues[0].rule == "homophone"
    assert result["score"] == 50.0


def test_spelling_error_alone_does_not_lower_grammar_score():
    """Audit finding #1: spelling must never affect grammar_score."""
    result = grammar_rules.analyze("I practiced alot this week.")
    assert result["grammar_issue_count"] == 0
    assert result["spelling_issue_count"] == 1
    assert result["corrections"][0].category == "spelling"
    assert result["score"] == 100.0


def test_casual_style_alone_does_not_lower_grammar_score():
    """Audit finding #1: style/formality must never affect grammar_score."""
    result = grammar_rules.analyze("I'm gonna finish it by Friday.")
    assert result["grammar_issue_count"] == 0
    assert result["style_issue_count"] == 1
    assert result["corrections"][0].category == "style"
    assert result["score"] == 100.0


def test_mixed_spelling_and_style_in_one_answer_still_scores_100():
    """A realistic case: casual but grammatically fine language should not
    be marked as bad grammar just because it's informal."""
    result = grammar_rules.analyze("I'm gonna handle it, I practiced alot for this.")
    assert result["grammar_issue_count"] == 0
    assert result["score"] == 100.0


@requires_spacy
def test_tense_mixing_is_medium_confidence_not_certain():
    result = grammar_rules.analyze("Yesterday I go to the office and finished my report.")
    tense_issues = [c for c in result["corrections"] if c.rule == "tense_consistency"]
    assert len(tense_issues) == 1
    assert tense_issues[0].category == "grammar"
    assert tense_issues[0].confidence == "medium"
    # 1 sentence, 1 MEDIUM-confidence issue (weight 0.5):
    # score = 100 - (0.5 / 1) * 50 = 75.0
    assert result["score"] == 75.0


def test_two_errors_across_two_sentences_divides_the_penalty():
    text = "I don't have no time today. Neither of the teams were ready."
    result = grammar_rules.analyze(text)
    grammar_issues = [c for c in result["corrections"] if c.category == "grammar"]
    assert len(grammar_issues) == 2
    assert result["sentence_count"] == 2
    # weighted_error_count = 2.0, sentence_count = 2 -> error_rate = 1.0
    # score = 100 - 1.0 * 50 = 50.0
    assert result["score"] == 50.0


def test_score_clamps_at_zero_for_heavily_flawed_text():
    text = "I don't have no time and I don't have no money and I don't have no energy."
    result = grammar_rules.analyze(text)
    assert result["score"] >= 0.0
    assert result["score"] <= 100.0


def test_empty_input_is_marked_insufficient_not_scored_as_perfect():
    """An empty answer must not silently score 100 (perfect grammar) —
    that would misrepresent 'no data' as 'no errors'."""
    result = grammar_rules.analyze("")
    assert result["sufficient_data"] is False
    assert result["corrections"] == []
    assert result["word_count"] == 0


def test_whitespace_only_input_is_insufficient():
    result = grammar_rules.analyze("   \n\t  ")
    assert result["sufficient_data"] is False


def test_formula_string_is_present_and_mentions_the_real_numbers():
    result = grammar_rules.analyze("I don't have no time today.")
    assert "weighted_error_count" in result["formula"]
    assert str(result["sentence_count"]) in result["formula"]


def test_every_correction_includes_full_sentence_context():
    result = grammar_rules.analyze("I am a student. I don't have no time today. I like coding.")
    grammar_issues = [c for c in result["corrections"] if c.category == "grammar"]
    assert len(grammar_issues) == 1
    assert "don't have no time" in grammar_issues[0].sentence.lower()


def test_score_is_deterministic_across_repeated_calls():
    """Same input must always produce the same score — no randomness."""
    text = "Neither of the teams were ready. I don't have no experience."
    scores = {grammar_rules.analyze(text)["score"] for _ in range(5)}
    assert len(scores) == 1


def test_long_grammatically_correct_answer_still_scores_100():
    """A long answer with no real errors should not be penalized just for
    length (guards against sentence-count-based formulas over-punishing
    longer, correct answers)."""
    text = (
        "I have worked on several projects during my degree. "
        "One of them involved building a full-stack web application. "
        "I collaborated closely with two other students on the backend. "
        "We delivered the project two weeks ahead of the deadline."
    )
    result = grammar_rules.analyze(text)
    assert result["corrections"] == []
    assert result["score"] == 100.0
