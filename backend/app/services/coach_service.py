"""
AI Coach chat.

This is a template/rule-based coach personalized with the student's own
learner profile (their actual weakest skill, streak, career goal) rather
than a wired-up generative LLM — the required stack lists NLP/transformer
models for analysis, not a chat model, and standing up a safe, hosted LLM
is out of scope here. The response-selection logic is real (keyword
routing + live profile data), and the integration point for a real LLM
(e.g. a HuggingFace text-generation pipeline) is isolated to
`_generate_reply`, so swapping it in later doesn't touch the route or the
profile-lookup logic.
"""
import random

from app.personalization import learner_profile
from app.schemas.student import LearnerProfile

_TOPIC_RESPONSES = {
    "filler": [
        "Try the 'pause instead of filler' technique: whenever you feel an 'um' coming, stop for a full second of silence instead. "
        "It feels long to you but reads as confident, deliberate pacing to a listener.",
    ],
    "grammar": [
        "For grammar, the highest-leverage fix is usually tense consistency — decide up front whether you're describing "
        "something in the past or present, and keep every verb in that sentence matching.",
    ],
    "vocabulary": [
        "Swap 3-4 generic words per answer ('good', 'nice', 'things') for more specific ones ('effective', 'well-structured', "
        "'deliverables'). Small vocabulary upgrades compound fast across a full interview.",
    ],
    "confidence": [
        "Confidence in speech comes from sentence structure as much as tone: lead with what you did ('I led...', 'I built...') "
        "rather than hedging ('I think maybe I helped a bit with...').",
    ],
    "interview": [
        "For behavioral questions, structure your answer as Situation, Task, Action, Result (STAR) — it keeps you concise "
        "and makes your contribution unmistakable to the interviewer.",
    ],
    "pace": [
        "Aim for roughly 130-160 words per minute — that's the comfortable range for spoken English in an interview. "
        "If you tend to speed up under pressure, practice reading a paragraph aloud while tapping a slow, steady beat.",
    ],
}

_GREETINGS = ["hi", "hello", "hey"]


def suggested_prompts(profile: LearnerProfile) -> list[str]:
    prompts = ["Give me tips to structure interview answers.", "How can I sound more confident?"]
    if profile.weaknesses:
        prompts.insert(0, f"How do I improve my {profile.weaknesses[0].lower()}?")
    prompts.append("What should I practice today?")
    return prompts[:4]


def _match_topic(message: str) -> str | None:
    lower = message.lower()
    if any(w in lower for w in ["filler", "um", "uh"]):
        return "filler"
    if "grammar" in lower or "tense" in lower:
        return "grammar"
    if "vocab" in lower or "word choice" in lower:
        return "vocabulary"
    if "confiden" in lower:
        return "confidence"
    if "interview" in lower or "star" in lower:
        return "interview"
    if "pace" in lower or "speed" in lower or "fast" in lower:
        return "pace"
    return None


def _generate_reply(profile: LearnerProfile, message: str) -> str:
    lower = message.lower().strip()

    if any(g in lower for g in _GREETINGS) and len(lower) < 20:
        return f"Hi {profile.full_name.split(' ')[0]}! What would you like to work on today — grammar, fluency, vocabulary or interview prep?"

    if "what should i practice" in lower or "recommend" in lower:
        from app.personalization.recommendation_engine import recommend_next_activity

        rec = recommend_next_activity(profile)
        return f"Based on your profile, I'd recommend: **{rec['title']}**. {rec['reason']}"

    topic = _match_topic(lower)
    if topic:
        base = random.choice(_TOPIC_RESPONSES[topic])
        if profile.weaknesses and topic.capitalize() not in " ".join(profile.weaknesses):
            return base
        return base + f" This lines up with what your recent sessions show — keep an eye on it in your next {topic} exercise."

    if profile.weaknesses:
        return (
            f"That's a good question. Looking at your learner profile, your current focus area is "
            f"{profile.weaknesses[0]} — want tips specifically for that, or should we talk about something else?"
        )
    return "Happy to help with grammar, vocabulary, fluency, confidence or interview prep — what would you like to focus on?"


def chat(student_id: str, message: str) -> str:
    profile = learner_profile.get_profile(student_id) or learner_profile.get_or_create_demo_profile()
    return _generate_reply(profile, message)
