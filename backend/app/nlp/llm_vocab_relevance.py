"""
Claude-powered Vocabulary, Answer Relevance, and Interview Follow-up with heuristic fallbacks.
Implements Prompt 7:
1. Vocabulary: context-appropriateness score (0-100), 3-5 elevated word suggestions with example sentences,
   and weak/repeated words, while preserving all existing lexical metrics and fields.
2. Relevance: 0-100 semantic relevance score with a one-line reason (does the answer actually answer the question?).
3. Interview Follow-up: generates one probing follow-up question tailored to specific technical/project details
   mentioned in the candidate's actual answer.
Graceful fallback to existing deterministic / rule-based analyzers when ANTHROPIC_API_KEY is not configured
or on any API failure.
"""
import json
import logging
import os
import re
from typing import Any

from anthropic import Anthropic

from app.core.config import get_settings
from app.interview import followup_generator
from app.nlp import relevance_analysis, text_analysis

logger = logging.getLogger(__name__)


def _clean_json_text(raw: str) -> str:
    """Strips markdown code fences and extracts innermost JSON payload."""
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


def _get_anthropic_client() -> tuple[Anthropic, str]:
    settings = get_settings()
    api_key = os.getenv("ANTHROPIC_API_KEY") or getattr(settings, "anthropic_api_key", None)
    if not api_key or not api_key.strip():
        raise ValueError("ANTHROPIC_API_KEY not configured")

    model = (
        os.getenv("ANTHROPIC_MODEL")
        or getattr(settings, "anthropic_model", None)
        or "claude-3-5-sonnet-20241022"
    )
    return Anthropic(api_key=api_key), model


def _call_gemini_json_api(system_prompt: str, user_content: str) -> dict:
    """Helper to query Gemini API via REST and return parsed JSON."""
    import requests
    settings = get_settings()
    api_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "gemini_api_key", None)
    if not api_key or not api_key.strip():
        raise ValueError("GEMINI_API_KEY not configured")

    candidate_models = []
    preferred_model = os.getenv("GEMINI_MODEL") or getattr(settings, "gemini_model", "gemini-2.5-flash")
    for m in [preferred_model, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
        if m and m not in candidate_models:
            candidate_models.append(m)

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_content}]}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json"
        }
    }

    resp = None
    last_err = ""
    for candidate in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate}:generateContent?key={api_key.strip()}"
        try:
            r = requests.post(url, json=payload, timeout=25)
            if r.status_code == 200:
                resp = r
                break
            else:
                last_err = f"model {candidate} returned {r.status_code}: {r.text}"
        except Exception as e:
            last_err = f"model {candidate} error: {e}"

    if resp is None:
        raise ValueError(f"Gemini API error across all models: {last_err}")

    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError("No candidates returned from Gemini API")

    raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
    cleaned = _clean_json_text(raw_text)
    return json.loads(cleaned)



# ============================================================================
# 1. VOCABULARY ANALYSIS
# ============================================================================

VOCAB_SYSTEM_PROMPT = """You are an expert English vocabulary and communication coach.
Evaluate the vocabulary quality, context-appropriateness, and word choices in the provided text.
Assess how appropriately, precisely, and professionally words are used in context.

STRICT RULES:
1. Provide a context-appropriateness score from 0.0 to 100.0 (higher = richer, more precise and professional vocabulary).
2. Suggest 3 to 5 better word replacements with realistic example sentences and concise rationales.
3. Identify weak, informal, or repeatedly overused words.
4. Output ONLY valid JSON matching this schema:
{
  "context_appropriateness_score": 85.0,
  "better_word_suggestions": [
    {
      "word": "original weak word",
      "suggested": "elevated alternative",
      "reason": "concise rationale",
      "example_sentence": "A clear, realistic sentence demonstrating the suggested word."
    }
  ],
  "weak_or_repeated_words": ["word1", "word2"]
}
"""


