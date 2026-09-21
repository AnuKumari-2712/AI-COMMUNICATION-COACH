"""
Achievements computed from the student's actual learner profile — not a
static decorative list. Every `progress`/`unlocked` value below is derived
from real fields (streak_days, practice_history, learned_words, scores),
so two students genuinely see different unlock states.
"""
from app.schemas.student import LearnerProfile

_DEFINITIONS = [
    {"id": "a1", "title": "7 Day Streak", "description": "Practiced for 7 consecutive days.", "icon": "flame", "tier": "bronze"},
    {"id": "a2", "title": "100 Words Learned", "description": "Mastered 100 vocabulary words.", "icon": "book-open", "tier": "silver"},
    {"id": "a3", "title": "First Interview", "description": "Completed your first mock interview.", "icon": "briefcase", "tier": "bronze"},
    {"id": "a4", "title": "10 Speaking Sessions", "description": "Completed 10 voice practice sessions.", "icon": "mic", "tier": "silver"},
    {"id": "a5", "title": "Grammar Master", "description": "Scored 90+ on grammar 5 times.", "icon": "graduation-cap", "tier": "gold"},
    {"id": "a6", "title": "Fluency Improvement", "description": "Improved fluency score by 20 points.", "icon": "trending-up", "tier": "gold"},
    {"id": "a7", "title": "30 Day Streak", "description": "Practiced for 30 consecutive days.", "icon": "flame", "tier": "platinum"},
    {"id": "a8", "title": "Confidence Champion", "description": "Reached 85+ confidence score.", "icon": "shield", "tier": "gold"},
]


def _session_count(history: list[dict], session_type: str) -> int:
    return sum(1 for h in history if h.get("type") == session_type)


def _grammar_90_count(history: list[dict]) -> int:
    return sum(1 for h in history if h.get("scores", {}).get("grammar", 0) >= 90)


def _fluency_improvement(history: list[dict]) -> float:
    snapshots = [h["profile_snapshot"]["fluency"] for h in history if "profile_snapshot" in h]
    if len(snapshots) < 2:
        return 0.0
    return max(0.0, snapshots[-1] - snapshots[0])


def compute_achievements(profile: LearnerProfile) -> list[dict]:
    history = profile.practice_history
    progress_by_id = {
        "a1": min(profile.streak_days, 7),
        "a2": min(len(profile.learned_words), 100),
        "a3": min(_session_count(history, "interview"), 1),
        "a4": min(_session_count(history, "voice_practice"), 10),
        "a5": min(_grammar_90_count(history), 5),
        "a6": min(_fluency_improvement(history), 20),
        "a7": min(profile.streak_days, 30),
        "a8": min(profile.scores.confidence, 85),
    }
    target_by_id = {"a1": 7, "a2": 100, "a3": 1, "a4": 10, "a5": 5, "a6": 20, "a7": 30, "a8": 85}

    achievements = []
    for definition in _DEFINITIONS:
        aid = definition["id"]
        progress = round(progress_by_id[aid], 1)
        target = target_by_id[aid]
        achievements.append({**definition, "progress": progress, "target": target, "unlocked": progress >= target})
    return achievements
