from pydantic import BaseModel, EmailStr

from app.schemas.common import DifficultyLevel, SkillScores


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    college: str
    course: str
    year: str
    career_goal: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: str


class LearnerProfile(BaseModel):
    """
    The dynamic learner profile — updated after every relevant practice
    session. This is the object the personalization engine reads from and
    writes to; see app/personalization/learner_profile.py.
    """

    student_id: str
    full_name: str
    email: EmailStr
    college: str
    course: str
    year: str
    career_goal: str
    current_level: DifficultyLevel = DifficultyLevel.medium
    scores: SkillScores
    weaknesses: list[str] = []
    strengths: list[str] = []
    revision_queue: list[str] = []
    practice_history: list[dict] = []
    learned_words: list[str] = []
    streak_days: int = 0
    total_practice_minutes: int = 0


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    college: str | None = None
    course: str | None = None
    year: str | None = None
    career_goal: str | None = None
