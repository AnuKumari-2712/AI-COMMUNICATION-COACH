from typing import Literal

from pydantic import BaseModel, Field

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
    # MODULE 11 (see AUDIT.md): explicit bounds reject an impossible
    # component score at the API boundary instead of silently serving it.
    introduction: float = Field(ge=0, le=100)
    main_point: float = Field(ge=0, le=100)
    supporting_explanation: float = Field(ge=0, le=100)
    example: float = Field(ge=0, le=100)
    conclusion: float = Field(ge=0, le=100)


class InterviewAnswerResponse(BaseModel):
    source: AnalysisSource
    grammar_score: float = Field(ge=0, le=100)
    vocabulary_score: float = Field(ge=0, le=100)
    fluency_score: float = Field(ge=0, le=100)
    # MODULE 4: whether fluency_score came from real speech timing
    # (compute_speech_metrics, voice mode with a real duration) or a
    # text-only proxy (text_flow_consistency) — see interview_service.py.
    fluency_source: Literal["speech_measured", "text_estimated"] = "text_estimated"
    confidence_score: float = Field(ge=0, le=100)
    clarity_score: float = Field(ge=0, le=100)
    structure: AnswerStructureScore
    structure_score: float = Field(ge=0, le=100)
    filler_word_count: int = Field(ge=0)
    # MODULE 7: keyword/lemma-overlap relevance between this question and
    # this answer — see relevance_analysis.py::analyze_relevance. Not true
    # semantic understanding; addressed/missing_keywords are the evidence.
    relevance_score: float = Field(default=0.0, ge=0, le=100)
    relevance_addressed_keywords: list[str] = []
    relevance_missing_keywords: list[str] = []
    relevance_sufficient_data: bool = True
    # MODULE 8: only the fixed technical-interview questions have a known
    # concept checklist to verify against — see technical_knowledge.py.
    # applicable=False for any question without one (dynamic resume/job-role
    # questions, or non-technical categories), never a fabricated verdict.
    technical_applicable: bool = False
    technical_verdict: Literal["correct", "partially_correct", "incorrect", "insufficient"] | None = None
    technical_matched_concepts: list[str] = []
    technical_missing_concepts: list[str] = []
    technical_explanation: str = ""
    # MODULE 9: a real follow-up question generated from something specific
    # in THIS answer (see followup_generator.py) — None when the answer had
    # nothing specific enough to follow up on, rather than a generic,
    # disconnected question.
    followup_question: InterviewQuestion | None = None
    feedback: str


class InterviewSubmitRequest(BaseModel):
    session_id: str


class InterviewResultResponse(BaseModel):
    # MODULE 11: explicit bounds on every composite/component score and
    # ge=0 on every count — see the equivalent note on TextAnalysisResponse.
    overall: float = Field(ge=0, le=100)
    communication: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=100)
    clarity: float = Field(ge=0, le=100)
    grammar: float = Field(ge=0, le=100)
    vocabulary: float = Field(ge=0, le=100)
    structure: float = Field(ge=0, le=100)
    fluency: float = Field(ge=0, le=100)
    pronunciation: float = Field(ge=0, le=100)
    # MODULE 5: pronunciation is a transcript-only proxy, never a real
    # audio-based measurement — see speech_metrics.py::pronunciation_proxy.
    pronunciation_reliable: bool = False
    pronunciation_method: str = ""
    # MODULE 7: average per-answer relevance score (see InterviewAnswerResponse
    # above). MODULE 10 folds this into `overall` (see below).
    relevance: float = Field(default=0.0, ge=0, le=100)
    relevance_sufficient_data: bool = True
    # MODULE 8: counts across only the answers where a verified concept
    # checklist existed (technical_evaluated_count) — see technical_knowledge.py.
    technical_evaluated_count: int = Field(default=0, ge=0)
    technical_correct_count: int = Field(default=0, ge=0)
    technical_partially_correct_count: int = Field(default=0, ge=0)
    technical_incorrect_count: int = Field(default=0, ge=0)
    technical_insufficient_count: int = Field(default=0, ge=0)
    # MODULE 10 transparency — see scoring_engine.py::compute_weighted_score.
    # `overall`/`communication` are now documented, reproducible weighted
    # blends; pronunciation is never a candidate component (see
    # interview_service.py — Module 5 established it's never reliably
    # measured here), and relevance is excluded from `overall` (weight
    # redistributed) when the session's questions had too few identifiable
    # keywords to judge relevance confidently.
    overall_score_formula: str = ""
    overall_excluded_components: list[str] = []
    communication_score_formula: str = ""
    went_well: list[str]
    needs_improvement: list[str]
    recommended_exercises: list[str]
