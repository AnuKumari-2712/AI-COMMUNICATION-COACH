"""
Multi-engine Grammar Checker with configurable fallback priority:
Engine order configurable via GRAMMAR_ENGINE_ORDER (default: "claude,t5,rules").
1. Claude (Anthropic API: claude-3-5-sonnet-20241022 or env ANTHROPIC_MODEL, temperature 0)
2. T5 GEC Model (app.nlp.gec_model, lazy-loaded if trained and available)
3. Rule-based Engine (regex + spaCy POS tags in app.nlp.grammar_rules)
"""
import json
import logging
import os
import re
from typing import Any

from anthropic import Anthropic

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an accurate, intelligent English communication and grammar coach.
Your goal is to identify GENUINE grammatical, tense, syntactic, and structural errors, while providing a clear, natural corrected version of the user's speech.

IMPORTANT CONTEXT FOR SPOKEN SPEECH:
- The input comes from Speech-to-Text (STT) audio transcription.
- DO NOT flag missing commas, periods, or capitalization as errors.
- Spoken conversational filler phrases (e.g. "I think that...", "well", "actually") are natural — only flag them if grammatically flawed.

Error categories to actively check and correct:
1. TENSE & GRAMMAR: Wrong tense or tense clash ("yesterday I go" → "yesterday I went", "I didn't went" → "I didn't go")
2. SUBJECT-VERB AGREEMENT: "he don't" → "he doesn't", "they was" → "they were", "she have" → "she has"
3. VERB FORMS: Wrong verb form after modals ("should went" → "should have gone")
4. ARTICLES: Missing or wrong articles ("I am student" → "I am a student", "a honest" → "an honest")
5. PREPOSITIONS: Incorrect or missing prepositions ("good in coding" → "good at coding", "discuss about" → "discuss")
6. PRONOUNS: Incorrect pronoun case ("me and my friend" → "my friend and I")
7. SINGULAR / PLURAL: "many project" → "many projects", "two book" → "two books"
8. INDIAN ENGLISH SYNTAX: "I am agree" → "I agree", "am having experience" → "have experience"
9. WORD CHOICE & REDUNDANCY: "revert back" → "revert", unnatural or awkward expressions

CRITICAL RULES:
1. ALWAYS provide the complete, beautifully polished full sentence in "corrected". Never truncate or shorten the sentence.
2. If the user made errors, list each one in "mistakes" with exact "wrong" phrase, "correct" replacement, "type", and a clear "explanation".
3. If the input has zero errors, return "mistakes": [] and set "corrected" to the polished input sentence.
4. Output strict JSON array only.

Output format (strict JSON array):
[
  {
    "sentence": "Original complete sentence text",
    "original": "Original complete sentence text",
    "corrected": "Complete, grammatically polished sentence",
    "mistakes": [
      {
        "wrong": "exact erroneous phrase",
        "correct": "corrected replacement",
        "type": "grammar | subject-verb agreement | tense | verb form | preposition | article | singular-plural | word choice",
        "explanation": "Clear, helpful 1-sentence explanation of the grammar rule"
      }
    ]
  }
]
"""


def _clean_json_text(raw: str) -> str:
    """Strips markdown code fences and extracts the innermost JSON payload."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    if not ((cleaned.startswith("[") and cleaned.endswith("]")) or (cleaned.startswith("{") and cleaned.endswith("}"))):
        arr_match = re.search(r"(\[.*\])", cleaned, re.DOTALL)
        obj_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if arr_match:
            cleaned = arr_match.group(1).strip()
        elif obj_match:
            cleaned = obj_match.group(1).strip()

    return cleaned


