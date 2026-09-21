"""
Rule-based grammar checker — MODULE 1 (see AUDIT.md for the full rationale).

Design rules enforced here, per the accuracy audit:
1. Only issues categorized "grammar" affect grammar_score. Spelling and
   style/formality issues are detected and reported, but never lower the
   grammar score — they are a different kind of mistake.
2. Every issue carries a confidence level. Pattern-exact matches (double
   negative, "I has", etc.) are "high" confidence. The tense-consistency
   heuristic can legitimately false-positive on correct sentences (e.g.
   reported speech: "She said she is happy" mixes past+present correctly),
   so it is always "medium" confidence and weighted at half strength in the
   score, never presented as a certain error.
3. The scoring formula is fully transparent and returned in the response,
   not hidden in code: an average reader of the API response can recompute
   the score by hand from the numbers given.
4. Sentence counting uses real sentence boundaries (spaCy when available,
   else a punctuation-based regex split), not a punctuation character tally.

This is real, deterministic NLP — not a mock — built from regex + (when
spaCy is available) POS tags. It intentionally avoids a heavyweight
grammar-correction dependency (LanguageTool needs a JVM; a transformer
grammar-correction model is 300MB+) so the project installs cleanly on a
student laptop. Coverage is intentionally narrow and honestly documented:
see AUDIT.md for exactly which error types are and are not detected.
"""
import re
from dataclasses import dataclass, field
from typing import Literal

from app.nlp.spacy_model import get_nlp

Category = Literal["grammar", "spelling", "style"]
Confidence = Literal["high", "medium"]


@dataclass
class Correction:
    original: str
    corrected: str
    reason: str
    rule: str
    category: Category
    confidence: Confidence
    sentence: str = ""  # the full sentence the issue was found in, for context


@dataclass
class GrammarAnalysis:
    score: float
    corrections: list[Correction]
    grammar_issue_count: int
    spelling_issue_count: int
    style_issue_count: int
    sentence_count: int
    word_count: int
    weighted_error_count: float
    formula: str
    sufficient_data: bool
    weaknesses: list[str] = field(default_factory=list)


_DOUBLE_NEGATIVE = re.compile(r"\b(don't|doesn't|didn't|isn't|wasn't|can't|won't)\b\s+\w*\s*\b(no|none|nothing|nobody|never)\b", re.IGNORECASE)
_I_HAS = re.compile(r"\bI\s+(has|was is|don't has)\b", re.IGNORECASE)
_NEITHER_PLURAL = re.compile(r"\b(neither|either|each|every one) of (the )?\w+ (were|are)\b", re.IGNORECASE)
_REPEATED_WORD = re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE)
_ALOT = re.compile(r"\balot\b", re.IGNORECASE)
_YOUR_GOING = re.compile(r"\byour\s+(going|coming|trying|looking|planning)\b", re.IGNORECASE)
_THEIR_GOING = re.compile(r"\btheir\s+(going|coming|trying)\b", re.IGNORECASE)
_KINDA_SORTA = re.compile(r"\b(kinda|sorta|gonna|wanna|dunno)\b", re.IGNORECASE)

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_WORD_PATTERN = re.compile(r"[A-Za-z']+")

# Weight applied to each corrections's contribution to the score; "medium"
# confidence issues are shown to the user but only half-count against the
# score, since they carry real false-positive risk (see module docstring).
_CONFIDENCE_WEIGHT: dict[Confidence, float] = {"high": 1.0, "medium": 0.5}

# Points removed from the score per unit of "weighted errors per sentence".
# Documented so the formula is reproducible by hand, not a hidden constant:
# one high-confidence grammar error in a one-sentence answer (error rate 1.0)
# costs 50 points; the same error spread across 4 sentences (error rate 0.25)
# costs 12.5 points.
_POINTS_PER_ERROR_RATE = 50.0


def _sentences(text: str) -> list[str]:
    nlp = get_nlp()
    if nlp is not None and text.strip():
        doc = nlp(text)
        sents = [s.text.strip() for s in doc.sents if s.text.strip()]
        if sents:
            return sents
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def _sentence_containing(sentences: list[str], span_text: str) -> str:
    for sent in sentences:
        if span_text.lower() in sent.lower():
            return sent
    return span_text


def _fix_double_negative(text: str) -> list[Correction]:
    corrections = []
    for m in _DOUBLE_NEGATIVE.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=re.sub(r"\bno\b", "any", m.group(0), flags=re.IGNORECASE),
                reason="Avoid double negatives — pair a negative verb with 'any', not another negative word.",
                rule="double_negative",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_i_has(text: str) -> list[Correction]:
    corrections = []
    for m in _I_HAS.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected="I have",
                reason="Use 'have' (not 'has') with the first-person pronoun 'I'.",
                rule="subject_verb_agreement",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_neither_plural(text: str) -> list[Correction]:
    corrections = []
    for m in _NEITHER_PLURAL.finditer(text):
        fixed = re.sub(r"\b(were|are)\b", lambda mm: "was" if mm.group(0).lower() == "were" else "is", m.group(0))
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=fixed,
                reason="'Neither', 'either' and 'each' are singular and take a singular verb.",
                rule="subject_verb_agreement",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_repeated_word(text: str) -> list[Correction]:
    corrections = []
    for m in _REPEATED_WORD.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=m.group(1),
                reason="A word was accidentally repeated, breaking the sentence's grammar.",
                rule="repeated_word",
                category="grammar",
                confidence="high",
            )
        )
    return corrections


