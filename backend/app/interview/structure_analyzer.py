"""
Answer-structure evaluation, including STAR-format guidance for behavioral
questions (Situation, Task, Action, Result).
"""
from app.nlp.text_analysis import structure_analysis

_STAR_KEYWORDS = {
    "situation": ["at the time", "we were", "there was a", "during my", "in my previous", "the situation was"],
    "task": ["i needed to", "my task was", "i was responsible", "the goal was", "i had to"],
    "action": ["i decided", "i implemented", "i organized", "i built", "i created", "so i", "i took the initiative"],
    "result": ["as a result", "this led to", "we achieved", "the outcome was", "ultimately", "in the end"],
}


def evaluate_structure(text: str) -> dict:
    return structure_analysis(text)


def evaluate_star_format(text: str) -> dict:
    lower = text.lower()
    components = {}
    for part, keywords in _STAR_KEYWORDS.items():
        components[part] = 100.0 if any(k in lower for k in keywords) else 35.0

    score = round(sum(components.values()) / len(components), 1)
    missing = [part.title() for part, value in components.items() if value < 50]
    return {"score": score, "components": components, "missing_components": missing}
