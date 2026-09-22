"""
MODULE 7 test plan (see AUDIT.md): answer relevance. Before this module,
`question` text was accepted by both the text-assessment and interview
flows but never compared against the answer at all — there was no
relevance metric of any kind. These tests prove the fix identifies real
topic keywords from the question and checks the answer against them,
including the audit's explicit "don't score high just for length" and
"provide evidence" requirements.
"""
from app.nlp.relevance_analysis import analyze_relevance


def test_relevant_answer_scores_high():
    question = "Tell me about a time you led a team through a difficult project."
    answer = "I led a five-person team through a difficult migration project last year."
    result = analyze_relevance(question, answer)
    assert result["score"] >= 60.0


def test_completely_off_topic_answer_scores_low():
    question = "Tell me about a time you led a team through a difficult project."
    answer = "My favorite programming language is Python and I enjoy hiking on weekends."
    result = analyze_relevance(question, answer)
    assert result["score"] < 40.0


def test_long_irrelevant_answer_does_not_score_high_for_length_alone():
    question = "Describe a time you resolved a conflict between two team members."
    long_irrelevant = (
        "I really enjoy working on interesting problems and collaborating with people. "
        "Over the years I have picked up many useful habits and skills that help me every "
        "single day at work, and I try to stay organized and communicate clearly with everyone "
        "around me so that projects go smoothly and everyone stays happy and productive."
    )
    result = analyze_relevance(question, long_irrelevant)
    assert result["score"] < 40.0


def test_short_but_relevant_answer_is_not_penalized_purely_for_brevity():
    question = "What is your experience with Python and machine learning?"
    answer = "I've used Python and machine learning for three years."
    result = analyze_relevance(question, answer)
    assert result["score"] >= 60.0


def test_addressed_and_missing_keywords_are_reported_as_evidence():
    question = "Tell me about a time you improved performance and reduced costs."
    answer = "I improved performance significantly by rewriting the query layer."
    result = analyze_relevance(question, answer)
    assert "performance" in result["addressed_keywords"]
    assert "cost" in result["missing_keywords"] or "costs" in result["missing_keywords"]


def test_question_with_no_identifiable_keywords_is_flagged_insufficient():
    result = analyze_relevance("Why?", "Because it made sense at the time.")
    assert result["sufficient_data"] is False
    assert result["score"] == 50.0


def test_empty_question_is_flagged_insufficient_not_scored_confidently():
    result = analyze_relevance("", "Some answer text here.")
    assert result["sufficient_data"] is False
    assert result["score"] == 50.0


def test_empty_answer_scores_zero_against_a_real_question():
    question = "Tell me about a time you led a difficult project."
    result = analyze_relevance(question, "")
    assert result["score"] == 0.0


def test_formula_string_contains_real_keyword_list():
    question = "Tell me about your experience with Python and Django."
    answer = "I've built several APIs using Python and Django."
    result = analyze_relevance(question, answer)
    assert "python" in result["formula"].lower()


def test_score_is_deterministic():
    question = "Describe a challenging bug you fixed."
    answer = "I once fixed a challenging race condition bug in our payment system."
    a = analyze_relevance(question, answer)
    b = analyze_relevance(question, answer)
    assert a == b
