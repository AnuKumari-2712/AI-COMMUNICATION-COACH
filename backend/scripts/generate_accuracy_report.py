"""
MODULE 12 (see AUDIT.md): generates backend/ACCURACY_REPORT.md by running
the ground-truth benchmark (tests/ground_truth_data.py) against the real
analysis functions — the same functions the API uses, not a separate
reimplementation — and recording Metric/Method/Input/Expected/Actual/
Match for every example, plus per-metric accuracy.

Run it yourself:
    cd backend
    venv\\Scripts\\activate
    python scripts/generate_accuracy_report.py

This is a report generator, not a test — pytest (test_ground_truth_
benchmark.py) is what actually enforces these examples via CI-style
assertions. This script's only job is to turn the same dataset into a
human-readable, dated document.
"""
import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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


def _row(method: str, input_desc: str, expected, actual, matched: bool) -> str:
    mark = "✅" if matched else "❌"
    return f"| {method} | {input_desc} | {expected} | {actual} | {mark} |"


def _grammar_rows():
    rows = []
    correct = 0
    for e in GRAMMAR_EXAMPLES:
        result = grammar_rules.analyze(e["text"])
        actual = result["grammar_issue_count"] > 0
        matched = actual == e["expected_has_grammar_issue"]
        correct += matched
        rows.append(_row("grammar_rules.analyze()", f"{e['text']!r} ({e['note']})", e["expected_has_grammar_issue"], actual, matched))
    return rows, correct, len(GRAMMAR_EXAMPLES)


def _filler_rows():
    rows = []
    correct = 0
    for e in FILLER_EXAMPLES:
        metrics = compute_speech_metrics(e["text"], duration_seconds=10.0)
        actual = metrics.filler_word_count
        matched = actual == e["expected_filler_count"]
        correct += matched
        rows.append(_row("speech_metrics.detect_filler_words()", f"{e['text']!r} ({e['note']})", e["expected_filler_count"], actual, matched))
    return rows, correct, len(FILLER_EXAMPLES)


def _pace_rows():
    rows = []
    correct = 0
    for e in PACE_EXAMPLES:
        text = " ".join(["word"] * e["word_count"])
        metrics = compute_speech_metrics(text, duration_seconds=e["duration_seconds"])
        actual = metrics.words_per_minute
        matched = actual == e["expected_wpm"]
        correct += matched
        rows.append(_row("speech_metrics.compute_speech_metrics()", f"{e['word_count']} words / {e['duration_seconds']}s", e["expected_wpm"], actual, matched))
    return rows, correct, len(PACE_EXAMPLES)


def _relevance_rows():
    rows = []
    correct = 0
    for e in RELEVANCE_EXAMPLES:
        result = analyze_relevance(e["question"], e["answer"])
        actual_relevant = result["score"] >= 50.0
        matched = actual_relevant == e["expected_relevant"]
        correct += matched
        rows.append(_row("relevance_analysis.analyze_relevance()", f"Q: {e['question'][:40]}... / A: {e['answer'][:40]}...", e["expected_relevant"], f"{actual_relevant} (score={result['score']})", matched))
    return rows, correct, len(RELEVANCE_EXAMPLES)


def _technical_rows():
    rows = []
    correct = 0
    for e in TECHNICAL_EXAMPLES:
        result = evaluate_technical_correctness(e["question"], e["answer"])
        actual = result["verdict"]
        matched = actual == e["expected_verdict"]
        correct += matched
        rows.append(_row("technical_knowledge.evaluate_technical_correctness()", f"{e['question'][:50]}...", e["expected_verdict"], actual, matched))
    return rows, correct, len(TECHNICAL_EXAMPLES)


def generate() -> str:
    sections = [
        ("Grammar", _grammar_rows(), "Only the 7 hand-coded rule patterns in grammar_rules.py are checked — see AUDIT.md Module 1 for coverage limits (e.g. 'dont' without an apostrophe is not matched by the double-negative rule)."),
        ("Filler Words", _filler_rows(), "Context-aware for 'like'/'kind of'/'you know'/'actually' (see AUDIT.md Module 3); relies on spaCy POS tagging, which has known small-model limitations documented there."),
        ("Speaking Pace (WPM)", _pace_rows(), "WPM is computed by exact definition (words / minutes) — this category is expected to match 100% by construction, not because pace prediction is 'solved'; see AUDIT.md Module 4 for pace_source measured-vs-estimated distinction."),
        ("Answer Relevance", _relevance_rows(), "Keyword/lemma overlap, not semantic understanding — an answer echoing the question's own words without answering it would still score well; see AUDIT.md Module 7."),
        ("Technical Correctness", _technical_rows(), "Only the 5 fixed technical-interview questions have a verified concept checklist; checks for keyword presence, not contextual correctness of usage; see AUDIT.md Module 8."),
    ]

    total_correct = sum(s[1][1] for s in sections)
    total_count = sum(s[1][2] for s in sections)
    overall_pct = round(100 * total_correct / total_count, 1) if total_count else 0.0

    lines = [
        "# Accuracy Report",
        "",
        f"Generated {datetime.date.today().isoformat()} by `scripts/generate_accuracy_report.py`, "
        "run against the ground-truth benchmark in `tests/ground_truth_data.py` — the exact same "
        "functions the live API calls, not a separate reimplementation.",
        "",
        "**This is not a claim of real-world accuracy at scale.** It is a small, manually-curated "
        "benchmark (28 examples across 5 metrics) proving the implementation does what its own "
        "documented rules say it does, on cases a human has checked by hand. See `AUDIT.md` for the "
        "full per-module accuracy problems found and fixed, and the honestly-documented limitations "
        "of each metric — this report never claims 100% accuracy beyond what is demonstrated below.",
        "",
        f"## Overall: {total_correct}/{total_count} ({overall_pct}%) ground-truth examples matched",
        "",
    ]

    for name, (rows, correct, count), limitations in sections:
        pct = round(100 * correct / count, 1) if count else 0.0
        lines.append(f"## {name} — {correct}/{count} ({pct}%)")
        lines.append("")
        lines.append(f"**Known limitations:** {limitations}")
        lines.append("")
        lines.append("| Method | Input | Expected | Actual | Match |")
        lines.append("|---|---|---|---|---|")
        lines.extend(rows)
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        "To reproduce: `cd backend && venv\\Scripts\\activate && python scripts/generate_accuracy_report.py` "
        "(regenerates this file) or `pytest tests/test_ground_truth_benchmark.py -v` (asserts every row above passes)."
    )
    return "\n".join(lines)


if __name__ == "__main__":
    report = generate()
    out_path = Path(__file__).resolve().parent.parent / "ACCURACY_REPORT.md"
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")
