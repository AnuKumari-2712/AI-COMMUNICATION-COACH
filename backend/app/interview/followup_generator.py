
from app.nlp.spacy_model import get_nlp

_GENERIC_CHUNK_WORDS = {
    "it", "this", "that", "these", "those", "i", "we", "you", "they", "he", "she",
    "something", "anything", "everything", "a lot", "lots", "time", "experience",
    "project", "work", "things", "stuff", "the team", "my team", "the company",
}


_GENERIC_CONTENT_WORDS = {
    "stuff", "thing", "things", "lot", "lots", "way", "ways", "time", "times",
    "experience", "project", "work", "something", "anything", "everything",
}


_LEADING_DETERMINERS = {
    "a", "an", "the", "my", "our", "your", "his", "her", "their",
    "this", "that", "these", "those", "some", "any",
}

_FOLLOWUP_TEMPLATES = [
    "You mentioned {phrase} — what was the most challenging part of that?",
    "Can you go deeper into how you approached {phrase}?",
    "What would you do differently if you worked on {phrase} again?",
]


def _specific_noun_phrases(nlp, text: str) -> list[str]:
    doc = nlp(text)
    phrases: list[str] = []
    seen: set[str] = set()
    for chunk in doc.noun_chunks:
        words = chunk.text.strip().split()
        while words and words[0].lower() in _LEADING_DETERMINERS:
            words = words[1:]
        if not words:
            continue
        cleaned = " ".join(words)
        lower = cleaned.lower()
        if lower in _GENERIC_CHUNK_WORDS or len(cleaned) < 4:
            continue
        if any(w.lower().strip(".,!?") in _GENERIC_CONTENT_WORDS for w in words):
            continue
        if not any(tok.pos_ in ("NOUN", "PROPN") for tok in chunk):
            continue
        if lower not in seen:
            seen.add(lower)
            phrases.append(cleaned)
    
    phrases.sort(key=len, reverse=True)
    return phrases


def generate_followup(answer_text: str, already_referenced: set[str] | None = None, template_index: int = 0) -> dict | None:
    already_referenced = already_referenced or set()
    nlp = get_nlp()
    if nlp is None or not answer_text or not answer_text.strip():
        return None

    for phrase in _specific_noun_phrases(nlp, answer_text):
        if phrase.lower() in already_referenced:
            continue
        template = _FOLLOWUP_TEMPLATES[template_index % len(_FOLLOWUP_TEMPLATES)]
        return {"phrase": phrase, "question_text": template.format(phrase=phrase)}
    return None
