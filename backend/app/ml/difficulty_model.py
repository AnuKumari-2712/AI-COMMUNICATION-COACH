"""
Adaptive difficulty engine — a real scikit-learn classifier, not a lookup
table.

There's no historical performance dataset yet (this is a fresh project), so
we bootstrap one: `_synthetic_training_data()` generates labeled examples
from the same domain rule a human coach would use (strong + improving ->
raise difficulty, weak + declining -> lower it), with random noise so the
model has to actually learn the boundary rather than memorize it. A
`RandomForestClassifier` is trained on that data once, at process start, and
cached.

This is the intended replacement point: once real practice-session outcomes
are logged (see `learner_profile.py`'s `practice_history`), swap
`_synthetic_training_data()` for a query against that history and retrain
periodically. Nothing else in the codebase needs to change — callers only
see `predict_difficulty(features) -> DifficultyLevel`.
"""
import logging
from functools import lru_cache

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from app.schemas.common import DifficultyLevel

logger = logging.getLogger(__name__)

_LEVELS = [DifficultyLevel.beginner, DifficultyLevel.easy, DifficultyLevel.medium, DifficultyLevel.hard, DifficultyLevel.advanced]


def _label_from_rule(avg_score: float, trend: float, consistency: float) -> str:
    adjusted = avg_score + trend * 15 + (consistency - 50) * 0.1
    if adjusted < 40:
        return DifficultyLevel.beginner.value
    if adjusted < 55:
        return DifficultyLevel.easy.value
    if adjusted < 70:
        return DifficultyLevel.medium.value
    if adjusted < 85:
        return DifficultyLevel.hard.value
    return DifficultyLevel.advanced.value


def _synthetic_training_data(n_samples: int = 1200, seed: int = 42):
    rng = np.random.default_rng(seed)
    avg_scores = rng.uniform(10, 100, n_samples)
    trends = rng.uniform(-1, 1, n_samples)  # -1 = sharply declining, +1 = sharply improving
    consistency = rng.uniform(0, 100, n_samples)

    X = np.column_stack([avg_scores, trends, consistency])
    y = np.array([_label_from_rule(a, t, c) for a, t, c in zip(avg_scores, trends, consistency)])
    return X, y


@lru_cache
def _get_model() -> RandomForestClassifier:
    X, y = _synthetic_training_data()
    model = RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42)
    model.fit(X, y)
    logger.info("Adaptive difficulty RandomForestClassifier trained on %d synthetic samples.", len(y))
    return model


def predict_difficulty(avg_score: float, recent_trend: float, consistency: float) -> DifficultyLevel:
    """
    avg_score: 0-100 average of the student's recent skill scores.
    recent_trend: -1..1, negative if scores have been falling, positive if rising.
    consistency: 0-100, how stable scores have been session-to-session.
    """
    model = _get_model()
    prediction = model.predict(np.array([[avg_score, recent_trend, consistency]]))[0]
    return DifficultyLevel(prediction)


def difficulty_confidence(avg_score: float, recent_trend: float, consistency: float) -> dict[str, float]:
    model = _get_model()
    proba = model.predict_proba(np.array([[avg_score, recent_trend, consistency]]))[0]
    return {label: round(float(p), 3) for label, p in zip(model.classes_, proba)}
