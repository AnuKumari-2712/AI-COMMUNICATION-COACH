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
    # MODULE 11 (see AUDIT.md): score-like fields below carry explicit
    # ge=0/le=100 bounds (and counts carry ge=0) so a computation bug that
    # ever produced an impossible value (negative, >100, NaN) is rejected
    # by pydantic at the API boundary instead of being silently served.
    score: float = Field(ge=0, le=100)
    grammar_score: float = Field(ge=0, le=100)
    vocabulary_score: float = Field(ge=0, le=100)
    structure_score: float = Field(ge=0, le=100)
    clarity_score: float = Field(ge=0, le=100)
    corrections: list[GrammarCorrection]
    vocabulary_suggestions: list[str]
    repeated_words: list[str]
    better_alternative: str
    word_count: int = Field(ge=0)
    # MODULE 1 transparency fields — lets a caller verify grammar_score by
    # hand instead of trusting it blindly. See grammar_rules.py::analyze().
    grammar_issue_count: int = Field(default=0, ge=0)
    spelling_issue_count: int = Field(default=0, ge=0)
    style_issue_count: int = Field(default=0, ge=0)
    grammar_score_formula: str = ""
    grammar_sufficient_data: bool = True
    # MODULE 2 transparency fields — see text_analysis.py::vocabulary_analysis().
    # lexical_diversity is Herdan's C (length-stable); sufficient_data is
    # false for short answers where diversity measures are statistically
    # unreliable, so the score should be treated as a low-confidence estimate.
    lexical_diversity: float = Field(default=0.0, ge=0, le=1)
    content_word_count: int = Field(default=0, ge=0)
    vocabulary_score_formula: str = ""
    vocabulary_sufficient_data: bool = True
    # MODULE 7 transparency fields — see relevance_analysis.py::analyze_relevance.
    # This is keyword/lemma-overlap between question and answer, NOT semantic
    # understanding of whether the content actually answers the question.
    relevance_score: float = Field(default=0.0, ge=0, le=100)
    relevance_addressed_keywords: list[str] = []
    relevance_missing_keywords: list[str] = []
    relevance_score_formula: str = ""
    relevance_sufficient_data: bool = True
    # MODULE 10 transparency — see scoring_engine.py::compute_weighted_score.
    # `score` above is now a documented, reproducible weighted blend of
    # grammar/vocabulary/structure/clarity/relevance; any component whose
    # own analysis flagged insufficient data is excluded here (weight
    # redistributed among the rest) rather than silently included.
    overall_score_formula: str = ""
    overall_excluded_components: list[str] = []


class VoiceAnalysisRequest(BaseModel):
    student_id: str
    duration_seconds: float


class VoiceAnalysisResponse(BaseModel):
    source: AnalysisSource
    transcript: str
    # MODULE 11: see the equivalent note on TextAnalysisResponse above —
    # explicit bounds reject an impossible score/count at the API boundary.
    grammar_score: float = Field(ge=0, le=100)
    vocabulary_score: float = Field(ge=0, le=100)
    fluency_score: float = Field(ge=0, le=100)
    pronunciation_score: float = Field(ge=0, le=100)
    confidence_score: float = Field(ge=0, le=100)
    words_per_minute: float = Field(ge=0)
    pace_score: float = Field(ge=0, le=100)
    pace_consistency: float = Field(ge=0, le=100)
    filler_word_count: int = Field(ge=0)
    filler_words_per_minute: float = Field(ge=0)
    most_frequent_filler: str | None
    pause_count: int = Field(ge=0)
    average_pause_seconds: float = Field(ge=0)
    # MODULE 3 transparency (see grammar/vocabulary equivalents above)
    high_confidence_filler_count: int = Field(default=0, ge=0)
    ambiguous_filler_count: int = Field(default=0, ge=0)
    filler_excluded_examples: list[str] = []
    # MODULE 4 transparency: raw measurements behind words_per_minute/pace,
    # and whether pause data is real (measured from WAV audio) or a
    # transcript-based estimate. See speech_metrics.py::compute_speech_metrics.
    word_count: int = Field(default=0, ge=0)
    reference_range_wpm: str = "130-160"
    pace_source: Literal["measured", "estimated"] = "estimated"
    # MODULE 5: pronunciation_score is a transcript-only proxy (no audio
    # phoneme analysis exists in this project) — always reliable=False, with
    # method explaining exactly what it is and is not. See speech_metrics.py::pronunciation_proxy.
    pronunciation_reliable: bool = False
    pronunciation_method: str = ""
    fluency_formula: str = ""
    # Where the transcript came from: "browser" = recognized by the user's
    # browser, "server" = recognized by the backend, "sample" = recognition
    # failed and this is a canned sentence, not the user's words.
    transcript_source: Literal["browser", "server", "sample"] = "server"


class ExplainMistakeRequest(BaseModel):
    original: str
    corrected: str
    rule: str


class ExplainMistakeResponse(BaseModel):
    what_was_wrong: str
    why_it_was_wrong: str
    how_to_improve: str
    practice_question: str
