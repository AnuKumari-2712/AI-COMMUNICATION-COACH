from datetime import datetime, timedelta, timezone

from app.personalization import learner_profile
from app.personalization.achievements import compute_achievements
from app.personalization.exercise_generator import generate_daily_plan, generate_week_plan
from app.personalization.recommendation_engine import recommend_next_activity
from app.personalization.weakness_detector import detect
from app.schemas.student import LearnerProfile, ProfileUpdateRequest, SignupRequest


def signup(payload: SignupRequest) -> LearnerProfile:
    return learner_profile.create_profile(
        full_name=payload.full_name,
        email=payload.email,
        college=payload.college,
        course=payload.course,
        year=payload.year,
        career_goal=payload.career_goal,
    )


def get_profile(student_id: str) -> LearnerProfile:
    profile = learner_profile.get_profile(student_id)
    if profile is None:
        # Demo/no-login mode: the frontend can call every endpoint with the
        # fixed "demo-student" id and get a fully working, realistic profile.
        profile = learner_profile.get_or_create_demo_profile()
    return profile


def update_profile(student_id: str, patch: ProfileUpdateRequest) -> LearnerProfile:
    profile = get_profile(student_id)
    update_data = patch.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
    from app.database.store import upsert_document

    upsert_document("learner_profiles", student_id, profile.model_dump(mode="json"))
    return profile


def weakness_report(student_id: str) -> dict:
    profile = get_profile(student_id)
    return detect(profile.scores)


def daily_plan(student_id: str) -> dict:
    profile = get_profile(student_id)
    return generate_daily_plan(profile)


def week_plan(student_id: str) -> list[dict]:
    profile = get_profile(student_id)
    return generate_week_plan(profile)


def next_recommendation(student_id: str) -> dict:
    profile = get_profile(student_id)
    return recommend_next_activity(profile)


def clear_revision_topic(student_id: str, topic: str) -> dict:
    profile = learner_profile.clear_from_revision_queue(student_id, topic)
    return {"topics": profile.revision_queue}


def achievements(student_id: str) -> list[dict]:
    profile = get_profile(student_id)
    return compute_achievements(profile)


def mark_word_learned(student_id: str, word: str) -> dict:
    profile = learner_profile.mark_word_learned(student_id, word)
    return {"learned_words": profile.learned_words}


def analytics_trend(student_id: str, max_points: int = 7) -> list[dict]:
    """
    Real trend data built from `profile_snapshot`s recorded in
    practice_history (see learner_profile.update_scores) — each snapshot is
    the full profile state right after that session, bucketed here into up
    to `max_points` groups in chronological order. Raises ValueError when
    there isn't enough history yet, so the caller (the API route) can 404
    and the frontend's existing mock-fallback path takes over — a fresh
    student with 0-1 sessions has no real trend to show.
    """
    profile = get_profile(student_id)
    snapshots = [h for h in profile.practice_history if "profile_snapshot" in h]
    if len(snapshots) < 2:
        raise ValueError("Not enough practice history yet for a real trend.")

    bucket_count = min(max_points, len(snapshots))
    buckets: list[list[dict]] = [[] for _ in range(bucket_count)]
    for i, snap in enumerate(snapshots):
        buckets[min(i * bucket_count // len(snapshots), bucket_count - 1)].append(snap["profile_snapshot"])

    points = []
    for i, bucket in enumerate(buckets):
        if not bucket:
            continue
        avg = {k: round(sum(s[k] for s in bucket) / len(bucket), 1) for k in bucket[0]}
        overall = round(sum(avg.values()) / len(avg), 1)
        points.append(
            {
                "label": f"Session {i + 1}",
                "overall": overall,
                "grammar": avg["grammar"],
                "vocabulary": avg["vocabulary"],
                "fluency": avg["fluency"],
                "confidence": avg["confidence"],
            }
        )
    return points


def analytics_activity(student_id: str, days: int = 7) -> list[dict]:
    """Real per-day practice time and session counts for the last `days`
    calendar days, aggregated from practice_history timestamps."""
    profile = get_profile(student_id)
    if not profile.practice_history:
        raise ValueError("No practice history yet.")

    today = datetime.now(timezone.utc).date()
    buckets = {(today - timedelta(days=offset)): {"minutes": 0.0, "sessions": 0} for offset in range(days - 1, -1, -1)}

    for entry in profile.practice_history:
        try:
            entry_date = datetime.fromisoformat(entry["timestamp"]).date()
        except (KeyError, ValueError):
            continue
        if entry_date in buckets:
            buckets[entry_date]["minutes"] += entry.get("minutes", 3.0)
            buckets[entry_date]["sessions"] += 1

    return [
        {"day": day.strftime("%a"), "minutes": round(data["minutes"]), "sessions": data["sessions"]}
        for day, data in buckets.items()
    ]
