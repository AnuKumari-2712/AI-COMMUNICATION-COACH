"""
MODULE 9 test plan (see AUDIT.md): follow-up question generation. Before
this module, the interview flow's entire question slate was fixed at
session start and nothing ever looked at what the candidate actually
said. These tests prove a follow-up references something SPECIFIC from
the answer (the audit's own example: "hospital management system"), that
vague answers honestly get no follow-up rather than a generic one, and
that an already-referenced phrase isn't asked about twice.
"""
from app.interview.followup_generator import generate_followup


def test_followup_references_the_specific_project_mentioned():
    answer = "I built a hospital management system using the MERN stack for my final year project."
    result = generate_followup(answer)
    assert result is not None
    assert "hospital management system" in result["phrase"].lower()
    assert "hospital management system" in result["question_text"].lower()


def test_vague_answer_gets_no_followup():
    answer = "I did some stuff and it went pretty well overall."
    result = generate_followup(answer)
    assert result is None


def test_empty_answer_gets_no_followup():
    assert generate_followup("") is None
    assert generate_followup("   ") is None


def test_already_referenced_phrase_is_not_repeated():
    answer = "I built a hospital management system using the MERN stack."
    already = {"hospital management system"}
    result = generate_followup(answer, already_referenced=already)
    assert result is None or "hospital management system" not in result["phrase"].lower()


def test_generic_pronouns_and_short_words_are_not_used_as_the_followup_topic():
    answer = "It was really good and I liked it a lot, it was great."
    result = generate_followup(answer)
    assert result is None


def test_followup_question_text_is_a_question():
    answer = "I led the migration of our payment gateway to a new provider last quarter."
    result = generate_followup(answer)
    assert result is not None
    assert result["question_text"].strip().endswith("?")


def test_different_template_index_produces_different_phrasing():
    answer = "I redesigned the onboarding flow for our mobile application."
    first = generate_followup(answer, template_index=0)
    second = generate_followup(answer, template_index=1)
    assert first is not None and second is not None
    assert first["question_text"] != second["question_text"]


def test_deterministic_for_same_inputs():
    answer = "I optimized our database indexing strategy to reduce query latency."
    a = generate_followup(answer, template_index=0)
    b = generate_followup(answer, template_index=0)
    assert a == b
