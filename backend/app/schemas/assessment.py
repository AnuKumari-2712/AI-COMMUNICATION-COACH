from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import AnalysisSource


class TextAnalysisRequest(BaseModel):
    student_id: str
    question: str
    answer: str


class GrammarCorrection(BaseModel):
    original: str
    corrected: str
    reason: str
    rule: str
    # MODULE 1: category determines whether this issue affects grammar_score
    # at all (only "grammar" does — spelling/style never do); confidence
    # marks issues the checker can't be fully certain about (e.g. tense
    # mixing, which can be correct reported speech) so they're shown as
    # uncertain rather than confidently "wrong". See grammar_rules.py.
    category: Literal["grammar", "spelling", "style"] = "grammar"
    confidence: Literal["high", "medium"] = "high"
    sentence: str = ""


class TextAnalysisResponse(BaseModel):
    source: AnalysisSource
    score: float
    grammar_score: float = Field(ge=0, le=100)
    vocabulary_score: float
    structure_score: float
    clarity_score: float
    corrections: list[GrammarCorrection]
    vocabulary_suggestions: list[str]
    repeated_words: list[str]
    better_alternative: str
    word_count: int
    # MODULE 1 transparency fields — lets a caller verify grammar_score by
    # hand instead of trusting it blindly. See grammar_rules.py::analyze().
    grammar_issue_count: int = 0
    spelling_issue_count: int = 0
    style_issue_count: int = 0
    grammar_score_formula: str = ""
    grammar_sufficient_data: bool = True


class VoiceAnalysisRequest(BaseModel):
    student_id: str
    duration_seconds: float


class VoiceAnalysisResponse(BaseModel):
    source: AnalysisSource
    transcript: str
    grammar_score: float
    vocabulary_score: float
    fluency_score: float
    pronunciation_score: float
    confidence_score: float
    words_per_minute: float
    pace_score: float
    pace_consistency: float
    filler_word_count: int
    filler_words_per_minute: float
    most_frequent_filler: str | None
    pause_count: int
    average_pause_seconds: float


class ExplainMistakeRequest(BaseModel):
    original: str
    corrected: str
    rule: str


class ExplainMistakeResponse(BaseModel):
    what_was_wrong: str
    why_it_was_wrong: str
    how_to_improve: str
    practice_question: str
