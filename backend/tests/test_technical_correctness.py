"""
MODULE 8 test plan (see AUDIT.md): technical answer correctness. Before
this module, a technical interview answer was scored only on
grammar/vocabulary/structure/fluency — nothing checked whether the
answer's actual technical content was right, wrong, partial, or too thin
to judge, so a well-worded but factually wrong answer could still score
well. These tests prove the concept-checklist approach distinguishes
correct/partially_correct/incorrect/insufficient, and honestly reports
"not applicable" for questions with no known correct-answer shape.
"""
from app.interview.technical_knowledge import evaluate_technical_correctness

_HASH_MAP_QUESTION = "Explain how a hash map works and its average time complexity."


def test_correct_answer_covering_all_required_concepts():
    answer = (
        "A hash map uses a hash function to convert each key into an index into an internal array of buckets, "
        "storing key-value pairs there. Looking up a value is average O(1) constant time."
    )
    result = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert result["applicable"] is True
    assert result["verdict"] == "correct"
    assert "hash function / hashing" in result["matched_concepts"]


def test_partially_correct_answer_mentions_some_but_not_all_required_concepts():
    answer = "A hash map stores key-value pairs so you can look things up quickly by key."
    result = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert result["verdict"] == "partially_correct"
    assert "average O(1) time complexity" in result["missing_concepts"]


def test_incorrect_answer_covering_none_of_the_required_concepts():
    answer = "A hash map is a type of graph data structure used for storing trees and sorting large lists of numbers efficiently."
    result = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert result["verdict"] == "incorrect"


def test_insufficient_answer_is_not_marked_incorrect():
    answer = "I don't know."
    result = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert result["verdict"] == "insufficient"


def test_answer_never_scores_high_just_for_sounding_professional():
    # confident, well-formed, professional-sounding sentence with zero
    # actual required concepts mentioned
    answer = (
        "That is a great question, and in my extensive professional experience I have found that "
        "this particular topic is extremely important for building robust and scalable software systems."
    )
    result = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert result["verdict"] in ("incorrect", "insufficient")
    assert result["score"] < 50.0


def test_bonus_concept_is_reported_separately_from_required():
    answer = (
        "A hash map uses a hash function to place key-value pairs into buckets in an array, giving average "
        "O(1) lookups. Collisions are handled with chaining."
    )
    result = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert "collision handling" in result["bonus_concepts_mentioned"]
    assert "collision handling" not in result["matched_concepts"]


def test_dynamic_question_with_no_checklist_is_marked_not_applicable():
    result = evaluate_technical_correctness(
        "I see Python on your resume — walk me through how you've used it in a real project.",
        "I built a Flask API for a hospital management system.",
    )
    assert result["applicable"] is False
    assert result["verdict"] is None
    assert result["score"] is None


def test_non_technical_question_is_marked_not_applicable():
    result = evaluate_technical_correctness("Tell me about a time you handled conflict within a team.", "I once resolved a disagreement between two teammates.")
    assert result["applicable"] is False


def test_all_five_fixed_technical_questions_have_checklists():
    from app.interview import question_bank

    fixed_technical_questions = question_bank.get_fixed_questions("technical")
    for question in fixed_technical_questions:
        result = evaluate_technical_correctness(question, "some answer text with enough words to be judgeable")
        assert result["applicable"] is True, f"Missing checklist for fixed technical question: {question!r}"


def test_score_is_deterministic():
    answer = "A hash map uses a hash function to store key-value pairs in buckets with average O(1) lookups."
    a = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    b = evaluate_technical_correctness(_HASH_MAP_QUESTION, answer)
    assert a == b
