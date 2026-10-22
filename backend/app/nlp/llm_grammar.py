"""
LLM-based grammar checker using the Anthropic API (Claude).
Performs comprehensive, sentence-by-sentence grammar, tense, vocabulary,
punctuation, and word-choice corrections.
"""
import json
import logging
import os
import re
from typing import Any

from anthropic import Anthropic

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert English grammar and writing coach. The user will give you a text answer. Analyze it very carefully and correct ALL mistakes.
CHECK FOR ALL OF THESE: grammar and tense, subject-verb agreement, verb forms, articles, prepositions, singular/plural, pronouns, spelling, punctuation, capitalization, sentence structure (run-ons, fragments, word order), word choice, unnatural expressions.
STRICT RULES:
- Process the text SENTENCE BY SENTENCE, independently. Never skip a sentence, including the last one.
- A single sentence can have multiple mistakes. Find ALL of them. Do NOT stop after the first.
- Keep the user's original meaning and tone. Only fix errors.
- If a sentence is already correct, set has_errors to false and mistakes to [].
Return ONLY valid JSON, no markdown, no extra text:
{"corrected_text": "...", "sentences": [{"original": "...", "corrected": "...", "has_errors": true, "mistakes": [{"wrong": "...", "correct": "...", "type": "tense | subject-verb agreement | verb form | article | preposition | plural/singular | pronoun | spelling | punctuation | capitalization | sentence structure | word choice | unnatural expression", "explanation": "short, simple reason"}]}]}"""


def _clean_json_text(raw: str) -> str:
    """Strips markdown code fences (```json ... ```) and extracts JSON payload."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    # If extra text precedes or follows the JSON, attempt to locate outermost {...}
    if not (cleaned.startswith("{") and cleaned.endswith("}")):
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1).strip()

    return cleaned


def check_grammar(text: str) -> dict[str, Any]:
    """
    Analyzes input text using Claude, returning sentence-by-sentence corrections and overall corrected text.

    Raises:
        ValueError: If ANTHROPIC_API_KEY is not configured or empty.
        Exception: If Anthropic API call or response parsing fails.
    """
    settings = get_settings()
    api_key = os.getenv("ANTHROPIC_API_KEY") or settings.anthropic_api_key
    if not api_key or not api_key.strip():
        raise ValueError("ANTHROPIC_API_KEY not configured")

    trimmed_text = text.strip() if text else ""
    if not trimmed_text:
        return {
            "corrected_text": "",
            "sentences": [],
            "total_mistakes": 0,
        }

    model = os.getenv("GRAMMAR_MODEL") or settings.grammar_model or "claude-sonnet-5-5"

    client = Anthropic(api_key=api_key.strip())
    response = client.messages.create(
        model=model,
        max_tokens=4000,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": trimmed_text}
        ],
    )

    # Extract text content from Anthropic response
    raw_content = ""
    for block in response.content:
        if getattr(block, "type", "") == "text":
            raw_content += block.text

    if not raw_content:
        raise ValueError("Empty response received from Anthropic API")

    cleaned_json = _clean_json_text(raw_content)
    parsed = json.loads(cleaned_json)

    raw_sentences = parsed.get("sentences", [])
    normalized_sentences: list[dict[str, Any]] = []

    for s in raw_sentences:
        raw_mistakes = s.get("mistakes", [])
        mistakes = []
        for m in raw_mistakes:
            mistakes.append({
                "wrong": str(m.get("wrong", "")),
                "correct": str(m.get("correct", "")),
                "type": str(m.get("type", "grammar")),
                "explanation": str(m.get("explanation", "")),
            })
        has_errors = bool(s.get("has_errors", False)) or len(mistakes) > 0
        normalized_sentences.append({
            "original": str(s.get("original", "")),
            "corrected": str(s.get("corrected", "")),
            "has_errors": has_errors,
            "mistakes": mistakes,
        })

    # Recompute total_mistakes to guard against model arithmetic inaccuracies
    total_mistakes = sum(len(s["mistakes"]) for s in normalized_sentences)

    return {
        "corrected_text": str(parsed.get("corrected_text", trimmed_text)),
        "sentences": normalized_sentences,
        "total_mistakes": total_mistakes,
    }
