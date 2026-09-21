"""
Speaking-pace, filler-word and pause metrics computed from a transcript
(always available) plus, when the upload is real WAV audio, genuine
silence/pause analysis from `audio_utils`.

MODULE 3 (see AUDIT.md): the previous filler detector matched a fixed word
list anywhere in the text, which produced real false positives — "Do
**you know** the deadline?" and "I **like** pizza" both got counted as
filler usage even though neither is hesitation. This module splits filler
words into two tiers:

- UNAMBIGUOUS ("um", "uh", "hmm", ...): essentially never used as anything
  but a filler in English, so any match counts, high confidence.
- AMBIGUOUS ("actually", "basically", "you know", "i mean"): only counted
  when they appear as a standalone discourse marker at a clause boundary
  (clause-initial or clause-final, split on . , ! ? ;) — their classic
  filler position — not when embedded mid-clause as part of a genuine
  question or statement.
- "like" and "kind of"/"sort of" get their own context rules, since their
  filler-vs-literal use depends on what surrounds them, not clause position
  (see _is_filler_like, _is_filler_hedge).

Every excluded near-match is returned in `excluded_examples` so this claim
is falsifiable, not just asserted.
"""
import re
from collections import Counter
from dataclasses import dataclass, field

from app.nlp.spacy_model import get_nlp
from app.speech.audio_utils import PauseAnalysis

UNAMBIGUOUS_FILLERS = ["um", "uh", "uhh", "umm", "hmm", "erm"]
AMBIGUOUS_CLAUSE_FILLERS = ["actually", "basically", "you know", "i mean"]
HEDGE_FILLERS = ["sort of", "kind of"]

_UNAMBIGUOUS_PATTERN = re.compile(r"\b(" + "|".join(re.escape(f) for f in UNAMBIGUOUS_FILLERS) + r")\b", re.IGNORECASE)
_CLAUSE_SPLIT = re.compile(r"[.,!?;]")
_WORD_PATTERN = re.compile(r"[A-Za-z']+")
_LIKE_PATTERN = re.compile(r"\blike\b", re.IGNORECASE)
_LIKE_AS_VERB = re.compile(r"\b(i|you|we|they|he|she|it)\s+(don't|doesn't|didn't\s+)?like\b", re.IGNORECASE)
_LIKE_AS_SIMILE = re.compile(r"\blike\s+(a|an|the|this|that|those|these)\b", re.IGNORECASE)
_HEDGE_PATTERN = re.compile(r"\b(sort of|kind of)\b", re.IGNORECASE)


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
    # MODULE 3 transparency: which fillers were high-confidence vs
    # context-dependent, and concrete examples of near-matches that were
    # correctly excluded (so the false-positive-reduction claim is checkable).
    high_confidence_filler_count: int = 0
    ambiguous_filler_count: int = 0
    excluded_examples: list[str] = field(default_factory=list)


def _clause_boundary_fillers(transcript: str) -> tuple[list[str], list[str]]:
    """Returns (counted, excluded) for the clause-boundary-checked filler
    phrases: counted only when the phrase forms a whole clause on its own,
    or sits at the very start/end of a clause — the classic discourse-
    marker position — not when it's embedded mid-clause as part of a
    genuine question or statement."""
    counted: list[str] = []
    excluded: list[str] = []
    clauses = [c.strip() for c in _CLAUSE_SPLIT.split(transcript) if c.strip()]
    for clause in clauses:
        lower = clause.lower()
        words_in_clause = lower.split()
        for phrase in AMBIGUOUS_CLAUSE_FILLERS:
            phrase_words = phrase.split()
            n = len(phrase_words)
            is_whole_clause = words_in_clause == phrase_words
            is_clause_initial = words_in_clause[:n] == phrase_words
            is_clause_final = words_in_clause[-n:] == phrase_words if len(words_in_clause) >= n else False
            if phrase in lower:
                if is_whole_clause or is_clause_initial or is_clause_final:
                    counted.append(phrase)
                else:
                    excluded.append(f'"{phrase}" in "{clause.strip()}" (mid-clause, not a discourse marker position)')
    return counted, excluded


