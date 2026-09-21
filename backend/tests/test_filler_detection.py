"""
MODULE 3 tests — filler word false-positive reduction.

Audit finding: the old detector matched a fixed word list ANYWHERE in the
text, so "Do you know the deadline?" and "I like pizza" both got counted
as filler usage. These tests prove the false positives are gone AND that
real filler usage is still caught.

Run with:
    cd backend
    venv\\Scripts\\activate
    pip install -r requirements-dev.txt
    pytest tests/test_filler_detection.py -v
"""
from app.speech.speech_metrics import detect_filler_words


def test_genuine_question_with_you_know_is_not_a_filler():
    """The exact false positive named in the audit."""
    result = detect_filler_words("Do you know the deadline for this project?")
    assert result["count"] == 0
    assert len(result["excluded_examples"]) == 1


def test_clause_initial_you_know_is_counted():
    result = detect_filler_words("You know, I think we should refactor this module.")
    assert result["count"] == 1
    assert "you know" in result["breakdown"]


def test_unambiguous_fillers_always_counted():
    result = detect_filler_words("Um, I think, uh, it works fine.")
    assert result["count"] == 2
    assert result["high_confidence_count"] == 2
    assert result["ambiguous_count"] == 0


def test_clause_initial_actually_is_counted():
    result = detect_filler_words("Actually, I disagree with that approach.")
    assert result["count"] == 1
    assert "actually" in result["breakdown"]


def test_mid_clause_actually_is_excluded():
    """The exact second false positive named in the audit: a normal
    sentence-internal adverb should not be confidently flagged as hesitation."""
    result = detect_filler_words("I actually finished the report early this week.")
    assert result["count"] == 0
    assert len(result["excluded_examples"]) == 1


def test_like_as_verb_is_not_a_filler():
    result = detect_filler_words("I like pizza and my friends like it too.")
    assert result["count"] == 0
    assert len(result["excluded_examples"]) == 2


def test_like_as_simile_is_not_a_filler():
    result = detect_filler_words("The system behaves like a filter for incoming requests.")
    assert result["count"] == 0


def test_like_as_genuine_filler_is_counted():
    result = detect_filler_words("It was like really cool, you know, like a big moment.")
    # "like really cool" -> filler; "you know" -> not clause-initial/final here
    # ("like a big moment" clause), so only the two "like"s matter here.
    like_matches = result["breakdown"].get("like", 0)
    assert like_matches >= 1


def test_kind_of_before_noun_is_not_a_filler():
    result = detect_filler_words("This kind of problem requires careful analysis.")
    assert result["count"] == 0


def test_kind_of_before_adjective_is_a_filler():
    result = detect_filler_words("It was kind of hard to finish on time.")
    assert result["count"] == 1
    assert "kind of" in result["breakdown"]


def test_empty_transcript_has_no_fillers():
    result = detect_filler_words("")
    assert result["count"] == 0
    assert result["most_frequent"] is None


def test_total_count_equals_high_confidence_plus_ambiguous():
    result = detect_filler_words("Um, actually, I think, uh, you know, this is kind of hard.")
    assert result["count"] == result["high_confidence_count"] + result["ambiguous_count"]


def test_excluded_examples_are_human_readable_evidence():
    result = detect_filler_words("Do you know if the actually correct answer is here?")
    assert all(isinstance(e, str) and len(e) > 0 for e in result["excluded_examples"])


def test_detection_is_deterministic():
    text = "Um, you know, I think this is kind of tricky, actually."
    counts = {detect_filler_words(text)["count"] for _ in range(5)}
    assert len(counts) == 1