def analyze_vocabulary_claude(text: str) -> dict[str, Any]:
    """Analyzes vocabulary using Claude at temperature 0 with strict JSON schema."""
    trimmed = text.strip() if text else ""
    if not trimmed:
        raise ValueError("Empty text provided for vocabulary analysis")

    client, model = _get_anthropic_client()
    response = client.messages.create(
        model=model,
        max_tokens=1000,
        temperature=0.0,
        system=VOCAB_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Text to evaluate:\n\n{trimmed}"}],
    )

    raw_text = response.content[0].text if response.content else "{}"
    cleaned = _clean_json_text(raw_text)
    data = json.loads(cleaned)

    # Deterministic lexical metrics recomputed in Python (never hallucinated)
    heuristic_metrics = text_analysis.vocabulary_analysis(trimmed)

    raw_score = float(data.get("context_appropriateness_score", heuristic_metrics["score"]))
    context_score = max(0.0, min(100.0, round(raw_score, 1)))

    raw_suggestions = data.get("better_word_suggestions", [])
    suggestion_strings: list[str] = []
    suggestion_details: list[dict[str, str]] = []

    for item in raw_suggestions[:5]:
        if isinstance(item, dict):
            orig = item.get("word", "")
            sug = item.get("suggested", "")
            reason = item.get("reason", "More professional tone.")
            ex = item.get("example_sentence", "")
            if orig and sug:
                suggestion_details.append({
                    "word": orig,
                    "suggested": sug,
                    "reason": reason,
                    "example_sentence": ex,
                })
                if ex:
                    suggestion_strings.append(f'Replace "{orig}" with "{sug}": "{ex}" ({reason})')
                else:
                    suggestion_strings.append(f'Replace "{orig}" with "{sug}" ({reason})')

    if not suggestion_strings:
        suggestion_strings = heuristic_metrics["suggestions"]

    weak_words = data.get("weak_or_repeated_words", [])
    combined_repeated = list(dict.fromkeys(weak_words + heuristic_metrics["repeated_words"]))[:5]

    return {
        "score": context_score,
        "context_appropriateness_score": context_score,
        "type_token_ratio": heuristic_metrics["type_token_ratio"],
        "lexical_diversity": heuristic_metrics["lexical_diversity"],
        "average_word_length": heuristic_metrics["average_word_length"],
        "repeated_words": combined_repeated,
        "content_word_count": heuristic_metrics["content_word_count"],
        "sufficient_data": heuristic_metrics["sufficient_data"],
        "formula": (
            f"score = {context_score} (Claude AI context-appropriateness evaluation). "
            f"lexical_diversity = {heuristic_metrics['lexical_diversity']:.3f} (Herdan's C), "
            f"avg_word_length = {heuristic_metrics['average_word_length']:.2f}."
        ),
        "suggestions": suggestion_strings,
        "suggestion_details": suggestion_details,
        "vocab_engine": "claude",
    }


def analyze_vocabulary_gemini(text: str) -> dict[str, Any]:
    """Analyzes vocabulary using Google Gemini with strict JSON schema."""
    trimmed = text.strip() if text else ""
    if not trimmed:
        raise ValueError("Empty text provided for vocabulary analysis")

    data = _call_gemini_json_api(VOCAB_SYSTEM_PROMPT, f"Text to evaluate:\n\n{trimmed}")
    heuristic_metrics = text_analysis.vocabulary_analysis(trimmed)

    raw_score = float(data.get("context_appropriateness_score", heuristic_metrics["score"]))
    context_score = max(0.0, min(100.0, round(raw_score, 1)))

    raw_suggestions = data.get("better_word_suggestions", [])
    suggestion_strings: list[str] = []
    suggestion_details: list[dict[str, str]] = []

    for item in raw_suggestions[:5]:
        if isinstance(item, dict):
            orig = item.get("word", "")
            sug = item.get("suggested", "")
            reason = item.get("reason", "")
            ex = item.get("example_sentence", "")
            if sug:
                suggestion_strings.append(f"{orig} → {sug}" if orig else sug)
                suggestion_details.append({
                    "word": orig,
                    "suggested": sug,
                    "reason": reason,
                    "example_sentence": ex,
                })

    if not suggestion_strings:
        suggestion_strings = heuristic_metrics["suggestions"]

    weak_words = data.get("weak_or_repeated_words", [])
    combined_repeated = list(dict.fromkeys(weak_words + heuristic_metrics["repeated_words"]))[:5]

    return {
        "score": context_score,
        "context_appropriateness_score": context_score,
        "type_token_ratio": heuristic_metrics["type_token_ratio"],
        "lexical_diversity": heuristic_metrics["lexical_diversity"],
        "average_word_length": heuristic_metrics["average_word_length"],
        "repeated_words": combined_repeated,
        "content_word_count": heuristic_metrics["content_word_count"],
        "sufficient_data": heuristic_metrics["sufficient_data"],
        "formula": (
            f"score = {context_score} (Gemini AI context-appropriateness evaluation). "
            f"lexical_diversity = {heuristic_metrics['lexical_diversity']:.3f} (Herdan's C), "
            f"avg_word_length = {heuristic_metrics['average_word_length']:.2f}."
        ),
        "suggestions": suggestion_strings,
        "suggestion_details": suggestion_details,
        "vocab_engine": "gemini",
    }