def _like_fillers(transcript: str) -> tuple[list[str], list[str]]:
    """"Like" is only counted as filler when it's neither the verb ("I like
    pizza" / "my friends like it" — any subject, not just pronouns) nor a
    simile/comparison ("like a filter", "like the one").

    Uses spaCy's POS tag for "like" itself when available — this catches
    verb usage regardless of subject (a fixed pronoun list would miss "my
    friends like it", which is exactly the kind of gap this audit is
    about closing, not repeating with a different hardcoded list).
    Falls back to the pronoun-based regex only if spaCy is unavailable.
    """
    counted: list[str] = []
    excluded: list[str] = []
    nlp = get_nlp()

    if nlp is not None:
        doc = nlp(transcript)
        for i, tok in enumerate(doc):
            if tok.text.lower() != "like":
                continue
            window_start = max(0, tok.idx - 15)
            window_end = min(len(transcript), tok.idx + len(tok.text) + 15)
            window = transcript[window_start:window_end].strip()
            next_tok = doc[i + 1] if i + 1 < len(doc) else None
            # spaCy's small model reliably tags "like" as VERB after a
            # pronoun subject ("I like"), but frequently mis-tags it as
            # ADP (preposition) after a plural/compound noun subject
            # ("my friends like it") — a known small-model limitation, not
            # a bug in this logic. "like" immediately followed by a bare
            # object pronoun (it/him/her/them/this/that) is verb usage in
            # practice; a genuine simile almost never continues that way
            # without a fuller noun phrase ("like a filter", not "like it").
            looks_like_verb = tok.pos_ == "VERB" or (
                tok.pos_ == "ADP" and next_tok is not None and next_tok.lower_ in {"it", "him", "her", "them", "this", "that", "these", "those"}
            )
            if looks_like_verb:
                excluded.append(f'"like" in "...{window}..." (used as the verb "to like", not filler)')
            elif _LIKE_AS_SIMILE.match(transcript[tok.idx:]):
                excluded.append(f'"like" in "...{window}..." (simile/comparison usage, not filler)')
            else:
                counted.append("like")
        return counted, excluded

    for m in _LIKE_PATTERN.finditer(transcript):
        start = max(0, m.start() - 15)
        end = min(len(transcript), m.end() + 15)
        window = transcript[start:end]
        if _LIKE_AS_VERB.search(window) or _LIKE_AS_SIMILE.search(window):
            excluded.append(f'"like" in "...{window.strip()}..." (verb or simile usage, not filler)')
        else:
            counted.append("like")
    return counted, excluded


def _hedge_fillers(transcript: str) -> tuple[list[str], list[str]]:
    """"Sort of"/"kind of" are filler when followed by an adjective/verb
    ("sort of weird", "kind of hard") and genuine usage when followed by a
    noun ("this kind of problem", "sort of algorithm"). Uses spaCy POS
    tagging when available; without it, every match is treated as
    ambiguous-but-counted (conservative — matches prior behavior)."""
    counted: list[str] = []
    excluded: list[str] = []
    nlp = get_nlp()
    if nlp is None:
        for m in _HEDGE_PATTERN.finditer(transcript):
            counted.append(m.group(0).lower())
        return counted, excluded

    doc = nlp(transcript)
    for m in _HEDGE_PATTERN.finditer(transcript):
        phrase = m.group(0).lower()
        # find the token right after the matched phrase
        next_tok = None
        for tok in doc:
            if tok.idx >= m.end():
                next_tok = tok
                break
        if next_tok is not None and next_tok.pos_ in ("NOUN", "PROPN"):
            excluded.append(f'"{phrase}" before "{next_tok.text}" (precedes a noun — likely genuine usage, not a filler)')
        else:
            counted.append(phrase)
    return counted, excluded


def detect_filler_words(transcript: str) -> dict:
    unambiguous_matches = [m.group(0).lower() for m in _UNAMBIGUOUS_PATTERN.finditer(transcript)]
    clause_counted, clause_excluded = _clause_boundary_fillers(transcript)
    like_counted, like_excluded = _like_fillers(transcript)
    hedge_counted, hedge_excluded = _hedge_fillers(transcript)

    all_counted = unambiguous_matches + clause_counted + like_counted + hedge_counted
    all_excluded = clause_excluded + like_excluded + hedge_excluded

    counts = Counter(all_counted)
    most_common = counts.most_common(1)
    return {
        "count": len(all_counted),
        "high_confidence_count": len(unambiguous_matches),
        "ambiguous_count": len(clause_counted) + len(like_counted) + len(hedge_counted),
        "breakdown": dict(counts),
        "most_frequent": most_common[0][0] if most_common else None,
        "excluded_examples": all_excluded,
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
        high_confidence_filler_count=filler["high_confidence_count"],
        ambiguous_filler_count=filler["ambiguous_count"],
        excluded_examples=filler["excluded_examples"][:5],
    )
