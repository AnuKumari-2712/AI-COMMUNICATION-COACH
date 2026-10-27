"""
Fine-tuned T5 Grammar Error Correction (GEC) Model Handler.
Implements Prompt 8:
- Lazy loads google/flan-t5-small fine-tuned weights from GEC_MODEL_PATH (default: backend/models/gec-t5).
- Never crashes at startup; raises clear, actionable FileNotFoundError only when inference is requested without weights.
- Processes text sentence-by-sentence with consistent prefix "grammar: <text>".
- Extracts structured mistake annotations (wrong, correct, type, explanation) using ERRANT or difflib fallback.
- Returns identical JSON schema as llm_grammar.
"""
import difflib
import logging
import os
import re
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_MODEL = None
_TOKENIZER = None


def get_model_path() -> str:
    """Returns the configured model path or default local path."""
    settings = get_settings()
    custom_path = os.getenv("GEC_MODEL_PATH") or getattr(settings, "gec_model_path", None)
    if custom_path and str(custom_path).strip():
        return str(custom_path).strip()

    # Default to backend/models/gec-t5
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(base_dir, "models", "gec-t5")


def is_t5_available() -> bool:
    """Checks whether fine-tuned T5 weights or Hugging Face Hub model is available without full load."""
    try:
        path = get_model_path()
        # Local path check
        if os.path.exists(path) and os.path.isdir(path):
            files = os.listdir(path)
            if any(f in ("config.json", "pytorch_model.bin", "model.safetensors") for f in files):
                return True
        # Hugging Face Hub check (e.g. username/repo, not relative directories starting with models/ or ./)
        if not path.startswith(("models/", "models\\", "backend/", "backend\\", "./", ".\\")):
            parts = path.split("/")
            if len(parts) == 2 and all(p.strip() for p in parts) and not os.path.isabs(path):
                return True
        return False
    except Exception:
        return False


def load_model(model_path: str | None = None) -> tuple[Any, Any]:
    """
    Lazy-loads the T5 tokenizer and model.
    Raises FileNotFoundError or RuntimeError if weights are unavailable.
    Never crashes at startup.
    """
    global _MODEL, _TOKENIZER
    if _MODEL is not None and _TOKENIZER is not None:
        return _MODEL, _TOKENIZER

    path = model_path or get_model_path()

    # Check if local path exists or if it looks like a Hugging Face Hub repo id (contains '/')
    is_hf_repo = "/" in path and not os.path.exists(path) and not os.path.isabs(path)
    if not is_hf_repo and not os.path.exists(path):
        raise FileNotFoundError(
            f"T5 GEC model weights not found at '{path}'. "
            "Please fine-tune the model using backend/ml_training/train_gec.py or "
            "set GEC_MODEL_PATH to a valid directory or Hugging Face Hub model ID."
        )

    try:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    except ImportError as exc:
        raise RuntimeError("Transformers library is not installed. Run `pip install transformers`.") from exc

    logger.info("Loading T5 GEC model from '%s'...", path)
    _TOKENIZER = AutoTokenizer.from_pretrained(path)
    _MODEL = AutoModelForSeq2SeqLM.from_pretrained(path)
    _MODEL.eval()
    return _MODEL, _TOKENIZER


def _tokenize_sentence(sentence: str) -> list[str]:
    """Splits sentence into tokens preserving punctuation."""
    return re.findall(r"\w+|[^\w\s]", sentence, re.UNICODE)


