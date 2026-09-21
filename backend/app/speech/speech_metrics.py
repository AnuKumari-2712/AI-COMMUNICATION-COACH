"""
Speaking-pace, filler-word and pause metrics computed from a transcript
(always available) plus, when the upload is real WAV audio, genuine
silence/pause analysis from `audio_utils`.
"""
import re
from collections import Counter
from dataclasses import dataclass, field

from app.speech.audio_utils import PauseAnalysis

FILLER_WORDS = ["um", "uh", "uhh", "umm", "like", "actually", "basically", "you know", "i mean", "sort of", "kind of"]

_FILLER_PATTERN = re.compile(r"\b(" + "|".join(re.escape(f) for f in FILLER_WORDS) + r")\b", re.IGNORECASE)
_WORD_PATTERN = re.compile(r"[A-Za-z']+")


@dataclass
class SpeechMetrics:
    words_per_minute: float
    pace_score: float
    pace_consistency: float
    filler_word_count: int
    filler_words_per_minute: float
    most_frequent_filler: str | None
    pause_count: int
    average_pause_seconds: float
    repeated_words: list[str] = field(default_factory=list)


def detect_filler_words(transcript: str) -> dict:
    matches = [m.group(0).lower() for m in _FILLER_PATTERN.finditer(transcript)]
    counts = Counter(matches)
    most_common = counts.most_common(1)
    return {
        "count": len(matches),
        "breakdown": dict(counts),
        "most_frequent": most_common[0][0] if most_common else None,
    }


def _pace_score(words_per_minute: float) -> float:
    # 130-160 WPM is the commonly cited comfortable range for spoken English
    # in an interview/presentation context.
    if 130 <= words_per_minute <= 160:
        return 95.0
    distance = min(abs(words_per_minute - 145), 90)
    return max(20.0, 95.0 - distance * 0.8)


def compute_speech_metrics(
    transcript: str,
    duration_seconds: float,
    real_pause_analysis: PauseAnalysis | None = None,
) -> SpeechMetrics:
    duration_seconds = max(duration_seconds, 1.0)
    words = _WORD_PATTERN.findall(transcript)
    word_count = len(words)
    words_per_minute = round((word_count / duration_seconds) * 60, 1)

    filler = detect_filler_words(transcript)
    filler_per_minute = round((filler["count"] / duration_seconds) * 60, 2)

    sentence_lengths = [len(s.split()) for s in re.split(r"[.!?]", transcript) if s.strip()]
    if len(sentence_lengths) >= 2:
        mean_len = sum(sentence_lengths) / len(sentence_lengths)
        variance = sum((x - mean_len) ** 2 for x in sentence_lengths) / len(sentence_lengths)
        pace_consistency = max(0.0, 100.0 - min(variance, 100.0))
    else:
        pace_consistency = 75.0

    if real_pause_analysis is not None:
        pause_count = real_pause_analysis.pause_count
        average_pause = real_pause_analysis.average_pause_seconds
    else:
        # Transcript-based estimate: assume one natural pause per sentence
        # boundary, roughly 0.6s each — a reasonable approximation used only
        # when the raw audio isn't available as WAV/PCM for real analysis.
        sentence_count = max(1, transcript.count(".") + transcript.count(",") // 2)
        pause_count = sentence_count
        average_pause = 0.6

    counts = Counter(w.lower() for w in words if len(w) > 3)
    repeated = [w for w, c in counts.items() if c >= 3]

    return SpeechMetrics(
        words_per_minute=words_per_minute,
        pace_score=round(_pace_score(words_per_minute), 1),
        pace_consistency=round(pace_consistency, 1),
        filler_word_count=filler["count"],
        filler_words_per_minute=filler_per_minute,
        most_frequent_filler=filler["most_frequent"],
        pause_count=pause_count,
        average_pause_seconds=average_pause,
        repeated_words=repeated[:5],
    )
