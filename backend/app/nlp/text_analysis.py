"""
Vocabulary, structure and clarity analysis.

MODULE 2 (see AUDIT.md): vocabulary richness previously used raw
type-token ratio (TTR = unique words / total words), which is a real but
length-biased metric — a 5-word answer with zero repeated words scores a
perfect 1.0 just as easily as a genuinely rich 200-word answer, and raw TTR
mechanically decays as text gets longer even when the underlying
vocabulary is equally rich, because longer text has more chances to repeat
common words. This module now uses Herdan's C (log(unique)/log(total)), a
standard corpus-linguistics measure that stays far more stable across text
lengths than raw TTR, AND explicitly flags scores from short answers as
low-confidence (`sufficient_data=False`) rather than presenting a
five-word answer's vocabulary score with the same confidence as a
five-sentence one.

Structure analysis is a position + keyword heuristic for intro / main
point / example / conclusion, used by both Text Practice and the interview
answer-structure evaluator.
"""
import math
import re
from collections import Counter

from app.nlp.spacy_model import get_nlp

# Below this many content words, lexical-diversity measures (TTR, Herdan's C)
# are known to be unstable/unreliable estimates — a short answer can hit a
# perfect diversity score by chance alone. Below this threshold the score is
# still computed (so callers always get a number) but sufficient_data=False
# tells the caller not to treat it as a confident measurement.
_MIN_CONTENT_WORDS_FOR_CONFIDENT_SCORE = 15

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of", "in",
    "on", "for", "with", "that", "this", "it", "i", "you", "we", "they", "my", "your",
    "as", "at", "be", "by", "so", "if", "then", "than", "have", "has", "had", "do", "did",
}

_UPGRADE_SUGGESTIONS = {
    "good": "effective / well-structured",
    "bad": "ineffective / suboptimal",
    "nice": "impressive / commendable",
    "show": "demonstrate / illustrate",
    "help": "facilitate / support",
    "big": "substantial / significant",
    "get": "obtain / acquire",
    "make": "produce / develop",
    "very": "highly / considerably",
    "stuff": "materials / components",
    "things": "aspects / factors",
    "a lot": "considerably / extensively",
}