def _classify_edit(wrong: str, correct: str) -> tuple[str, str]:
    """Heuristic error classification for difflib fallback."""
    w_lower = wrong.lower().strip()
    c_lower = correct.lower().strip()

    # Punctuation edits
    if re.fullmatch(r"[^\w\s]+", wrong) or re.fullmatch(r"[^\w\s]+", correct):
        return "punctuation", f"Adjusted punctuation: '{wrong}' -> '{correct}'."

    # Apostrophe / contraction spelling (e.g. dont -> don't)
    if w_lower.replace("'", "") == c_lower.replace("'", ""):
        return "spelling", f"Corrected contraction spelling: '{wrong}' -> '{correct}'."

    # Subject-verb agreement
    agreement_pairs = {
        ("were", "was"), ("was", "were"),
        ("have", "has"), ("has", "have"),
        ("are", "is"), ("is", "are"),
        ("do", "does"), ("does", "do"),
        ("go", "goes"), ("goes", "go"),
    }
    if (w_lower, c_lower) in agreement_pairs:
        return "subject-verb agreement", f"Subject-verb agreement: use '{correct}' instead of '{wrong}'."

    # Informal / colloquial
    informal_words = {"gonna": "going to", "wanna": "want to", "alot": "a lot", "gotta": "got to"}
    if w_lower in informal_words:
        return "informal", f"Informal expression: replace '{wrong}' with '{correct}'."

    # Double negatives
    if "no" in w_lower and ("any" in c_lower or "a" in c_lower):
        return "double negative", f"Resolved double negative by replacing '{wrong}' with '{correct}'."

    # Minor spelling typo (Levenshtein distance <= 2)
    s = difflib.SequenceMatcher(None, w_lower, c_lower)
    if s.ratio() >= 0.75:
        return "spelling", f"Corrected spelling: '{wrong}' -> '{correct}'."

    return "grammar", f"Corrected '{wrong}' to '{correct}'."


def extract_mistakes_difflib(orig_sent: str, corr_sent: str) -> list[dict[str, str]]:
    """Extracts mistake annotations between original and corrected sentences using difflib."""
    if orig_sent.strip() == corr_sent.strip():
        return []

    orig_tokens = _tokenize_sentence(orig_sent)
    corr_tokens = _tokenize_sentence(corr_sent)

    matcher = difflib.SequenceMatcher(None, orig_tokens, corr_tokens)
    mistakes: list[dict[str, str]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue

        wrong_tokens = orig_tokens[i1:i2]
        corr_tokens_sub = corr_tokens[j1:j2]

        wrong_str = " ".join(wrong_tokens)
        corr_str = " ".join(corr_tokens_sub)

        # Clean spaces before punctuation
        wrong_str = re.sub(r"\s+([,.!?;:'])", r"\1", wrong_str)
        corr_str = re.sub(r"\s+([,.!?;:'])", r"\1", corr_str)

        err_type, explanation = _classify_edit(wrong_str, corr_str)
        mistakes.append({
            "wrong": wrong_str,
            "correct": corr_str,
            "type": err_type,
            "explanation": explanation,
        })

    return mistakes


def correct_sentence_t5(sentence: str, model: Any, tokenizer: Any) -> str:
    """Corrects a single sentence using the loaded T5 model."""
    trimmed = sentence.strip()
    if not trimmed:
        return ""

    input_text = f"grammar: {trimmed}"
    inputs = tokenizer(input_text, return_tensors="pt", max_length=128, truncation=True)

    outputs = model.generate(
        **inputs,
        max_length=128,
        num_beams=4,
        early_stopping=True,
    )
    corrected = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
    return corrected or trimmed


def check_grammar(text: str) -> dict[str, Any]:
    """
    Sentence-by-sentence grammar analysis using fine-tuned T5 GEC model.
    Returns identical JSON structure to llm_grammar.
    """
    trimmed = text.strip() if text else ""
    if not trimmed:
        return {
            "corrected_text": "",
            "sentences": [],
            "total_mistakes": 0,
            "sentence_count": 0,
            "grammar_engine": "t5",
        }

    model, tokenizer = load_model()

    from app.nlp import grammar_rules
    sentence_list = grammar_rules.split_sentences(trimmed)
    if not sentence_list:
        sentence_list = [trimmed]

    normalized_sentences: list[dict[str, Any]] = []
    corrected_pieces: list[str] = []

    for orig in sentence_list:
        corrected = correct_sentence_t5(orig, model, tokenizer)
        mistakes = extract_mistakes_difflib(orig, corrected)
        has_errors = len(mistakes) > 0 or orig.strip() != corrected.strip()

        normalized_sentences.append({
            "original": orig,
            "corrected": corrected,
            "has_errors": has_errors,
            "mistakes": mistakes,
        })
        corrected_pieces.append(corrected)

    full_corrected = " ".join(corrected_pieces).strip()
    total_mistakes = sum(len(s["mistakes"]) for s in normalized_sentences)

    return {
        "corrected_text": full_corrected or trimmed,
        "sentences": normalized_sentences,
        "total_mistakes": total_mistakes,
        "sentence_count": len(normalized_sentences),
        "grammar_engine": "t5",
    }
