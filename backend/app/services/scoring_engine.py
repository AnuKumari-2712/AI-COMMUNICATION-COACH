"""
Scoring transparency engine.
Combines verified skill metrics into a weighted composite score with transparent, re-normalized weights.
"""


def compute_weighted_score(components: list[dict]) -> dict:
    """
    components: list of {"name": str, "score": float, "weight": float, "reliable": bool}.
    Renormalizes weights among whichever components are reliable.
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

    # Avoid division by zero if all weights are zero
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