def _fix_simple_typos(text: str) -> list[Correction]:
    """Spelling and style issues — deliberately kept OUT of the "grammar"
    category so they cannot affect grammar_score (audit finding #1)."""
    corrections = []
    for m in _ALOT.finditer(text):
        corrections.append(
            Correction(m.group(0), "a lot", "'Alot' is not a standard word — use 'a lot'.", "spelling", category="spelling", confidence="high")
        )
    for m in _YOUR_GOING.finditer(text):
        corrections.append(
            Correction(
                m.group(0),
                m.group(0).replace("your", "you're").replace("Your", "You're"),
                "Use 'you're' (you are) before a verb ending in -ing — this changes the sentence's grammar, not just its spelling.",
                "homophone",
                category="grammar",
                confidence="high",
            )
        )
    for m in _THEIR_GOING.finditer(text):
        corrections.append(
            Correction(
                m.group(0),
                m.group(0).replace("their", "they're").replace("Their", "They're"),
                "Use 'they're' (they are) before a verb ending in -ing — this changes the sentence's grammar, not just its spelling.",
                "homophone",
                category="grammar",
                confidence="high",
            )
        )
    for m in _KINDA_SORTA.finditer(text):
        corrections.append(
            Correction(
                m.group(0),
                {"kinda": "kind of", "sorta": "sort of", "gonna": "going to", "wanna": "want to", "dunno": "don't know"}[m.group(0).lower()],
                "Casual contraction — a style/formality choice, not a grammar error.",
                "formality",
                category="style",
                confidence="high",
            )
        )
    return corrections


def _tense_consistency(text: str, sentences: list[str]) -> list[Correction]:
    """Uses spaCy POS tags to flag sentences that mix past and present tense
    main verbs. Always "medium" confidence: this can legitimately false-
    positive on correct constructions like reported speech ("She said she
    is happy"), so it is shown to the user as uncertain, not a hard error,
    and only half-weighted in the score (see module docstring)."""
    nlp = get_nlp()
    if nlp is None:
        return []

    corrections = []
    for sent_text in sentences:
        doc = nlp(sent_text)
        tags = {tok.tag_ for tok in doc if tok.pos_ == "VERB"}
        has_past = "VBD" in tags
        has_present = bool(tags & {"VBP", "VBZ"})
        if has_past and has_present:
            corrections.append(
                Correction(
                    original=sent_text,
                    corrected="(keep verb tense consistent within the sentence, unless intentionally reporting past speech)",
                    reason="This sentence mixes past and present tense verbs. This may be a genuine tense error, or correct reported speech — review it yourself.",
                    rule="tense_consistency",
                    category="grammar",
                    confidence="medium",
                    sentence=sent_text,
                )
            )
    return corrections


def analyze(text: str) -> dict:
    """Runs every rule against `text` and returns a transparent grammar
    score plus the list of corrections found. See GrammarAnalysis for the
    full shape; returned as a dict for backward compatibility with existing
    callers that read analyze(text)["score"] / ["corrections"]."""
    text = text or ""
    sentences = _sentences(text)
    word_count = len(_WORD_PATTERN.findall(text))
    sentence_count = max(len(sentences), 1 if word_count else 0)

    corrections: list[Correction] = []
    for fn in (_fix_double_negative, _fix_i_has, _fix_neither_plural, _fix_repeated_word, _fix_simple_typos):
        corrections.extend(fn(text))
    corrections.extend(_tense_consistency(text, sentences))

    # Attach full-sentence context to every correction that doesn't already
    # carry one (tense_consistency already sets `sentence` to the whole sentence).
    for c in corrections:
        if not c.sentence:
            c.sentence = _sentence_containing(sentences, c.original)

    if word_count == 0:
        return GrammarAnalysis(
            score=0.0,
            corrections=[],
            grammar_issue_count=0,
            spelling_issue_count=0,
            style_issue_count=0,
            sentence_count=0,
            word_count=0,
            weighted_error_count=0.0,
            formula="No input provided — no meaningful text to grade.",
            sufficient_data=False,
            weaknesses=[],
        ).__dict__

    grammar_corrections = [c for c in corrections if c.category == "grammar"]
    spelling_corrections = [c for c in corrections if c.category == "spelling"]
    style_corrections = [c for c in corrections if c.category == "style"]

    weighted_error_count = sum(_CONFIDENCE_WEIGHT[c.confidence] for c in grammar_corrections)
    error_rate = weighted_error_count / sentence_count
    score = round(max(0.0, min(100.0, 100.0 - error_rate * _POINTS_PER_ERROR_RATE)), 1)

    formula = (
        f"score = 100 - (weighted_error_count / sentence_count) * {_POINTS_PER_ERROR_RATE:.0f}, clamped to [0, 100]. "
        f"weighted_error_count = {weighted_error_count:.1f} (each high-confidence grammar issue = 1.0, "
        f"each medium-confidence issue = 0.5). sentence_count = {sentence_count}. "
        f"Only issues categorized 'grammar' count — spelling and style issues are reported but do not affect this score."
    )

    return GrammarAnalysis(
        score=score,
        corrections=corrections,
        grammar_issue_count=len(grammar_corrections),
        spelling_issue_count=len(spelling_corrections),
        style_issue_count=len(style_corrections),
        sentence_count=sentence_count,
        word_count=word_count,
        weighted_error_count=round(weighted_error_count, 2),
        formula=formula,
        sufficient_data=True,
        weaknesses=sorted({c.rule for c in grammar_corrections}),
    ).__dict__