def get_vocabulary_analysis(text: str) -> dict[str, Any]:
    """Fallback dispatcher: Gemini -> Claude -> text_analysis.vocabulary_analysis (heuristic)."""
    try:
        return analyze_vocabulary_gemini(text)
    except Exception as exc:
        logger.info("Gemini vocabulary evaluation skipped/unavailable (%s).", exc)

    try:
        return analyze_vocabulary_claude(text)
    except Exception as exc:
        logger.info("Claude vocabulary evaluation unavailable (%s); using heuristic analyzer.", exc)
        result = text_analysis.vocabulary_analysis(text)
        result["vocab_engine"] = "heuristic"
        result["context_appropriateness_score"] = result["score"]
        result["suggestion_details"] = []
        return result



# ============================================================================
# 2. ANSWER RELEVANCE ANALYSIS
# ============================================================================

RELEVANCE_SYSTEM_PROMPT = """You are an expert communication and interview coach.
Evaluate whether the student's answer ACTUALLY answers the question that was asked.

STRICT RULES:
1. Provide a relevance score from 0.0 to 100.0:
   - 90-100: Direct, thorough, and answers all core aspects of the question.
   - 70-89: Good answer, addresses main intent with minor omissions.
   - 40-69: Partially relevant; drifts off-topic, discusses adjacent ideas, or misses key requirements.
   - 0-39: Off-topic, evades the question, or fails to address what was asked.
2. Provide a single-sentence rationale (`relevance_reason`, 10-25 words) explaining why this score was awarded.
3. List 2 to 4 key question concepts addressed (`addressed_keywords`).
4. List any key question aspects that were missed or omitted (`missing_keywords`).
5. Output ONLY valid JSON matching this schema:
{
  "relevance_score": 88.0,
  "relevance_reason": "Directly explains how you resolved the team disagreement using objective benchmarks and consensus.",
  "addressed_keywords": ["disagreement", "team conflict", "resolution"],
  "missing_keywords": ["future prevention"]
}
"""


def analyze_relevance_claude(question: str, answer: str) -> dict[str, Any]:
    """Analyzes semantic answer relevance using Claude at temperature 0."""
    q_trimmed = question.strip() if question else ""
    a_trimmed = answer.strip() if answer else ""
    if not q_trimmed:
        return {
            "score": 50.0,
            "relevance_reason": "No question provided to evaluate relevance against.",
            "addressed_keywords": [],
            "missing_keywords": [],
            "question_keyword_count": 0,
            "sufficient_data": False,
            "formula": "No question text provided — neutral score returned.",
            "relevance_engine": "claude",
        }
    if not a_trimmed:
        return {
            "score": 0.0,
            "relevance_reason": "No answer provided to address the question.",
            "addressed_keywords": [],
            "missing_keywords": [q_trimmed],
            "question_keyword_count": 1,
            "sufficient_data": False,
            "formula": "Empty answer provided.",
            "relevance_engine": "claude",
        }

    client, model = _get_anthropic_client()
    prompt_text = f"Question:\n{q_trimmed}\n\nStudent's Answer:\n{a_trimmed}"
    response = client.messages.create(
        model=model,
        max_tokens=800,
        temperature=0.0,
        system=RELEVANCE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt_text}],
    )

    raw_text = response.content[0].text if response.content else "{}"
    cleaned = _clean_json_text(raw_text)
    data = json.loads(cleaned)

    raw_score = float(data.get("relevance_score", 50.0))
    score = max(0.0, min(100.0, round(raw_score, 1)))
    reason = str(data.get("relevance_reason", "")).strip() or "Evaluated by Claude semantic relevance model."
    addressed = [str(k) for k in data.get("addressed_keywords", [])]
    missing = [str(k) for k in data.get("missing_keywords", [])]
    total_keywords = len(addressed) + len(missing)

    return {
        "score": score,
        "relevance_reason": reason,
        "addressed_keywords": addressed,
        "missing_keywords": missing,
        "question_keyword_count": total_keywords,
        "sufficient_data": True,
        "formula": f"score = {score} (Claude AI semantic relevance). Rationale: {reason}",
        "relevance_engine": "claude",
    }


