"""
Single "what should I do right now" recommendation, with an explanation —
required so the student understands WHY the system picked this exercise
(current weaknesses, recent trend, career goal), not just what to do.
"""
from app.personalization.exercise_generator import SKILL_TO_EXERCISE, recent_trend
from app.personalization.weakness_detector import detect
from app.schemas.student import LearnerProfile


def recommend_next_activity(profile: LearnerProfile) -> dict:
    analysis = detect(profile.scores)
    trend = recent_trend(profile.practice_history)

    if profile.revision_queue:
        topic = profile.revision_queue[0]
        return {
            "title": f"Review: {topic}",
            "type": "revision",
            "reason": (
                f"You've repeated this mistake in recent sessions, so it's in your revision queue. "
                f"Clearing it now prevents it from becoming a habit."
            ),
        }

    if not analysis["weaknesses"]:
        return {
            "title": "Mock Interview — Push Your Level Further",
            "type": "interview",
            "reason": "All your tracked skills are currently above your own average — a full mock interview is the best way to find the next thing to improve.",
        }

    top_weakness = analysis["weaknesses"][0]
    exercise = SKILL_TO_EXERCISE[top_weakness["skill"]]
    trend_note = "declining recently" if trend < -0.1 else "stable" if trend < 0.1 else "improving"

    reason = (
        f"{top_weakness['label']} is your lowest-scoring skill ({top_weakness['score']}/100) and has been {trend_note}. "
        f"Targeting it now, before it compounds into interview performance, gives you the fastest overall improvement "
        f"given your goal of {profile.career_goal}."
    )
    return {"title": exercise["title"], "type": exercise["type"], "reason": reason}
