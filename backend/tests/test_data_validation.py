"""
MODULE 11 test plan (see AUDIT.md): data validation. The original audit
explicitly calls out: no NaN scores, no impossible percentages, no
negative counts, WPM never below 0, filler count never exceeding total
words, and verdict counts that must sum consistently. This module adds
API-boundary bounds (pydantic Field constraints) to the response schemas
and a zero-division guard in the shared scoring engine; these tests prove
both — that adversarial/pathological inputs never produce an out-of-range
number, AND that the schema bounds are real (a genuinely bad value is
rejected, not silently accepted).
"""
import math

import pytest
from pydantic import ValidationError

from app.interview import question_bank
from app.interview.technical_knowledge import evaluate_technical_correctness
from app.nlp import grammar_rules, relevance_analysis, text_analysis
from app.schemas.assessment import TextAnalysisResponse, VoiceAnalysisResponse
from app.schemas.interview import AnswerStructureScore, InterviewAnswerResponse, InterviewResultResponse
from app.services import interview_service
from app.speech.speech_metrics import compute_speech_metrics

_ADVERSARIAL_INPUTS = [
    "",
    "   ",
    "...",
    "!!!???",
    "a",
    "🙂🙂🙂",
    "word " * 500,
    "um " * 200,
    "the the the the the the the the the the",
    "1234567890 !@#$%^&*()",
]


def _assert_percentage(value: float, label: str):
    assert not math.isnan(value), f"{label} is NaN"
    assert 0.0 <= value <= 100.0, f"{label}={value} is out of [0, 100]"


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_grammar_score_never_out_of_range(text):
    result = grammar_rules.analyze(text)
    _assert_percentage(result["score"], "grammar score")
    assert result["grammar_issue_count"] >= 0
    assert result["spelling_issue_count"] >= 0
    assert result["style_issue_count"] >= 0


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_vocabulary_score_never_out_of_range(text):
    result = text_analysis.vocabulary_analysis(text)
    _assert_percentage(result["score"], "vocabulary score")
    assert result["content_word_count"] >= 0


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_structure_score_never_out_of_range(text):
    result = text_analysis.structure_analysis(text)
    _assert_percentage(result["score"], "structure score")
    for name, value in result["components"].items():
        _assert_percentage(value, f"structure component {name}")


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_clarity_score_never_out_of_range(text):
    result = text_analysis.clarity_analysis(text)
    _assert_percentage(result["score"], "clarity score")


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_relevance_score_never_out_of_range(text):
    result = relevance_analysis.analyze_relevance("Tell me about a time you led a project.", text)
    _assert_percentage(result["score"], "relevance score")


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_speech_metrics_never_negative_or_nan(text):
    metrics = compute_speech_metrics(text, duration_seconds=10.0)
    assert metrics.words_per_minute >= 0.0
    assert not math.isnan(metrics.words_per_minute)
    assert metrics.filler_word_count >= 0
    assert metrics.filler_word_count <= metrics.word_count
    assert metrics.pause_count >= 0
    assert metrics.average_pause_seconds >= 0.0
    _assert_percentage(metrics.pace_score, "pace score")
    _assert_percentage(metrics.pace_consistency, "pace consistency")


@pytest.mark.parametrize("text", _ADVERSARIAL_INPUTS)
def test_technical_correctness_score_never_out_of_range(text):
    result = evaluate_technical_correctness("Explain how a hash map works and its average time complexity.", text)
    if result["score"] is not None:
        _assert_percentage(result["score"], "technical correctness score")


def test_text_analysis_response_rejects_out_of_range_score():
    valid_kwargs = dict(
        source="real",
        score=50.0,
        grammar_score=50.0,
        vocabulary_score=50.0,
        structure_score=50.0,
        clarity_score=50.0,
        corrections=[],
        vocabulary_suggestions=[],
        repeated_words=[],
        better_alternative="",
        word_count=5,
    )
    # sanity check: valid data passes
    TextAnalysisResponse(**valid_kwargs)
    # a genuinely impossible value must be rejected, not silently accepted
    with pytest.raises(ValidationError):
        TextAnalysisResponse(**{**valid_kwargs, "grammar_score": 150.0})
    with pytest.raises(ValidationError):
        TextAnalysisResponse(**{**valid_kwargs, "score": -10.0})


def test_voice_analysis_response_rejects_negative_counts():
    valid_kwargs = dict(
        source="real",
        transcript="hello",
        grammar_score=50.0,
        vocabulary_score=50.0,
        fluency_score=50.0,
        pronunciation_score=50.0,
        confidence_score=50.0,
        words_per_minute=120.0,
        pace_score=80.0,
        pace_consistency=80.0,
        filler_word_count=2,
        filler_words_per_minute=1.0,
        most_frequent_filler=None,
        pause_count=1,
        average_pause_seconds=0.5,
    )
    VoiceAnalysisResponse(**valid_kwargs)
    with pytest.raises(ValidationError):
        VoiceAnalysisResponse(**{**valid_kwargs, "filler_word_count": -1})
    with pytest.raises(ValidationError):
        VoiceAnalysisResponse(**{**valid_kwargs, "words_per_minute": -50.0})


def test_answer_structure_score_rejects_out_of_range_component():
    with pytest.raises(ValidationError):
        AnswerStructureScore(introduction=150.0, main_point=50.0, supporting_explanation=50.0, example=50.0, conclusion=50.0)


def test_interview_result_response_rejects_out_of_range_overall():
    valid_kwargs = dict(
        overall=70.0, communication=70.0, confidence=70.0, clarity=70.0, grammar=70.0,
        vocabulary=70.0, structure=70.0, fluency=70.0, pronunciation=70.0,
        went_well=[], needs_improvement=[], recommended_exercises=[],
    )
    InterviewResultResponse(**valid_kwargs)
    with pytest.raises(ValidationError):
        InterviewResultResponse(**{**valid_kwargs, "overall": 200.0})
    with pytest.raises(ValidationError):
        InterviewResultResponse(**{**valid_kwargs, "technical_correct_count": -1})


def test_technical_verdict_counts_sum_to_evaluated_count_through_real_session():
    # MODULE 11: the four verdict buckets must always partition
    # technical_evaluated_count exactly — no double-counting, no answers
    # silently lost.
    session = interview_service.start_session("demo-student", "technical", None, None)
    for q in session["questions"]:
        interview_service.answer_question(session["session_id"], q.id, "I don't know.", "text", None)
    result = interview_service.submit_session(session["session_id"])

    assert (
        result.technical_correct_count
        + result.technical_partially_correct_count
        + result.technical_incorrect_count
        + result.technical_insufficient_count
        == result.technical_evaluated_count
    )
    assert result.technical_evaluated_count == len(question_bank.get_fixed_questions("technical"))
