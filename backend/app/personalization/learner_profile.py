"""
The dynamic learner profile: created at signup, read by every practice page,
and updated after every relevant session. This is the single object that
makes personalization possible — see weakness_detector.py and
exercise_generator.py, which both read from it.
"""
import uuid
from datetime import datetime, timezone

from app.database.store import get_document, upsert_document, read_collection
from app.personalization import weakness_detector
from app.schemas.common import SkillScores
from app.schemas.student import LearnerProfile

_COLLECTION = "learner_profiles"

# How many of the last N sessions a weakness must appear in before it's
# auto-added to the revision queue — see weakness_detector.track_mistake_repetition.
_REVISION_WINDOW = 5
_REVISION_THRESHOLD = 3


def compute_streak_days(practice_history: list[dict]) -> int:
    """Consecutive calendar days (ending today or yesterday) with at least
    one practice session — a real streak, not a session counter."""
    if not practice_history:
        return 0
    days = sorted({datetime.fromisoformat(h["timestamp"]).date() for h in practice_history if "timestamp" in h}, reverse=True)
    if not days:
        return 0
    today = datetime.now(timezone.utc).date()
    if (today - days[0]).days > 1:
        return 0  # most recent session was more than a day ago — streak broken
    streak = 1
    for i in range(1, len(days)):
        if (days[i - 1] - days[i]).days == 1:
            streak += 1
        else:
            break
    return streak


def create_profile(full_name: str, email: str, college: str, course: str, year: str, career_goal: str) -> LearnerProfile:
    student_id = str(uuid.uuid4())
    # A new student starts with a neutral baseline; the initial assessment
    # (see assessment_service.run_initial_assessment) overwrites these with
    # real measured scores within minutes of signup.
    baseline = SkillScores(
        grammar=55, vocabulary=55, fluency=50, speaking_pace=55,
        filler_words=55, confidence=50, pronunciation=55, response_structure=50,
    )
    profile = LearnerProfile(
        student_id=student_id,
        full_name=full_name,
        email=email,
        college=college,
        course=course,
        year=year,
        career_goal=career_goal,
        scores=baseline,
    )
    upsert_document(_COLLECTION, student_id, profile.model_dump(mode="json"))
    return profile


def get_profile(student_id: str) -> LearnerProfile | None:
    doc = get_document(_COLLECTION, student_id)
    return LearnerProfile.model_validate(doc) if doc else None


def get_or_create_demo_profile() -> LearnerProfile:
    """Used by routes that don't require real auth yet (frontend passes a
    fixed demo student_id) so the app is explorable without a full signup."""
    demo_id = "demo-student"
    existing = get_profile(demo_id)
    if existing:
        return existing
    profile = LearnerProfile(
        student_id=demo_id,
        full_name="Ananya Sharma",
        email="ananya.sharma@example.edu",
        college="Vellore Institute of Technology",
        course="B.Tech Computer Science",
        year="3rd Year",
        career_goal="Software Engineer",
        scores=SkillScores(grammar=71, vocabulary=78, fluency=66, speaking_pace=62, filler_words=58, confidence=69, pronunciation=80, response_structure=75),
    )
    upsert_document(_COLLECTION, demo_id, profile.model_dump(mode="json"))
    return profile


def update_scores(
    student_id: str,
    new_scores: dict[str, float],
    session_type: str,
    weight: float = 0.35,
    duration_minutes: float = 3.0,
) -> LearnerProfile:
    """
    Blends new session scores into the profile using an exponential moving
    average (weight = how much the new session influences the running
    average). This means the profile evolves after every session, as
    required, without one bad session overwhelming weeks of progress.

    Also recomputes weakness/strength labels and, per section 31 of the
    spec, feeds them into the revision-queue logic below: a weakness that
    shows up in most of the last few sessions gets auto-added to
    `revision_queue`; one that's cleared up for several sessions in a row
    gets removed.

    `duration_minutes` is real elapsed time when the caller has it (voice/
    interview sessions carry an actual recording duration) and a documented
    flat estimate otherwise (e.g. text practice, where typing time isn't
    tracked) — either way it's what actually gets summed into
    `total_practice_minutes`, not a placeholder increment.
    """
    profile = get_profile(student_id)
    if profile is None:
        raise ValueError(f"No learner profile for student_id={student_id}")

    current = profile.scores.model_dump()
    for key, value in new_scores.items():
        if key in current:
            current[key] = round(current[key] * (1 - weight) + value * weight, 1)
    profile.scores = SkillScores(**current)

    analysis = weakness_detector.detect(profile.scores)
    profile.weaknesses = analysis["weakness_labels"]
    profile.strengths = analysis["strength_labels"]

    profile.practice_history.append(
        {
            "type": session_type,
            "scores": new_scores,
            "profile_snapshot": current,  # full 8-metric profile state right after this session, for real trend charts
            "weaknesses_flagged": analysis["weakness_labels"],
            "minutes": duration_minutes,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    profile.total_practice_minutes += round(duration_minutes)
    profile.streak_days = compute_streak_days(profile.practice_history)

    for label in analysis["weakness_labels"]:
        if weakness_detector.track_mistake_repetition(profile.practice_history, label, _REVISION_WINDOW, _REVISION_THRESHOLD):
            if label not in profile.revision_queue:
                profile.revision_queue.append(label)

    # Drop a topic once it hasn't shown up as a weakness in the entire
    # recent window — i.e. it's been resolved for several sessions running.
    recent = profile.practice_history[-_REVISION_WINDOW:]
    profile.revision_queue = [
        topic for topic in profile.revision_queue if any(topic in s.get("weaknesses_flagged", []) for s in recent)
    ]

    upsert_document(_COLLECTION, student_id, profile.model_dump(mode="json"))
    return profile


def set_weaknesses_strengths(student_id: str, weaknesses: list[str], strengths: list[str]) -> LearnerProfile:
    profile = get_profile(student_id)
    if profile is None:
        raise ValueError(f"No learner profile for student_id={student_id}")
    profile.weaknesses = weaknesses
    profile.strengths = strengths
    upsert_document(_COLLECTION, student_id, profile.model_dump(mode="json"))
    return profile


def add_to_revision_queue(student_id: str, topic: str) -> LearnerProfile:
    profile = get_profile(student_id)
    if profile is None:
        raise ValueError(f"No learner profile for student_id={student_id}")
    if topic not in profile.revision_queue:
        profile.revision_queue.append(topic)
    upsert_document(_COLLECTION, student_id, profile.model_dump(mode="json"))
    return profile


def clear_from_revision_queue(student_id: str, topic: str) -> LearnerProfile:
    profile = get_profile(student_id)
    if profile is None:
        raise ValueError(f"No learner profile for student_id={student_id}")
    profile.revision_queue = [t for t in profile.revision_queue if t != topic]
    upsert_document(_COLLECTION, student_id, profile.model_dump(mode="json"))
    return profile


def mark_word_learned(student_id: str, word: str) -> LearnerProfile:
    profile = get_profile(student_id)
    if profile is None:
        raise ValueError(f"No learner profile for student_id={student_id}")
    if word not in profile.learned_words:
        profile.learned_words.append(word)
    upsert_document(_COLLECTION, student_id, profile.model_dump(mode="json"))
    return profile


def all_profiles() -> list[LearnerProfile]:
    return [LearnerProfile.model_validate(doc) for doc in read_collection(_COLLECTION).values()]
