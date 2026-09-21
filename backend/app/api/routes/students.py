from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_student_id
from app.schemas.student import LearnerProfile, ProfileUpdateRequest
from app.services import student_service

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/me", response_model=LearnerProfile)
def get_my_profile(student_id: str = Depends(get_current_student_id)):
    return student_service.get_profile(student_id)


@router.patch("/me", response_model=LearnerProfile)
def update_my_profile(payload: ProfileUpdateRequest, student_id: str = Depends(get_current_student_id)):
    return student_service.update_profile(student_id, payload)


@router.get("/me/weaknesses")
def get_my_weaknesses(student_id: str = Depends(get_current_student_id)):
    return student_service.weakness_report(student_id)


@router.get("/me/plan/today")
def get_today_plan(student_id: str = Depends(get_current_student_id)):
    return student_service.daily_plan(student_id)


@router.get("/me/plan/week")
def get_week_plan(student_id: str = Depends(get_current_student_id)):
    return student_service.week_plan(student_id)


@router.get("/me/recommendation")
def get_recommendation(student_id: str = Depends(get_current_student_id)):
    return student_service.next_recommendation(student_id)


@router.get("/me/revision-queue")
def get_revision_queue(student_id: str = Depends(get_current_student_id)):
    """Topics auto-added because they showed up as a weakness in most of the
    student's last few sessions (see learner_profile.update_scores) — cleared
    automatically once they stop appearing, per spec section 31."""
    return {"topics": student_service.get_profile(student_id).revision_queue}


@router.delete("/me/revision-queue/{topic}")
def clear_revision_topic(topic: str, student_id: str = Depends(get_current_student_id)):
    """Lets a student manually mark a topic reviewed instead of waiting for
    it to age out of the recent-session window."""
    return student_service.clear_revision_topic(student_id, topic)


@router.get("/me/analytics/trend")
def get_trend(student_id: str = Depends(get_current_student_id)):
    try:
        return student_service.analytics_trend(student_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/me/analytics/activity")
def get_activity(student_id: str = Depends(get_current_student_id)):
    try:
        return student_service.analytics_activity(student_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/me/achievements")
def get_achievements(student_id: str = Depends(get_current_student_id)):
    """Every value here is computed from the student's real profile — see
    app/personalization/achievements.py — not a static decorative list."""
    return student_service.achievements(student_id)


@router.post("/me/vocabulary/learned/{word}")
def mark_vocabulary_learned(word: str, student_id: str = Depends(get_current_student_id)):
    return student_service.mark_word_learned(student_id, word)
