"""
MODULE 6 test plan (see AUDIT.md): the `intro_present` component of
structure_analysis() used to be `... or True`, always scoring the
introduction as present regardless of the actual answer. These tests
prove the fix distinguishes a substantive opening from a trivial one,
and that STAR-format evaluation (behavioral) stays separate from generic
structure evaluation (non-behavioral/technical) — the audit's "don't
force STAR on every question type" requirement.
"""
from app.interview.structure_analyzer import evaluate_star_format
from app.nlp.text_analysis import structure_analysis


def test_trivial_one_word_answer_has_no_introduction_credit():
    result = structure_analysis("Yes.")
    assert result["components"]["introduction"] == 40.0


def test_short_filler_opening_has_no_introduction_credit():
    result = structure_analysis("Um, so I guess that happened once before.")
    assert result["components"]["introduction"] == 40.0


def test_substantive_opening_sentence_gets_introduction_credit():
    text = (
        "I recently led a major project redesigning our checkout experience for mobile users. "
        "We shipped it two weeks ahead of schedule."
    )
    result = structure_analysis(text)
    assert result["components"]["introduction"] == 100.0


def test_literal_introduction_keyword_still_gets_credit():
    text = "My name is Priya and I have three years of experience in backend development."
    result = structure_analysis(text)
    assert result["components"]["introduction"] == 100.0


def test_empty_text_has_no_introduction_credit():
    result = structure_analysis("")
    assert result["components"]["introduction"] == 40.0


def test_introduction_is_not_hardcoded_true_for_every_nonempty_answer():
    # regression test for the exact `or True` bug: a real, non-trivial
    # answer with a weak/trivial opening must NOT automatically score 100
    # on introduction just because *some* text exists.
    trivial = structure_analysis("Okay.")
    substantive = structure_analysis(
        "I want to explain how I approached this particular technical challenge in detail."
    )
    assert trivial["components"]["introduction"] < substantive["components"]["introduction"]


def test_example_present_requires_an_actual_example_keyword():
    with_example = structure_analysis("I solved this. For example, I automated the deployment pipeline.")
    without_example = structure_analysis("I solved this. It worked well in the end.")
    assert with_example["components"]["example"] == 100.0
    assert without_example["components"]["example"] == 25.0


def test_star_format_is_used_for_behavioral_not_generic_structure():
    text = "At the time, we were behind schedule. I was responsible for the fix. I organized a new plan. As a result, we shipped on time."
    star_result = evaluate_star_format(text)
    generic_result = structure_analysis(text)
    # STAR components are situation/task/action/result; generic components
    # are introduction/main_point/supporting_explanation/example/conclusion —
    # these must be genuinely different evaluations, not the same function
    # under two names.
    assert set(star_result["components"].keys()) == {"situation", "task", "action", "result"}
    assert set(generic_result["components"].keys()) == {
        "introduction",
        "main_point",
        "supporting_explanation",
        "example",
        "conclusion",
    }


def test_star_format_detects_all_four_components_when_present():
    text = "At the time, we were behind schedule. I was responsible for the fix. I organized a new plan. As a result, we shipped on time."
    result = evaluate_star_format(text)
    assert result["missing_components"] == []
    assert result["score"] == 100.0
