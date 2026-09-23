"""
MODULE 12 (see AUDIT.md): ground-truth benchmark — runs the manually
verified examples in ground_truth_data.py against the real analysis
functions and asserts actual matches expected. This is distinct from the
per-module unit tests (which check internal logic/formulas in isolation):
this is the audit's explicit "small benchmark with manually verified
examples" requirement (section 18), covering grammar, fillers, pace,
relevance and technical correctness in one place, in the same input/
expected/actual shape used by the accuracy report
(scripts/generate_accuracy_report.py generates backend/ACCURACY_REPORT.md
from this exact same dataset).
"""
import pytest

from app.interview.technical_knowledge import evaluate_technical_correctness
from app.nlp import grammar_rules
from app.nlp.relevance_analysis import analyze_relevance
from app.speech.speech_metrics import compute_speech_metrics
from tests.ground_truth_data import (
    FILLER_EXAMPLES,
    GRAMMAR_EXAMPLES,
    PACE_EXAMPLES,
    RELEVANCE_EXAMPLES,
    TECHNICAL_EXAMPLES,
)


@pytest.mark.parametrize("example", GRAMMAR_EXAMPLES, ids=[e["note"] for e in GRAMMAR_EXAMPLES])
def test_grammar_ground_truth(example):
    result = grammar_rules.analyze(example["text"])
    has_issue = result["grammar_issue_count"] > 0
    assert has_issue == example["expected_has_grammar_issue"], (
        f"text={example['text']!r} expected_has_grammar_issue={example['expected_has_grammar_issue']} "
        f"actual grammar_issue_count={result['grammar_issue_count']}"
    )


@pytest.mark.parametrize("example", FILLER_EXAMPLES, ids=[e["note"] for e in FILLER_EXAMPLES])
def test_filler_ground_truth(example):
    metrics = compute_speech_metrics(example["text"], duration_seconds=10.0)
    assert metrics.filler_word_count == example["expected_filler_count"], (
        f"text={example['text']!r} expected={example['expected_filler_count']} actual={metrics.filler_word_count}"
    )


@pytest.mark.parametrize(
    "example", PACE_EXAMPLES, ids=[f"{e['word_count']}w/{e['duration_seconds']}s" for e in PACE_EXAMPLES]
)
def test_pace_ground_truth(example):
    text = " ".join(["word"] * example["word_count"])
    metrics = compute_speech_metrics(text, duration_seconds=example["duration_seconds"])
    assert metrics.words_per_minute == example["expected_wpm"]


@pytest.mark.parametrize(
    "example", RELEVANCE_EXAMPLES, ids=[f"relevant={e['expected_relevant']}" for e in RELEVANCE_EXAMPLES]
)
def test_relevance_ground_truth(example):
    result = analyze_relevance(example["question"], example["answer"])
    is_relevant = result["score"] >= 50.0
    assert is_relevant == example["expected_relevant"], (
        f"question={example['question']!r} answer={example['answer']!r} "
        f"expected_relevant={example['expected_relevant']} actual_score={result['score']}"
    )


@pytest.mark.parametrize(
    "example", TECHNICAL_EXAMPLES, ids=[e["expected_verdict"] for e in TECHNICAL_EXAMPLES]
)
def test_technical_correctness_ground_truth(example):
    result = evaluate_technical_correctness(example["question"], example["answer"])
    assert result["verdict"] == example["expected_verdict"], (
        f"question={example['question']!r} expected={example['expected_verdict']} actual={result['verdict']}"
    )
