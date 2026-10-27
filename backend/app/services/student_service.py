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
    from app.api.deps import DEMO_STUDENT_ID

    profile = learner_profile.get_profile(student_id)
    if profile is None:
        if student_id == DEMO_STUDENT_ID:
            # Unauthenticated / demo mode: return the shared demo profile.
            profile = learner_profile.get_or_create_demo_profile()
        else:
            # A real token resolved to a student_id we don't have a profile for.
            # This should not happen in normal operation (signup always creates
            # one), but guard against it rather than showing demo data.
            raise ValueError(f"No learner profile found for student_id={student_id!r}")
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
    to `max_points` groups in chronological order.
    """
    profile = get_profile(student_id)
    snapshots = [h for h in profile.practice_history if "profile_snapshot" in h]
    if len(snapshots) < 2:
        if len(snapshots) == 1:
            snap = snapshots[0]["profile_snapshot"]
            active_vals = [v for v in snap.values() if v > 0]
            overall = round(sum(active_vals) / len(active_vals), 1) if active_vals else profile.scores.overall
            return [{
                "label": "Session 1",
                "overall": overall,
                "grammar": snap.get("grammar", 0.0),
                "vocabulary": snap.get("vocabulary", 0.0),
                "fluency": snap.get("fluency", 0.0),
                "confidence": snap.get("confidence", 0.0),
            }]
        return [{
            "label": "Baseline",
            "overall": profile.scores.overall,
            "grammar": profile.scores.grammar,
            "vocabulary": profile.scores.vocabulary,
            "fluency": profile.scores.fluency,
            "confidence": profile.scores.confidence,
        }]

    bucket_count = min(max_points, len(snapshots))
    buckets: list[list[dict]] = [[] for _ in range(bucket_count)]
    for i, snap in enumerate(snapshots):
        buckets[min(i * bucket_count // len(snapshots), bucket_count - 1)].append(snap)

    points = []
    for i, bucket in enumerate(buckets):
        if not bucket:
            continue
        snap_objs = [s["profile_snapshot"] for s in bucket]
        avg = {k: round(sum(s[k] for s in snap_objs) / len(snap_objs), 1) for k in snap_objs[0]}
        active_vals = [v for v in avg.values() if v > 0]
        overall = round(sum(active_vals) / len(active_vals), 1) if active_vals else 0.0

        last_entry = bucket[-1]
        raw_ts = last_entry.get("timestamp")
        label = f"Session {i + 1}"
        if raw_ts:
            try:
                clean_ts = raw_ts.replace("Z", "+00:00") if isinstance(raw_ts, str) else raw_ts
                dt = datetime.fromisoformat(clean_ts) if isinstance(clean_ts, str) else clean_ts
                label = dt.strftime("%b %d")
            except Exception:
                pass

        points.append(
            {
                "label": label,
                "overall": overall,
                "grammar": avg.get("grammar", 0.0),
                "vocabulary": avg.get("vocabulary", 0.0),
                "fluency": avg.get("fluency", 0.0),
                "confidence": avg.get("confidence", 0.0),
            }
        )
    return points


def analytics_activity(student_id: str, days: int = 7) -> list[dict]:
    """Real per-day practice time and session counts for the last `days`
    calendar days, aggregated from practice_history timestamps."""
    profile = get_profile(student_id)
    today = datetime.now(timezone.utc).date()
    buckets = {(today - timedelta(days=offset)): {"minutes": 0.0, "sessions": 0} for offset in range(days - 1, -1, -1)}

    for entry in profile.practice_history:
        ts = entry.get("timestamp")
        if not ts:
            continue
        try:
            clean_ts = ts.replace("Z", "+00:00") if isinstance(ts, str) else ts
            entry_date = (datetime.fromisoformat(clean_ts) if isinstance(clean_ts, str) else clean_ts).date()
        except (KeyError, ValueError, AttributeError):
            continue
        if entry_date in buckets:
            buckets[entry_date]["minutes"] += entry.get("minutes", 3.0)
            buckets[entry_date]["sessions"] += 1

    return [
        {"day": day.strftime("%a"), "minutes": round(data["minutes"]), "sessions": data["sessions"]}
        for day, data in buckets.items()
    ]