def analyze_relevance_gemini(question: str, answer: str) -> dict[str, Any]:
    """Analyzes semantic answer relevance using Google Gemini at temperature 0."""
    q_trimmed = question.strip() if question else ""
    a_trimmed = answer.strip() if answer else ""
    if not q_trimmed:
        return {
            "score": 50.0,
            "relevance_reason": "No question provided to evaluate relevance against.",
            "addressed_keywords": [],
            "missing_keywords": [],
            "question_keyword_count": 0,
            "sufficient_data": False,
            "formula": "No question text provided — neutral score returned.",
            "relevance_engine": "gemini",
        }
    if not a_trimmed:
        return {
            "score": 0.0,
            "relevance_reason": "No answer provided to address the question.",
            "addressed_keywords": [],
            "missing_keywords": [q_trimmed],
            "question_keyword_count": 1,
            "sufficient_data": True,
            "formula": "Empty answer score = 0.0.",
            "relevance_engine": "gemini",
        }

    user_payload = f"Question asked:\n{q_trimmed}\n\nStudent's answer:\n{a_trimmed}"
    data = _call_gemini_json_api(RELEVANCE_SYSTEM_PROMPT, user_payload)

    raw_score = float(data.get("relevance_score", 70.0))
    score = max(0.0, min(100.0, round(raw_score, 1)))

    reason = str(data.get("relevance_reason", "")).strip() or "Evaluated by Gemini semantic relevance model."
    addressed = [str(k).strip() for k in data.get("addressed_keywords", []) if str(k).strip()]
    missing = [str(k).strip() for k in data.get("missing_keywords", []) if str(k).strip()]
    total_keywords = len(addressed) + len(missing)

    return {
        "score": score,
        "relevance_score": score,
        "relevance_reason": reason,
        "addressed_keywords": addressed,
        "missing_keywords": missing,
        "question_keyword_count": total_keywords,
        "sufficient_data": len(a_trimmed.split()) >= 10,
        "formula": f"score = {score} (Gemini AI semantic relevance). Rationale: {reason}",
        "relevance_engine": "gemini",
    }


def get_relevance_analysis(question: str, answer: str) -> dict[str, Any]:
    """Fallback dispatcher: Gemini -> Claude -> relevance_analysis.analyze_relevance (heuristic)."""
    try:
        return analyze_relevance_gemini(question, answer)
    except Exception as exc:
        logger.info("Gemini relevance evaluation skipped/unavailable (%s).", exc)

    try:
        return analyze_relevance_claude(question, answer)
    except Exception as exc:
        logger.info("Claude relevance evaluation unavailable (%s); using heuristic lemma overlap.", exc)
        res = relevance_analysis.analyze_relevance(question, answer)
        res["relevance_engine"] = "heuristic"


        score = res.get("score", 50.0)
        addressed = res.get("addressed_keywords", [])
        missing = res.get("missing_keywords", [])
        total = res.get("question_keyword_count", len(addressed) + len(missing))

        if not question or not question.strip():
            reason = "No question text was specified for relevance scoring."
        elif not answer or not answer.strip():
            reason = "No answer was recorded."
        elif score >= 75:
            reason = f"Directly addresses {len(addressed)} of {total} core topic concepts ({', '.join(addressed[:3])})."
        elif score >= 40:
            reason = (
                f"Partially relevant ({len(addressed)}/{total} topic keywords matched). "
                f"Consider addressing: {', '.join(missing[:2]) if missing else 'more prompt specifics'}."
            )
        else:
            reason = (
                f"Limited topic overlap ({len(addressed)}/{total} keywords found). "
                f"Make sure to address: {', '.join(missing[:3]) if missing else 'the prompt core'}."
            )

        res["relevance_reason"] = reason
        return res


