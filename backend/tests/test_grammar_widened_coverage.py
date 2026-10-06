"""
Tests for the widened grammar/spelling coverage added after users reported
that written feedback missed obvious mistakes.

Two kinds of test: (1) each new rule fires on the mistake it targets with the
exact correction, and (2) a false-positive guard — correct sentences that
superficially resemble a rule must produce NO corrections.

Run with:  cd backend && pytest tests/test_grammar_widened_coverage.py -v
"""
import pytest

from app.nlp import grammar_rules


def _rules(text: str) -> list[tuple[str, str, str]]:
    return [(c.rule, c.original, c.corrected) for c in grammar_rules.analyze(text)["corrections"]]


@pytest.mark.parametrize(
    "text, expected",
    [
        ("He don't like it.", ("subject_verb_agreement", "He don't", "He doesn't")),
        ("They was late.", ("subject_verb_agreement", "They was", "They were")),
        ("We is ready.", ("subject_verb_agreement", "We is", "We are")),
        ("She have a plan.", ("subject_verb_agreement", "She have", "She has")),
        ("I should of called you.", ("modal_of", "should of", "should have")),
        ("This is more better.", ("double_comparative", "more better", "better")),
        ("I didn't went there.", ("verb_form", "didn't went", "didn't go")),
        ("I am agree with this.", ("verb_form", "I am agree", "I agree")),
        ("We discussed about the plan.", ("preposition", "discussed about", "discussed")),
        ("I had a interview today.", ("article_usage", "a interview", "an interview")),
        ("He joined an university.", ("article_usage", "an university", "a university")),
        ("It took a hour.", ("article_usage", "a hour", "an hour")),
        ("She go to office daily.", ("subject_verb_agreement", "She go", "She goes")),
        ("i think so.", ("capitalization", "i think", "I think")),
        ("I recieve alot of mail.", ("spelling", "recieve", "receive")),
        ("I dont know.", ("spelling", "dont", "don't")),
    ],
)
def test_new_rule_fires_with_exact_correction(text, expected):
    assert expected in _rules(text)


@pytest.mark.parametrize(
    "text",
    [
        "I have worked as a software engineer on an API for an hour at a university.",
        "It is an urban area, an unimportant detail, an honest answer, a user, a unique idea.",
        "I wrote an SQL query and an html page, then an umbrella test.",
        "Did he go there? Can she make it? Let him go. What did she do?",
        "If he were here, she would help.",
        "I would have called you if I could have.",
        "This works better and is easier to maintain.",
        "He doesn't like it and they don't mind.",
        "She has a plan and he has another.",
    ],
)
def test_correct_sentences_are_not_flagged(text):
    assert grammar_rules.analyze(text)["corrections"] == []


def test_bare_verb_after_he_she_is_medium_confidence_and_half_weighted():
    result = grammar_rules.analyze("She go to office daily.")
    (c,) = [c for c in result["corrections"] if c.rule == "subject_verb_agreement"]
    assert c.confidence == "medium"
    # 1 sentence, 1 medium (0.5) grammar issue: 100 - 0.5 * 50 = 75.0
    assert result["score"] == 75.0


def test_spelling_and_capitalization_never_lower_grammar_score():
    result = grammar_rules.analyze("i think I recieve alot of experiance.")
    assert result["grammar_issue_count"] == 0
    assert result["spelling_issue_count"] >= 3
    assert result["score"] == 100.0


def test_missing_double_count_for_she_have():
    assert len([r for r in _rules("She have a plan.") if r[1] == "She have"]) == 1