def _parse_json_with_repair(raw: str) -> Any:
    """Parses JSON text from LLMs, cleaning markdown fences and repairing minor truncations."""
    cleaned = _clean_json_text(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as err:
        repaired = cleaned.rstrip()
        for ch in (',', '"', "'"):
            repaired = repaired.rstrip(ch)
        open_braces = repaired.count('{') - repaired.count('}')
        open_brackets = repaired.count('[') - repaired.count(']')
        repaired += '}' * max(0, open_braces)
        repaired += ']' * max(0, open_brackets)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            arr_match = re.search(r'(\[\s*\{.*\}\s*(?:,\s*\{.*\}\s*)*)\s*', repaired, re.DOTALL)
            if arr_match:
                try:
                    return json.loads(arr_match.group(1) + ']')
                except json.JSONDecodeError:
                    pass
        raise ValueError(f"Could not parse response as JSON: {err}") from err


def check_grammar_claude(text: str) -> dict[str, Any]:
    """
    Analyzes input text using Claude (Anthropic API) at temperature 0 with strict JSON.
    Always recomputes total_mistakes and sentence_count in Python.
    """
    settings = get_settings()
    api_key = os.getenv("ANTHROPIC_API_KEY") or getattr(settings, "anthropic_api_key", None)
    if not api_key or not api_key.strip():
        raise ValueError("ANTHROPIC_API_KEY not configured")

    trimmed = text.strip() if text else ""
    if not trimmed:
        return {
            "corrected_text": "",
            "sentences": [],
            "total_mistakes": 0,
            "sentence_count": 0,
            "grammar_engine": "claude",
        }

    model = (
        os.getenv("ANTHROPIC_MODEL")
        or getattr(settings, "anthropic_model", None)
        or os.getenv("GRAMMAR_MODEL")
        or "claude-3-5-sonnet-20241022"
    )

    client = Anthropic(api_key=api_key.strip())
    # Estimate needed tokens: longer texts need more room for sentence-by-sentence analysis
    word_count = len(trimmed.split())
    max_tokens = 8000 if word_count > 100 else 6000 if word_count > 50 else 4096

    create_kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": trimmed}],
    }
    try:
        response = client.messages.create(temperature=0, **create_kwargs)
    except TypeError:
        response = client.messages.create(extra_body={"temperature": 0}, **create_kwargs)

    raw_content = ""
    for block in response.content:
        if getattr(block, "type", "") == "text":
            raw_content += block.text

    if not raw_content:
        raise ValueError("Empty response received from Anthropic API")

    # Check if response was likely truncated (stop_reason != 'end_turn')
    stop_reason = getattr(response, "stop_reason", None)
    if stop_reason == "max_tokens":
        logger.warning("Claude response was truncated (hit max_tokens). Attempting to parse partial JSON...")

    cleaned_json = _clean_json_text(raw_content)

    # Robust JSON parsing: handle truncated responses by attempting to fix incomplete JSON
    parsed = None
    try:
        parsed = json.loads(cleaned_json)
    except json.JSONDecodeError as json_err:
        logger.warning("Initial JSON parse failed (%s), attempting to repair truncated JSON...", json_err)
        # Try to fix common truncation issues: missing closing brackets
        repaired = cleaned_json.rstrip()
        # Remove any trailing incomplete object/string
        for trim_char in (',', '"', "'"):
            repaired = repaired.rstrip(trim_char)
        # Count unmatched brackets and close them
        open_braces = repaired.count('{') - repaired.count('}')
        open_brackets = repaired.count('[') - repaired.count(']')
        repaired += '}' * max(0, open_braces)
        repaired += ']' * max(0, open_brackets)
        try:
            parsed = json.loads(repaired)
            logger.info("Successfully repaired truncated JSON from Claude.")
        except json.JSONDecodeError:
            # Last resort: try to extract whatever valid JSON array we can find
            arr_match = re.search(r'(\[\s*\{.*\}\s*(?:,\s*\{.*\}\s*)*)\s*', repaired, re.DOTALL)
            if arr_match:
                try:
                    parsed = json.loads(arr_match.group(1) + ']')
                    logger.info("Extracted partial JSON array from truncated Claude response.")
                except json.JSONDecodeError:
                    pass
        if parsed is None:
            raise ValueError(f"Could not parse Claude response as JSON even after repair: {json_err}") from json_err

    if isinstance(parsed, list):
        raw_sentences = parsed
        corrected_text = " ".join(s.get("corrected", s.get("sentence", "")) for s in raw_sentences).strip()
    elif isinstance(parsed, dict):
        raw_sentences = parsed.get("sentences", [])
        corrected_text = parsed.get("corrected_text", " ".join(s.get("corrected", s.get("original", "")) for s in raw_sentences).strip())
    else:
        raise ValueError(f"Unexpected JSON format from Claude: {type(parsed)}")

    normalized_sentences: list[dict[str, Any]] = []
    for s in raw_sentences:
        orig = str(s.get("original") or s.get("sentence") or "")
        corr = str(s.get("corrected") or orig)
        raw_mistakes = s.get("mistakes", [])
        mistakes = []
        for m in raw_mistakes:
            wrong_text = str(m.get("wrong", "")).strip()
            correct_text = str(m.get("correct", "")).strip()
            # Skip empty or nonsensical mistakes where wrong == correct
            if not wrong_text or not correct_text:
                continue
            if wrong_text.lower() == correct_text.lower():
                continue
            mistakes.append({
                "wrong": wrong_text,
                "correct": correct_text,
                "type": str(m.get("type", "grammar")),
                "explanation": str(m.get("explanation", "")),
            })
        has_errors = bool(s.get("has_errors", False)) or len(mistakes) > 0
        normalized_sentences.append({
            "original": orig,
            "corrected": corr,
            "has_errors": has_errors,
            "mistakes": mistakes,
        })

    # Always recompute total_mistakes and sentence_count in Python (never trust LLM count)
    total_mistakes = sum(len(s["mistakes"]) for s in normalized_sentences)
    sentence_count = len(normalized_sentences)

    # Log summary for debugging
    logger.info(
        "Claude grammar check: %d sentences, %d total mistakes found (model=%s, stop_reason=%s)",
        sentence_count, total_mistakes, model, stop_reason,
    )

    return {
        "corrected_text": corrected_text or trimmed,
        "sentences": normalized_sentences,
        "total_mistakes": total_mistakes,
        "sentence_count": sentence_count,
        "grammar_engine": "claude",
    }


