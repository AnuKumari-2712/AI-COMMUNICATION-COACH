"""
MODULE 10 test plan (see AUDIT.md): scoring transparency. Before this
module, overall/composite scores used hardcoded, unexplained weights and
could silently blend an unreliable component (e.g. pronunciation, which
Module 5 established is never reliably measured) into a headline score at
full weight. These tests prove compute_weighted_score excludes unreliable
components, renormalizes the rest, shows its work, and stays consistent.
"""
from app.services.scoring_engine import compute_weighted_score


def test_all_reliable_components_are_weighted_as_given():
    components = [
        {"name": "grammar", "score": 100.0, "weight": 0.5, "reliable": True},
        {"name": "vocabulary", "score": 50.0, "weight": 0.5, "reliable": True},
    ]
    result = compute_weighted_score(components)
    assert result["score"] == 75.0


def test_unreliable_component_is_excluded_and_weight_redistributed():
    components = [
        {"name": "grammar", "score": 100.0, "weight": 0.5, "reliable": True},
        {"name": "pronunciation", "score": 20.0, "weight": 0.5, "reliable": False},
    ]
    result = compute_weighted_score(components)
    # pronunciation's low score must NOT drag down the result at all —
    # grammar alone (renormalized to 100% weight) determines the score.
    assert result["score"] == 100.0
    assert "pronunciation" in result["excluded_components"]
    assert "grammar" in result["included_components"]


def test_weights_are_renormalized_not_just_zeroed_out():
    components = [
        {"name": "a", "score": 60.0, "weight": 0.3, "reliable": True},
        {"name": "b", "score": 80.0, "weight": 0.3, "reliable": True},
        {"name": "c", "score": 0.0, "weight": 0.4, "reliable": False},
    ]
    result = compute_weighted_score(components)
    # a and b each had equal weight (0.3), so after renormalizing among
    # just the reliable two, they should each contribute 50%.
    assert result["score"] == 70.0


def test_all_components_unreliable_returns_zero_not_a_fabricated_number():
    components = [
        {"name": "a", "score": 90.0, "weight": 0.5, "reliable": False},
        {"name": "b", "score": 90.0, "weight": 0.5, "reliable": False},
    ]
    result = compute_weighted_score(components)
    assert result["score"] == 0.0
    assert result["included_components"] == []


def test_formula_string_shows_the_real_numbers_used():
    components = [
        {"name": "grammar", "score": 90.0, "weight": 0.6, "reliable": True},
        {"name": "vocabulary", "score": 70.0, "weight": 0.4, "reliable": True},
    ]
    result = compute_weighted_score(components)
    assert "grammar=90.0" in result["formula"]
    assert "vocabulary=70.0" in result["formula"]


def test_formula_names_excluded_components():
    components = [
        {"name": "grammar", "score": 90.0, "weight": 0.5, "reliable": True},
        {"name": "pronunciation", "score": 40.0, "weight": 0.5, "reliable": False},
    ]
    result = compute_weighted_score(components)
    assert "pronunciation" in result["formula"]


def test_zero_total_weight_among_reliable_components_does_not_crash():
    # MODULE 11: a pathological all-zero-weight set must return a safe
    # score instead of raising ZeroDivisionError.
    components = [
        {"name": "a", "score": 90.0, "weight": 0.0, "reliable": True},
        {"name": "b", "score": 10.0, "weight": 0.0, "reliable": True},
    ]
    result = compute_weighted_score(components)
    assert result["score"] == 0.0


def test_score_is_always_within_zero_to_hundred():
    components = [
        {"name": "a", "score": 100.0, "weight": 1.0, "reliable": True},
    ]
    result = compute_weighted_score(components)
    assert 0.0 <= result["score"] <= 100.0


def test_deterministic_across_repeated_calls():
    components = [
        {"name": "grammar", "score": 82.5, "weight": 0.5, "reliable": True},
        {"name": "vocabulary", "score": 67.3, "weight": 0.5, "reliable": True},
    ]
    a = compute_weighted_score(components)
    b = compute_weighted_score(components)
    assert a == b
