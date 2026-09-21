"""
Rule-based grammar checker.

This is real, deterministic NLP — not a mock — built from regex + (when
spaCy is available) POS tags. It intentionally avoids a heavyweight
grammar-correction dependency (LanguageTool needs a JVM; a transformer
grammar-correction model is 300MB+) so the project installs cleanly on a
student laptop. `app/ml/transformer_confidence.py` shows the pattern for
plugging in a transformer model later if that tradeoff changes.

Each rule returns zero or more `Correction` tuples: (original, corrected,
reason, rule_name). `analyze()` also returns a 0-100 grammar score based on
how many rule violations were found relative to sentence count.
"""
import re
from dataclasses import dataclass

from app.nlp.spacy_model import get_nlp


@dataclass
class Correction:
    original: str
    corrected: str
    reason: str
    rule: str


_DOUBLE_NEGATIVE = re.compile(r"\b(don't|doesn't|didn't|isn't|wasn't|can't|won't)\b\s+\w*\s*\b(no|none|nothing|nobody|never)\b", re.IGNORECASE)
_I_HAS = re.compile(r"\bI\s+(has|was is|don't has)\b", re.IGNORECASE)
_NEITHER_PLURAL = re.compile(r"\b(neither|either|each|every one) of (the )?\w+ (were|are)\b", re.IGNORECASE)
_REPEATED_WORD = re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE)
_ALOT = re.compile(r"\balot\b", re.IGNORECASE)
_YOUR_GOING = re.compile(r"\byour\s+(going|coming|trying|looking|planning)\b", re.IGNORECASE)
_THEIR_GOING = re.compile(r"\btheir\s+(going|coming|trying)\b", re.IGNORECASE)
_KINDA_SORTA = re.compile(r"\b(kinda|sorta|gonna|wanna|dunno)\b", re.IGNORECASE)


def _fix_double_negative(text: str) -> list[Correction]:
    corrections = []
    for m in _DOUBLE_NEGATIVE.finditer(text):
        corrections.append(
            Correction(
                original=m.group(0),
                corrected=re.sub(r"\bno\b", "any", m.group(0), flags=re.IGNORECASE),
                reason="Avoid double negatives — pair a negative verb with 'any', not another negative word.",
                rule="double_negative",
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
                reason="A word was accidentally repeated.",
                rule="repeated_word",
            )
        )
    return corrections


def _fix_simple_typos(text: str) -> list[Correction]:
    corrections = []
    for m in _ALOT.finditer(text):
        corrections.append(Correction(m.group(0), "a lot", "'Alot' is not a word — use 'a lot'.", "spelling"))
    for m in _YOUR_GOING.finditer(text):
        corrections.append(
            Correction(m.group(0), m.group(0).replace("your", "you're").replace("Your", "You're"), "Use 'you're' (you are) before a verb ending in -ing.", "homophone")
        )
    for m in _THEIR_GOING.finditer(text):
        corrections.append(
            Correction(m.group(0), m.group(0).replace("their", "they're").replace("Their", "They're"), "Use 'they're' (they are) before a verb ending in -ing.", "homophone")
        )
    for m in _KINDA_SORTA.finditer(text):
        corrections.append(Correction(m.group(0), {"kinda": "kind of", "sorta": "sort of", "gonna": "going to", "wanna": "want to", "dunno": "don't know"}[m.group(0).lower()], "Avoid casual contractions in formal communication.", "formality"))
    return corrections


def _tense_consistency_score(text: str) -> tuple[float, list[str]]:
    """Uses spaCy POS tags (when available) to flag sentences that mix past
    and present tense main verbs — a common weakness in spoken answers."""
    nlp = get_nlp()
    if nlp is None:
        return 100.0, []

    doc = nlp(text)
    flags: list[str] = []
    mixed_sentences = 0
    total_sentences = 0
    for sent in doc.sents:
        total_sentences += 1
        tags = {tok.tag_ for tok in sent if tok.pos_ == "VERB"}
        has_past = "VBD" in tags
        has_present = bool(tags & {"VBP", "VBZ"})
        if has_past and has_present:
            mixed_sentences += 1
            flags.append(sent.text.strip())

    if total_sentences == 0:
        return 100.0, []
    penalty = (mixed_sentences / total_sentences) * 40
    return max(0.0, 100.0 - penalty), flags


def analyze(text: str) -> dict:
    """Runs every rule against `text` and returns a grammar score plus the
    list of corrections found, each labeled with the rule that caught it."""
    corrections: list[Correction] = []
    for fn in (_fix_double_negative, _fix_i_has, _fix_neither_plural, _fix_repeated_word, _fix_simple_typos):
        corrections.extend(fn(text))

    tense_score, mixed_tense_sentences = _tense_consistency_score(text)
    if mixed_tense_sentences:
        corrections.append(
            Correction(
                original=mixed_tense_sentences[0],
                corrected="(keep verb tense consistent within the sentence)",
                reason="This sentence mixes past and present tense verbs.",
                rule="tense_consistency",
            )
        )

    sentence_count = max(1, text.count(".") + text.count("!") + text.count("?") or 1)
    rule_penalty = min(60.0, len(corrections) * (100.0 / max(sentence_count, 1)) * 0.5)
    grammar_score = round(max(0.0, min(100.0, (tense_score * 0.4) + (100.0 - rule_penalty) * 0.6)), 1)

    return {
        "score": grammar_score,
        "corrections": corrections,
        "weaknesses": sorted({c.rule for c in corrections}),
    }
