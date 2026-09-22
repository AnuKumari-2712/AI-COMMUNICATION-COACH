from typing import Literal

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
    # MODULE 4: whether fluency_score came from real speech timing
    # (compute_speech_metrics, voice mode with a real duration) or a
    # text-only proxy (text_flow_consistency) — see interview_service.py.
    fluency_source: Literal["speech_measured", "text_estimated"] = "text_estimated"
    confidence_score: float
    clarity_score: float
    structure: AnswerStructureScore
    structure_score: float
    filler_word_count: int
    # MODULE 7: keyword/lemma-overlap relevance between this question and
    # this answer — see relevance_analysis.py::analyze_relevance. Not true
    # semantic understanding; addressed/missing_keywords are the evidence.
    relevance_score: float = 0.0
    relevance_addressed_keywords: list[str] = []
    relevance_missing_keywords: list[str] = []
    relevance_sufficient_data: bool = True
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
    # MODULE 5: pronunciation is a transcript-only proxy, never a real
    # audio-based measurement — see speech_metrics.py::pronunciation_proxy.
    pronunciation_reliable: bool = False
    pronunciation_method: str = ""
    # MODULE 7: average per-answer relevance score (see InterviewAnswerResponse
    # above). Not yet folded into `overall`/`communication` — see Module 10
    # (scoring transparency/reweighting) in AUDIT.md for that follow-on step.
    relevance: float = 0.0
    relevance_sufficient_data: bool = True
    went_well: list[str]
    needs_improvement: list[str]
    recommended_exercises: list[str]
