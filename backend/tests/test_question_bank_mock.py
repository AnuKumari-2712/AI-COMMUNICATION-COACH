"""
MODULE 9 test plan (see AUDIT.md): question_bank.get_fixed_questions("mock")
had no "mock" entry at all, so it silently fell back to the "hr" list —
"Full Mock Interview" (described as "End-to-end simulation across all
rounds") was actually only ever asking HR questions. These tests prove
the fixed mock question set genuinely mixes categories and that each
question's stage is correctly tagged for downstream structure evaluation.
"""
from app.interview import question_bank


def test_mock_questions_are_not_just_the_hr_list():
    mock_questions = question_bank.get_fixed_questions("mock")
    hr_questions = question_bank.get_fixed_questions("hr")
    assert mock_questions != hr_questions


def test_mock_question_count_matches_declared_category_count():
    mock_questions = question_bank.get_fixed_questions("mock")
    mock_category = next(c for c in question_bank.get_categories() if c["id"] == "mock")
    assert len(mock_questions) == mock_category["question_count"]


def test_mock_includes_questions_from_multiple_real_categories():
    mock_questions = set(question_bank.get_fixed_questions("mock"))
    hr_questions = set(question_bank.get_fixed_questions("hr"))
    behavioral_questions = set(question_bank.get_fixed_questions("behavioral"))
    technical_questions = set(question_bank.get_fixed_questions("technical"))

    assert mock_questions & hr_questions
    assert mock_questions & behavioral_questions
    assert mock_questions & technical_questions


def test_mock_question_stages_are_tagged_per_question_not_uniformly_mock():
    stages = question_bank.get_question_stages("mock")
    assert set(stages) == {"hr", "behavioral", "technical"}
    assert len(stages) == len(question_bank.get_fixed_questions("mock"))


def test_non_mock_category_has_uniform_stage_matching_its_own_id():
    stages = question_bank.get_question_stages("behavioral")
    assert all(s == "behavioral" for s in stages)
    assert len(stages) == len(question_bank.get_fixed_questions("behavioral"))
