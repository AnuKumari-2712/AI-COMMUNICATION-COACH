from enum import Enum

from pydantic import BaseModel, Field


class DifficultyLevel(str, Enum):
    beginner = "Beginner"
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"
    advanced = "Advanced"


class SkillScores(BaseModel):
    grammar: float = Field(ge=0, le=100)
    vocabulary: float = Field(ge=0, le=100)
    fluency: float = Field(ge=0, le=100)
    speaking_pace: float = Field(ge=0, le=100)
    filler_words: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=100)
    pronunciation: float = Field(ge=0, le=100)
    response_structure: float = Field(ge=0, le=100)

    @property
    def overall(self) -> float:
        values = [
            self.grammar,
            self.vocabulary,
            self.fluency,
            self.speaking_pace,
            self.filler_words,
            self.confidence,
            self.pronunciation,
            self.response_structure,
        ]
        return round(sum(values) / len(values), 1)


class AnalysisSource(str, Enum):
    """Marks whether a result came from a real model/service or a mock fallback."""

    real = "real"
    mock = "mock"
