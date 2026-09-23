"""
MODULE 10 (see AUDIT.md): scoring transparency — a single, shared,
documented way to combine individual verified metrics into a composite
score with explicit, shown weights, instead of each caller inventing its
own ad-hoc average.

Two real problems existed before this module:
1. Text assessment's `overall` score used grammar/vocabulary/structure/
   clarity with hardcoded weights and no formula shown to the caller, and
   never included `relevance_score` (added in Module 7) at all — a
   completely off-topic answer with good grammar could still get a high
   `overall`.
2. The interview's `overall` score averaged `communication` (itself an
   unweighted average of grammar/vocabulary/clarity/structure) together
   with `fluency`, `confidence`, and **`pronunciation`** — even though
   Module 5 established that pronunciation is *never* reliably measured
   in this project (`pronunciation_reliable` is always `False`). An
   unreliable, admittedly-fabricatable-looking number was still being
   blended into the headline score with full weight.

`compute_weighted_score` fixes both generically: any component marked
`reliable=False` (or missing `sufficient_data`) is EXCLUDED from the
weighted average, and the remaining components' weights are renormalized
to sum to 1.0, rather than either (a) silently including an unreliable
number at full weight, or (b) silently dropping it with no explanation.
The `formula` string returned makes every calculation checkable by hand.
"""


def compute_weighted_score(components: list[dict]) -> dict:
    """
    components: list of {"name": str, "score": float, "weight": float, "reliable": bool}.
    `weight` values should sum to ~1.0 across the full intended set, but
    this function renormalizes among whichever components are `reliable`,
    so the caller doesn't need to special-case missing/unreliable inputs.
    """
    included = [c for c in components if c["reliable"]]
    excluded = [c["name"] for c in components if not c["reliable"]]

    if not included:
        return {
            "score": 0.0,
            "formula": "No reliable component scores were available to compute this composite.",
            "included_components": [],
            "excluded_components": excluded,
        }

    # MODULE 11 (see AUDIT.md): a total_weight of 0 (every reliable
    # component happening to carry weight 0.0) would otherwise divide by
    # zero here and crash the request instead of returning a score. No
    # current caller passes an all-zero-weight set, but this is the shared
    # engine behind both headline `overall` scores, so it must not be able
    # to produce a NaN/crash regardless of what future callers pass in.
    total_weight = sum(c["weight"] for c in included)
    if total_weight <= 0:
        return {
            "score": 0.0,
            "formula": "All reliable components had zero total weight — no meaningful composite could be computed.",
            "included_components": [],
            "excluded_components": [c["name"] for c in components],
        }

    score = round(sum(c["score"] * (c["weight"] / total_weight) for c in included), 1)
    score = max(0.0, min(100.0, score))

    parts = ", ".join(
        f"{c['name']}={c['score']}*{round(c['weight'] / total_weight * 100, 1)}%" for c in included
    )
    formula = f"overall = {parts}"
    if excluded:
        formula += f" (excluded as unreliable/insufficient data, weight redistributed among the rest: {', '.join(excluded)})"

    return {
        "score": score,
        "formula": formula,
        "included_components": [c["name"] for c in included],
        "excluded_components": excluded,
    }
