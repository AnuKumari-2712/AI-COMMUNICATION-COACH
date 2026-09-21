"""
Weakness/strength detection — the input every downstream personalization
decision (exercise selection, difficulty, recommendations) is built on.

A skill counts as a weakness if it's both below an absolute floor (65) AND
meaningfully below the student's own average — this avoids labeling a
uniformly strong student's "worst" skill as a weakness just because it's
relatively lower, and avoids ignoring a genuinely weak skill just because
everything else is weak too.
"""
from app.schemas.common import SkillScores

_LABELS = {
    "grammar": "Grammar",
    "vocabulary": "Vocabulary",
    "fluency": "Fluency",
    "speaking_pace": "Speaking Pace",
    "filler_words": "Filler Word Control",
    "confidence": "Communication Confidence",
    "pronunciation": "Pronunciation",
    "response_structure": "Response Structure",
}

ABSOLUTE_WEAKNESS_FLOOR = 65.0
RELATIVE_MARGIN = 6.0
ABSOLUTE_STRENGTH_CEILING = 80.0


def detect(scores: SkillScores) -> dict:
    values = scores.model_dump()
    mean_score = sum(values.values()) / len(values)

    weaknesses = []
    strengths = []
    for key, value in values.items():
        if value < ABSOLUTE_WEAKNESS_FLOOR and value < mean_score - RELATIVE_MARGIN:
            weaknesses.append({"skill": key, "label": _LABELS[key], "score": value})
        elif value >= ABSOLUTE_STRENGTH_CEILING and value > mean_score + RELATIVE_MARGIN:
            strengths.append({"skill": key, "label": _LABELS[key], "score": value})

    weaknesses.sort(key=lambda w: w["score"])
    strengths.sort(key=lambda s: -s["score"])

    return {
        "mean_score": round(mean_score, 1),
        "weaknesses": weaknesses,
        "strengths": strengths,
        "weakness_labels": [w["label"] for w in weaknesses],
        "strength_labels": [s["label"] for s in strengths],
    }


def track_mistake_repetition(history: list[dict], topic: str, window: int = 5, threshold: int = 3) -> bool:
    """Returns True if `topic` shows up as a flagged weakness in at least
    `threshold` of the last `window` practice sessions — the trigger for
    adding it to the revision queue (see recommendation_engine.py)."""
    recent = history[-window:]
    occurrences = sum(1 for session in recent if topic in session.get("weaknesses_flagged", []))
    return occurrences >= threshold
