"""
Turns "these are the student's weaknesses at this difficulty level" into an
actual list of exercises. This is what guarantees no two students see the
same plan: the exercise mix is a direct function of their own weakness list
and their own predicted difficulty level.
"""
from app.ml.difficulty_model import predict_difficulty
from app.personalization.weakness_detector import detect
from app.schemas.student import LearnerProfile

SKILL_TO_EXERCISE = {
    "grammar": {"type": "grammar", "title": "Grammar Drill — targeted at your recent mistakes", "minutes": 10},
    "vocabulary": {"type": "vocabulary", "title": "Vocabulary Builder", "minutes": 10},
    "fluency": {"type": "fluency", "title": "Fluency Speaking Sprint", "minutes": 12},
    "speaking_pace": {"type": "fluency", "title": "Pacing Drill (steady 130-160 WPM)", "minutes": 8},
    "filler_words": {"type": "fluency", "title": "Controlled Speaking — pause instead of filler", "minutes": 8},
    "confidence": {"type": "speaking", "title": "Confidence-Building Speaking Exercise", "minutes": 10},
    "pronunciation": {"type": "speaking", "title": "Pronunciation Practice", "minutes": 8},
    "response_structure": {"type": "interview", "title": "STAR-Structure Interview Drill", "minutes": 15},
}

_TREND_WINDOW = 5


def recent_trend(history: list[dict]) -> float:
    if len(history) < 2:
        return 0.0
    recent = history[-_TREND_WINDOW:]
    overalls = []
    for session in recent:
        session_scores = session.get("scores", {})
        if session_scores:
            overalls.append(sum(session_scores.values()) / len(session_scores))
    if len(overalls) < 2:
        return 0.0
    delta = overalls[-1] - overalls[0]
    return max(-1.0, min(1.0, delta / 30))


def consistency_score(history: list[dict]) -> float:
    recent = history[-_TREND_WINDOW:]
    overalls = [sum(s["scores"].values()) / len(s["scores"]) for s in recent if s.get("scores")]
    if len(overalls) < 2:
        return 60.0
    mean = sum(overalls) / len(overalls)
    variance = sum((o - mean) ** 2 for o in overalls) / len(overalls)
    return max(0.0, 100.0 - variance)


def generate_daily_plan(profile: LearnerProfile, max_tasks: int = 4) -> dict:
    analysis = detect(profile.scores)
    trend = recent_trend(profile.practice_history)
    consistency = consistency_score(profile.practice_history)
    mean_score = analysis["mean_score"]
    difficulty = predict_difficulty(mean_score, trend, consistency)

    weak_skills = [w["skill"] for w in analysis["weaknesses"]]
    # Always cover at least the top 2 weaknesses; fill remaining slots with
    # the next-weakest skills so a student with only 1 flagged weakness
    # still gets a full, varied plan rather than repeating one drill.
    ordered_skills = weak_skills + [s for s in SKILL_TO_EXERCISE if s not in weak_skills]

    tasks = []
    seen_types = set()
    for skill in ordered_skills:
        if len(tasks) >= max_tasks:
            break
        exercise = SKILL_TO_EXERCISE[skill]
        if exercise["type"] in seen_types and skill not in weak_skills:
            continue
        tasks.append({**exercise, "skill": skill, "difficulty": difficulty.value})
        seen_types.add(exercise["type"])

    return {
        "difficulty": difficulty.value,
        "mean_score": mean_score,
        "trend": round(trend, 2),
        "weaknesses": analysis["weakness_labels"],
        "strengths": analysis["strength_labels"],
        "tasks": tasks,
    }


def generate_week_plan(profile: LearnerProfile) -> list[dict]:
    base_plan = generate_daily_plan(profile, max_tasks=4)
    days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
    focuses = base_plan["weaknesses"][:3] or ["General Communication"]
    week = []
    for i, day in enumerate(days):
        # Rotate which weakness leads each day so the week has variety while
        # still targeting the same underlying weakness list all week.
        lead_focus = focuses[i % len(focuses)]
        week.append({"day": day, "focus": lead_focus, "tasks": base_plan["tasks"]})
    return week
