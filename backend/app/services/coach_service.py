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
    system_prompt = f"""You are Coach Aria, an intelligent, versatile, and friendly AI Coach and personal mentor for {profile.full_name}.

You can answer ANY question the user asks accurately, comprehensively, and helpfully:
1. Communication & English: Grammar, vocabulary enhancements, fluency tips, pronunciation advice, and presentation techniques.
2. Interview Preparation: Behavioral answers (using the STAR method), technical questions, model responses, and salary/career negotiation.
3. General Knowledge & Learning: Coding/technical concepts, mathematics, science, writing/editing emails, general queries, and translations.

User Profile Context:
- Full Name: {profile.full_name}
- Career Goal: {profile.career_goal or 'Professional Communicator'}
- Current Level: {getattr(profile, 'current_level', 'medium')}
- Focus Weaknesses: {', '.join(profile.weaknesses) if profile.weaknesses else 'None flagged yet'}

Guidelines:
1. Answer ANY question asked directly, accurately, and thoroughly. Never refuse questions or say you can only discuss communication drills.
2. Use clear formatting with bold key points, bullet lists, and structured explanations.
3. If the user asks in Hindi or Hinglish, respond in natural, friendly Hinglish/English.
4. Be encouraging, clear, and actionable."""

    from app.core.config import get_settings
    import os

    settings = get_settings()

    # 1. Try Gemini first if GEMINI_API_KEY is configured
    gemini_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "gemini_api_key", None)
    if gemini_key and gemini_key.strip():
        try:
            import requests
            candidate_models = []
            preferred_model = os.getenv("GEMINI_MODEL") or getattr(settings, "gemini_model", "gemini-3.5-flash")
            for m in [preferred_model, "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemma-4-26b-a4b-it", "gemini-2.5-flash"]:
                if m and m not in candidate_models:
                    candidate_models.append(m)

            payload = {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": message}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024
                }
            }

            for candidate in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate}:generateContent?key={gemini_key.strip()}"
                try:
                    resp = requests.post(url, json=payload, timeout=25)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and parts[0].get("text"):
                                return parts[0]["text"].strip()
                except Exception:
                    continue
        except Exception:
            pass

    # 2. Try Claude if ANTHROPIC_API_KEY is configured
    try:
        from anthropic import Anthropic
        if settings.anthropic_api_key and settings.anthropic_api_key.strip():
            client = Anthropic(api_key=settings.anthropic_api_key)
            model_name = getattr(settings, "grammar_model", "claude-3-5-sonnet-20241022")
            response = client.messages.create(
                model=model_name,
                max_tokens=800,
                temperature=0.7,
                system=system_prompt,
                messages=[{"role": "user", "content": message}],
            )
            if response.content and len(response.content) > 0:
                reply_text = response.content[0].text.strip()
                if reply_text:
                    return reply_text
    except Exception:
        pass


    # 2. Rule-based intelligent fallback if Claude is unavailable
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