def check_grammar_gemini(text: str) -> dict[str, Any]:
    """
    Analyzes input text using Google Gemini 1.5 Flash via REST API with strict JSON.
    Always recomputes total_mistakes and sentence_count in Python.
    """
    import json
    import requests
    from app.core.config import get_settings

    settings = get_settings()
    api_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "gemini_api_key", None)
    if not api_key or not api_key.strip():
        raise ValueError("GEMINI_API_KEY not configured")

    trimmed = text.strip() if text else ""
    if not trimmed:
        return {
            "corrected_text": "",
            "sentences": [],
            "total_mistakes": 0,
            "sentence_count": 0,
            "grammar_engine": "gemini",
        }

    candidate_models = []
    preferred_model = os.getenv("GEMINI_MODEL") or getattr(settings, "gemini_model", "gemini-2.5-flash")
    for m in [preferred_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
        if m and m not in candidate_models:
            candidate_models.append(m)

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": [
            {
                "parts": [{"text": trimmed}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json"
        }
    }

    resp = None
    last_err = ""
    used_model = preferred_model
    for candidate in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate}:generateContent?key={api_key.strip()}"
        try:
            r = requests.post(url, json=payload, timeout=30)
            if r.status_code == 200:
                resp = r
                used_model = candidate
                break
            else:
                last_err = f"model {candidate} returned {r.status_code}: {r.text}"
        except Exception as e:
            last_err = f"model {candidate} error: {e}"

    if resp is None:
        raise ValueError(f"Gemini API request failed across all candidate models: {last_err}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError("No candidates returned from Gemini API")

    raw_content = ""
    for part in candidates[0].get("content", {}).get("parts", []):
        raw_content += part.get("text", "")

    if not raw_content:
        raise ValueError("Empty response received from Gemini API")

    parsed_json = _parse_json_with_repair(raw_content)
    if not isinstance(parsed_json, list):
        if isinstance(parsed_json, dict) and "sentences" in parsed_json:
            parsed_json = parsed_json["sentences"]
        else:
            parsed_json = [parsed_json] if isinstance(parsed_json, dict) else []

    corrected_text = ""
    normalized_sentences = []
    for s in parsed_json:
        if not isinstance(s, dict):
            continue
        orig = str(s.get("sentence", s.get("original", ""))).strip()
        corr = str(s.get("corrected", orig)).strip()
        if corr:
            corrected_text = (corrected_text + " " + corr).strip()

        raw_mistakes = s.get("mistakes", [])
        mistakes = []
        for m in raw_mistakes:
            wrong_text = str(m.get("wrong", "")).strip()
            correct_text = str(m.get("correct", "")).strip()
            if not wrong_text or not correct_text:
                continue
            if wrong_text.lower() == correct_text.lower():
                continue
            mistakes.append({
                "wrong": wrong_text,
                "correct": correct_text,
                "type": str(m.get("type", "grammar")),
                "explanation": str(m.get("explanation", "")),
            })
        has_errors = bool(s.get("has_errors", False)) or len(mistakes) > 0
        normalized_sentences.append({
            "original": orig,
            "corrected": corr,
            "has_errors": has_errors,
            "mistakes": mistakes,
        })

    total_mistakes = sum(len(s["mistakes"]) for s in normalized_sentences)
    sentence_count = len(normalized_sentences)

    logger.info(
        "Gemini grammar check: %d sentences, %d total mistakes found (model=%s)",
        sentence_count, total_mistakes, used_model,
    )

    return {
        "corrected_text": corrected_text or trimmed,
        "sentences": normalized_sentences,
        "total_mistakes": total_mistakes,
        "sentence_count": sentence_count,
        "grammar_engine": "gemini",
    }


def check_grammar_t5(text: str) -> dict[str, Any]:
    """
    Analyzes input text using the fine-tuned T5 grammar model (Prompt 8).
    Lazy-loads from app.nlp.gec_model.
    """
    try:
        from app.nlp import gec_model  # type: ignore
        result = gec_model.check_grammar(text)
        result["grammar_engine"] = "t5"
        # Always recompute in Python
        result["total_mistakes"] = sum(len(s.get("mistakes", [])) for s in result.get("sentences", []))
        result["sentence_count"] = len(result.get("sentences", []))
        return result
    except (ImportError, AttributeError, FileNotFoundError, RuntimeError) as exc:
        raise RuntimeError(f"T5 grammar engine unavailable: {exc}") from exc


def check_grammar_rules(text: str) -> dict[str, Any]:
    """
    Analyzes input text using deterministic rule-based regex & spaCy POS engine.
    Always available as reliable baseline.
    """
    from app.nlp import grammar_rules

    trimmed = text.strip() if text else ""
    if not trimmed:
        return {
            "corrected_text": "",
            "sentences": [],
            "total_mistakes": 0,
            "sentence_count": 0,
            "grammar_engine": "rules",
        }

    analysis = grammar_rules.analyze(trimmed)
    split_sents = grammar_rules.split_sentences(trimmed)
    if not split_sents:
        split_sents = [trimmed]

    corrections = analysis.get("corrections", [])
    normalized_sentences = []

    for sent in split_sents:
        sent_corrs = [
            c for c in corrections
            if getattr(c, "sentence", "") == sent or (not getattr(c, "sentence", "") and c.original.lower() in sent.lower())
        ]
        sent_mistakes = [
            {
                "wrong": c.original,
                "correct": c.corrected,
                "type": getattr(c, "error_type", "Grammar"),
                "explanation": c.reason,
            }
            for c in sent_corrs
        ]
        corr_sent = grammar_rules.generate_corrected_answer(sent, sent_corrs) if sent_corrs else sent
        normalized_sentences.append({
            "original": sent,
            "corrected": corr_sent,
            "has_errors": len(sent_mistakes) > 0,
            "mistakes": sent_mistakes,
        })

    total_mistakes = sum(len(s["mistakes"]) for s in normalized_sentences)
    sentence_count = len(normalized_sentences)
    corrected_text = " ".join(s["corrected"] for s in normalized_sentences).strip() or analysis.get("corrected_answer", trimmed)

    return {
        "corrected_text": corrected_text,
        "sentences": normalized_sentences,
        "total_mistakes": total_mistakes,
        "sentence_count": sentence_count,
        "grammar_engine": "rules",
    }


def check_grammar(text: str) -> dict[str, Any]:
    """
    Dispatches grammar check according to GRAMMAR_ENGINE_ORDER (default: "gemini,claude,t5,rules").
    Logs engine usage and reasons for any fallback.
    Every returned dictionary includes "grammar_engine" ("gemini" | "claude" | "t5" | "rules").
    """
    order_env = os.getenv("GRAMMAR_ENGINE_ORDER", "gemini,claude,t5,rules")
    engines = [e.strip().lower() for e in order_env.split(",") if e.strip()]
    if not engines:
        engines = ["gemini", "claude", "t5", "rules"]

    last_error: Exception | None = None
    for engine in engines:
        if engine == "gemini":
            try:
                res = check_grammar_gemini(text)
                logger.info("Grammar check completed using 'gemini' engine.")
                return res
            except Exception as e:
                logger.info("Gemini grammar engine skipped/unavailable (%s), falling back...", e)
                last_error = e
        elif engine == "claude":
            try:
                res = check_grammar_claude(text)
                logger.info("Grammar check completed using 'claude' engine.")
                return res
            except Exception as e:
                logger.warning("Claude grammar engine failed (%s), falling back...", e)
                last_error = e
        elif engine == "t5":
            try:
                res = check_grammar_t5(text)
                logger.info("Grammar check completed using 't5' engine.")
                return res
            except Exception as e:
                logger.info("T5 grammar engine skipped/unavailable (%s), falling back...", e)
                last_error = e
        elif engine == "rules":
            try:
                res = check_grammar_rules(text)
                logger.info("Grammar check completed using 'rules' engine.")
                return res
            except Exception as e:
                logger.warning("Rules grammar engine failed (%s), falling back...", e)
                last_error = e

    # Safety net: fallback to rules if all listed engines failed
    try:
        return check_grammar_rules(text)
    except Exception as e:
        raise RuntimeError(f"All grammar engines failed. Last error: {last_error or e}") from e

