"""
Answer relevance analysis engine.
Evaluates alignment between question content words and candidate response using lemma and keyword matching.
"""
import re

from app.nlp.spacy_model import get_nlp

_WORD_PATTERN = re.compile(r"[A-Za-z']+")

# Words that are part of a typical interview-question *template*, not the
# actual topic being asked about — excluding them stops "tell me about a
# time you..." from itself being treated as the content to look for.
_QUESTION_TEMPLATE_WORDS = {
    "tell", "describe", "explain", "give", "share", "walk", "talk", "discuss",
    "elaborate", "think", "feel", "say", "know", "recall", "remember",
    "example", "time", "situation", "experience", "would", "could", "can",
    "do", "did", "have", "has", "about", "me", "you", "your", "a", "an",
    "the", "some", "how", "what", "why", "when", "where", "who",
}

# Below this many identified question keywords, there isn't enough of a
# topic signature to make a meaningful relevance judgment at all (e.g. "Why?").
_MIN_QUESTION_KEYWORDS_FOR_CONFIDENT_SCORE = 2


def _extract_keywords_spacy(nlp, text: str) -> list[str]:
    doc = nlp(text)
    keywords = []
    seen = set()
    for tok in doc:
        if not tok.is_alpha or len(tok.text) <= 2:
            continue
        lemma = tok.lemma_.lower()
        if lemma in _QUESTION_TEMPLATE_WORDS:
            continue
        if tok.pos_ in ("NOUN", "PROPN") or tok.pos_ == "VERB":
            if lemma not in seen:
                seen.add(lemma)
                keywords.append(lemma)
    return keywords


def _extract_keywords_fallback(text: str) -> list[str]:
    words = [w.lower() for w in _WORD_PATTERN.findall(text) if len(w) > 2]
    keywords = []
    seen = set()
    for w in words:
        if w in _QUESTION_TEMPLATE_WORDS:
            continue
        if w not in seen:
            seen.add(w)
            keywords.append(w)
    return keywords


def analyze_relevance(question: str, answer: str) -> dict:
    if not question or not question.strip():
        return {
            "score": 50.0,
            "addressed_keywords": [],
            "missing_keywords": [],
            "question_keyword_count": 0,
            "sufficient_data": False,
            "formula": "No question text was provided — relevance cannot be assessed against nothing, so a neutral score is returned instead of a fabricated one.",
        }

    nlp = get_nlp()
    if nlp is not None:
        question_keywords = _extract_keywords_spacy(nlp, question)
        answer_terms = set(_extract_keywords_spacy(nlp, answer)) if answer.strip() else set()
        method = "spaCy lemma matching (handles simple inflection, e.g. 'led' matches 'lead')"
    else:
        question_keywords = _extract_keywords_fallback(question)
        answer_terms = set(_extract_keywords_fallback(answer)) if answer.strip() else set()
        method = "plain lowercase word matching (spaCy unavailable — no lemmatization, so inflected forms like 'led' vs 'lead' won't match)"

    if not question_keywords:
        return {
            "score": 50.0,
            "addressed_keywords": [],
            "missing_keywords": [],
            "question_keyword_count": 0,
            "sufficient_data": False,
            "formula": f"No identifiable topic keywords found in the question text using {method} — relevance cannot be meaningfully assessed, so a neutral score is returned instead of a fabricated one.",
        }

    addressed = [k for k in question_keywords if k in answer_terms]
    missing = [k for k in question_keywords if k not in answer_terms]
    coverage = len(addressed) / len(question_keywords)
    score = round(coverage * 100, 1)
    sufficient_data = len(question_keywords) >= _MIN_QUESTION_KEYWORDS_FOR_CONFIDENT_SCORE

    formula = (
        f"score = (addressed_keyword_count / question_keyword_count) * 100 = "
        f"({len(addressed)}/{len(question_keywords)}) * 100 = {score}. "
        f"Question keywords identified via {method}: {question_keywords}. "
        "This measures literal keyword/lemma overlap between question and answer content — "
        "a real, checkable signal, but NOT true semantic understanding: an answer that echoes "
        "the question's own words without actually answering it can still score well here, and "
        "a genuinely correct answer using different vocabulary than the question can score poorly. "
        + (
            "Based on fewer than 2 question keywords — treat as a low-confidence estimate."
            if not sufficient_data
            else "Based on 2+ question keywords — a reasonable sample for this measure."
        )
    )

    return {
        "score": score,
        "addressed_keywords": addressed,
        "missing_keywords": missing,
        "question_keyword_count": len(question_keywords),
        "sufficient_data": sufficient_data,
        "formula": formula,
    }