# ============================================================================
# 3. INTERVIEW FOLLOW-UP QUESTION GENERATION
# ============================================================================

FOLLOWUP_SYSTEM_PROMPT = """You are an experienced technical and behavioral interviewer.
Generate ONE probing follow-up question based directly on what the candidate mentioned in their answer.

STRICT RULES:
1. Probe into a specific project, technology, metric, architectural choice, challenge, or team dynamic mentioned.
2. The question must sound natural, curious, and professional.
3. If the candidate's answer is empty, extremely brief (<8 words), or completely generic, return null for both fields.
4. Do NOT repeat a phrase or topic that is in the already_referenced list.
5. Output ONLY valid JSON:
{
  "phrase": "the specific project, tool, or challenge referenced",
  "question_text": "probed follow-up question text"
}
"""


def generate_followup_claude(
    question: str,
    answer: str,
    already_referenced: set[str] | None = None,
) -> dict[str, Any] | None:
    """Generates a dynamic interview follow-up question via Claude at temperature 0."""
    a_trimmed = answer.strip() if answer else ""
    if len(a_trimmed.split()) < 6:
        return None

    client, model = _get_anthropic_client()
    ref_list = list(already_referenced) if already_referenced else []

    user_prompt = (
        f"Original Question:\n{question}\n\n"
        f"Candidate's Answer:\n{a_trimmed}\n\n"
        f"Already referenced topics (do not repeat):\n{json.dumps(ref_list)}"
    )

    response = client.messages.create(
        model=model,
        max_tokens=400,
        temperature=0.0,
        system=FOLLOWUP_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw_text = response.content[0].text if response.content else "{}"
    cleaned = _clean_json_text(raw_text)
    data = json.loads(cleaned)

    phrase = data.get("phrase")
    q_text = data.get("question_text")

    if not phrase or not q_text or not str(q_text).strip():
        return None

    return {
        "phrase": str(phrase).strip(),
        "question_text": str(q_text).strip(),
        "followup_engine": "claude",
    }


def generate_followup_gemini(
    question: str,
    answer: str,
    already_referenced: set[str] | None = None,
) -> dict[str, Any] | None:
    """Generates a dynamic interview follow-up question via Google Gemini at temperature 0."""
    a_trimmed = answer.strip() if answer else ""
    if len(a_trimmed.split()) < 6:
        return None

    ref_list = list(already_referenced) if already_referenced else []
    user_prompt = (
        f"Original Question:\n{question}\n\n"
        f"Candidate's Answer:\n{a_trimmed}\n\n"
        f"Already referenced topics (do not repeat):\n{json.dumps(ref_list)}"
    )

    data = _call_gemini_json_api(FOLLOWUP_SYSTEM_PROMPT, user_prompt)
    phrase = data.get("phrase")
    q_text = data.get("question_text")

    if not phrase or not q_text or not str(q_text).strip():
        return None

    return {
        "phrase": str(phrase).strip(),
        "question_text": str(q_text).strip(),
        "followup_engine": "gemini",
    }


def get_followup_question(
    question: str,
    answer: str,
    already_referenced: set[str] | None = None,
    template_index: int = 0,
) -> dict[str, Any] | None:
    """Fallback dispatcher: Gemini -> Claude -> followup_generator.generate_followup (heuristic)."""
    try:
        res = generate_followup_gemini(question, answer, already_referenced=already_referenced)
        if res is not None:
            return res
    except Exception as exc:
        logger.info("Gemini follow-up generation skipped/unavailable (%s).", exc)

    try:
        res = generate_followup_claude(question, answer, already_referenced=already_referenced)
        if res is not None:
            return res
    except Exception as exc:
        logger.info("Claude follow-up generation unavailable (%s); falling back to heuristic generator.", exc)

    heuristic = followup_generator.generate_followup(
        answer,
        already_referenced=already_referenced,
        template_index=template_index,
    )
    if heuristic is not None:
        heuristic["followup_engine"] = "heuristic"
    return heuristic