_STRUCTURE_KEYWORDS = {
    "introduction": ["i am", "my name", "to start", "firstly", "let me begin", "i would like to"],
    "example": ["for example", "for instance", "such as", "one time", "in one project", "specifically"],
    "conclusion": ["in conclusion", "to summarize", "overall", "in summary", "that is why", "as a result"],
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def _lexical_diversity(unique_count: int, total_count: int) -> float:
    """Herdan's C = log(unique) / log(total). Returns 1.0 for the
    degenerate total_count<=1 case (log undefined/zero) since there's no
    repetition possible to measure either way."""
    if total_count <= 1:
        return 1.0
    return math.log(max(unique_count, 1)) / math.log(total_count)


def vocabulary_analysis(text: str) -> dict:
    words = _tokenize(text)
    content_words = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    unique_words = set(content_words)
    content_word_count = len(content_words)

    if content_word_count == 0:
        return {
            "score": 0.0,
            "type_token_ratio": 0.0,
            "lexical_diversity": 0.0,
            "average_word_length": 0.0,
            "repeated_words": [],
            "content_word_count": 0,
            "sufficient_data": False,
            "formula": "No meaningful words provided — no vocabulary to assess.",
            "suggestions": [],
        }

    ttr = len(unique_words) / content_word_count
    diversity = _lexical_diversity(len(unique_words), content_word_count)
    avg_word_len = sum(len(w) for w in content_words) / content_word_count

    counts = Counter(words)
    repeated = [w for w, c in counts.items() if c >= 3 and w not in _STOPWORDS]

    suggestions = []
    for word in _UPGRADE_SUGGESTIONS:
        if re.search(rf"\b{re.escape(word)}\b", text, re.IGNORECASE):
            suggestions.append(f"Consider replacing \"{word}\" with \"{_UPGRADE_SUGGESTIONS[word]}\" for a more professional tone.")

    # Vocabulary score rewards length-stable lexical diversity and slightly
    # longer, more specific words, and penalizes heavy repetition. Weights
    # are documented here so the score is reproducible by hand.
    diversity_component = diversity * 55
    word_length_component = (min(avg_word_len, 8) / 8) * 30
    repetition_component = max(0.0, 15 - len(repeated) * 4)
    score = round(min(100.0, max(0.0, diversity_component + word_length_component + repetition_component)), 1)

    sufficient_data = content_word_count >= _MIN_CONTENT_WORDS_FOR_CONFIDENT_SCORE

    formula = (
        f"score = (lexical_diversity * 55) + (min(avg_word_length, 8)/8 * 30) + max(0, 15 - repeated_word_count*4), clamped to [0, 100]. "
        f"lexical_diversity = Herdan's C = log(unique_words)/log(total_content_words) = log({len(unique_words)})/log({content_word_count}) = {diversity:.3f}. "
        f"avg_word_length = {avg_word_len:.2f}. repeated_word_count = {len(repeated)}. "
        + (
            "Based on fewer than 15 content words — treat as a low-confidence estimate, not a reliable measurement."
            if not sufficient_data
            else "Based on 15+ content words — a statistically reasonable sample for this measure."
        )
    )

    return {
        "score": score,
        "type_token_ratio": round(ttr, 3),
        "lexical_diversity": round(diversity, 3),
        "average_word_length": round(avg_word_len, 2),
        "repeated_words": repeated[:5],
        "content_word_count": content_word_count,
        "sufficient_data": sufficient_data,
        "formula": formula,
        "suggestions": suggestions[:4] or ["Your word choice is already varied — try weaving in one domain-specific term next time."],
    }


def structure_analysis(text: str) -> dict:
    lower = text.lower()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    def _has_any(keywords: list[str]) -> bool:
        return any(k in lower for k in keywords)

    intro_present = bool(sentences) and (_has_any(_STRUCTURE_KEYWORDS["introduction"]) or True)  # first sentence always counts as an attempt
    example_present = _has_any(_STRUCTURE_KEYWORDS["example"])
    conclusion_present = _has_any(_STRUCTURE_KEYWORDS["conclusion"]) or (len(sentences) > 1 and sentences[-1].lower().startswith(("so", "overall", "that")))
    main_point_present = len(sentences) >= 2
    supporting_present = len(sentences) >= 3

    weights = {
        "introduction": 100.0 if intro_present else 40.0,
        "main_point": 100.0 if main_point_present else 30.0,
        "supporting_explanation": 100.0 if supporting_present else 35.0,
        "example": 100.0 if example_present else 25.0,
        "conclusion": 100.0 if conclusion_present else 30.0,
    }
    structure_score = round(sum(weights.values()) / len(weights), 1)
    return {"score": structure_score, "components": weights, "sentence_count": len(sentences)}


def clarity_analysis(text: str) -> dict:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    words = _tokenize(text)
    if not sentences or not words:
        return {"score": 0.0, "average_sentence_length": 0.0}

    avg_len = len(words) / len(sentences)
    # Ideal spoken/written clarity sits around 12-20 words per sentence;
    # very short or very long sentences reduce the clarity score.
    if 10 <= avg_len <= 22:
        score = 95.0
    else:
        distance = min(abs(avg_len - 16), 20)
        score = max(40.0, 95.0 - distance * 3)
    return {"score": round(score, 1), "average_sentence_length": round(avg_len, 1)}


def better_alternative(text: str, question: str) -> str:
    """A structured rewrite suggestion. With spaCy available this leans on
    detected subject/verb spans; otherwise it falls back to a clean
    professional template built from the student's own key nouns."""
    nlp = get_nlp()
    words = _tokenize(text)
    content_words = [w for w in words if w not in _STOPWORDS and len(w) > 3]
    key_terms = list(dict.fromkeys(content_words))[:4]

    if nlp is not None and text.strip():
        doc = nlp(text)
        nouns = [tok.text for tok in doc if tok.pos_ in ("NOUN", "PROPN")]
        key_terms = list(dict.fromkeys(nouns))[:4] or key_terms

    terms = ", ".join(key_terms) if key_terms else "the key points from your answer"
    return (
        f"In response to \"{question}\", I would highlight {terms}, structured as: "
        "a brief introduction, the core point, one concrete example, and a short conclusion "
        "that ties back to the question."
    )
