from pydantic import BaseModel

from app.schemas.common import AnalysisSource


class InterviewCategory(BaseModel):
    id: str
    title: str
    description: str
    question_count: int
    duration_minutes: int
    difficulty: str


class InterviewStartRequest(BaseModel):
    student_id: str
    category_id: str
    job_role: str | None = None
    resume_text: str | None = None


class InterviewQuestion(BaseModel):
    id: str
    text: str
    stage: str


class InterviewStartResponse(BaseModel):
    session_id: str
    category_id: str
    questions: list[InterviewQuestion]


class InterviewAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str
    mode: str = "voice"  # "voice" | "text"
    duration_seconds: float | None = None


class AnswerStructureScore(BaseModel):
    introduction: float
    main_point: float
    supporting_explanation: float
    example: float
    conclusion: float


class InterviewAnswerResponse(BaseModel):
    source: AnalysisSource
    grammar_score: float
    vocabulary_score: float
    fluency_score: float
    confidence_score: float
    clarity_score: float
    structure: AnswerStructureScore
    structure_score: float
    filler_word_count: int
    feedback: str


class InterviewSubmitRequest(BaseModel):
    session_id: str


class InterviewResultResponse(BaseModel):
    overall: float
    communication: float
    confidence: float
    clarity: float
    grammar: float
    vocabulary: float
    structure: float
    fluency: float
    pronunciation: float
    went_well: list[str]
    needs_improvement: list[str]
    recommended_exercises: list[str]
