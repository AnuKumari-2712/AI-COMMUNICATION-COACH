"""
MODULE 9 (see AUDIT.md): follow-up question generation.

Before this module, the interview flow asked a fixed, pre-generated slate
of questions decided entirely at session start — nothing in
`answer_question` looked at what the candidate actually said. A real
interviewer's follow-up references something specific the candidate
mentioned (the audit's own example: "I built a hospital management system
using MERN" -> a good follow-up asks about "your hospital management
system" specifically, not an unrelated generic question like "what's your
favorite language").

This extracts the most specific noun phrase mentioned in the answer (via
spaCy noun chunks, preferring longer/more concrete phrases over single
generic nouns like "it" or "time") and builds a follow-up question that
names it explicitly. If nothing sufficiently specific is found — a vague,
short, or generic answer — no follow-up is generated. Inventing one
anyway would produce exactly the kind of generic, disconnected question
this module exists to eliminate; "no good follow-up available" is the
honest result for a vague answer.
"""
from app.nlp.spacy_model import get_nlp

_GENERIC_CHUNK_WORDS = {
    "it", "this", "that", "these", "those", "i", "we", "you", "they", "he", "she",
    "something", "anything", "everything", "a lot", "lots", "time", "experience",
    "project", "work", "things", "stuff", "the team", "my team", "the company",
}

# Individual words that make a whole chunk too vague to be a good follow-up
# topic even if the chunk itself isn't an exact match above (e.g. "some
# stuff", "a lot of things").
_GENERIC_CONTENT_WORDS = {
    "stuff", "thing", "things", "lot", "lots", "way", "ways", "time", "times",
    "experience", "project", "work", "something", "anything", "everything",
}

# spaCy noun_chunks include leading determiners/possessives ("a hospital
# management system"); stripping them means "a hospital management system"
# and "hospital management system" are recognized as the same topic when
# checking against already-referenced phrases.
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
    # Longer/more specific phrases are preferred as a proxy for "more
    # concrete detail" — "hospital management system" over just "system".
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
