"""
Vocabulary, structure and clarity analysis.

Vocabulary richness uses a type-token ratio (unique words / total words) —
a standard, real NLP metric — plus a small "upgrade" dictionary for common
overused words. Structure analysis is a position + keyword heuristic for
intro / main point / example / conclusion, used by both Text Practice and
the interview answer-structure evaluator.
"""
import re
from collections import Counter

from app.nlp.spacy_model import get_nlp

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


def vocabulary_analysis(text: str) -> dict:
    words = _tokenize(text)
    content_words = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    unique_words = set(content_words)

    ttr = len(unique_words) / len(content_words) if content_words else 1.0
    avg_word_len = sum(len(w) for w in content_words) / len(content_words) if content_words else 0

    counts = Counter(words)
    repeated = [w for w, c in counts.items() if c >= 3 and w not in _STOPWORDS]

    suggestions = []
    for word in _UPGRADE_SUGGESTIONS:
        if re.search(rf"\b{re.escape(word)}\b", text, re.IGNORECASE):
            suggestions.append(f"Consider replacing \"{word}\" with \"{_UPGRADE_SUGGESTIONS[word]}\" for a more professional tone.")

    # Vocabulary score rewards lexical diversity and slightly longer, more
    # specific words, and penalizes heavy repetition.
    score = (ttr * 55) + (min(avg_word_len, 8) / 8 * 30) + max(0, 15 - len(repeated) * 4)
    return {
        "score": round(min(100.0, max(0.0, score)), 1),
        "type_token_ratio": round(ttr, 3),
        "average_word_length": round(avg_word_len, 2),
        "repeated_words": repeated[:5],
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
