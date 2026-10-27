"""
Tests for Prompt 8: T5 Grammar Error Correction (GEC) Model.

Verifies:
1. gec_model.load_model() raises FileNotFoundError with helpful message when model weights do not exist,
   and never crashes on module import.
2. extract_mistakes_difflib() extracts correct annotations (wrong, correct, type, explanation).
3. With a mocked T5 model and tokenizer, gec_model.check_grammar() produces the standard JSON schema,
   sets grammar_engine = 't5', and recomputes mistake counts in Python.
4. llm_grammar.check_grammar() respects GRAMMAR_ENGINE_ORDER='t5,rules', using T5 when available
   and falling back cleanly to 'rules' when weights are absent.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.nlp import gec_model, llm_grammar


class TestPrompt8T5GEC:
    def test_missing_weights_raises_filenotfound(self, monkeypatch, tmp_path):
        """Missing weights must raise FileNotFoundError on demand, without crashing on import."""
        non_existent_path = str(tmp_path / "does_not_exist_weights")
        monkeypatch.setenv("GEC_MODEL_PATH", non_existent_path)

        with pytest.raises(FileNotFoundError) as exc_info:
            gec_model.load_model(non_existent_path)

        assert "T5 GEC model weights not found" in str(exc_info.value)

    def test_difflib_mistake_extraction(self):
        """difflib extractor accurately identifies error spans and classifications."""
        orig = "I dont have no experience but I am gonna work alot hard."
        corr = "I don't have any experience but I am going to work very hard."

        mistakes = gec_model.extract_mistakes_difflib(orig, corr)
        assert len(mistakes) >= 3

        wrongs = [m["wrong"].lower() for m in mistakes]
        assert any("dont" in w for w in wrongs)
        assert any("no" in w for w in wrongs)
        assert any("gonna" in w for w in wrongs)

        # Subject-verb agreement
        orig_sva = "Neither of the teams were ready."
        corr_sva = "Neither of the teams was ready."
        sva_mistakes = gec_model.extract_mistakes_difflib(orig_sva, corr_sva)
        assert len(sva_mistakes) == 1
        assert sva_mistakes[0]["wrong"] == "were"
        assert sva_mistakes[0]["correct"] == "was"
        assert sva_mistakes[0]["type"] == "subject-verb agreement"

    def test_check_grammar_with_mocked_t5(self, monkeypatch):
        """Mocked T5 model generates corrections and formats standard JSON schema."""
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()

        # Mock tokenizer encode/decode
        mock_tokenizer.return_value = {"input_ids": [1, 2, 3]}
        mock_model.generate.return_value = [[4, 5, 6]]
        mock_tokenizer.decode.side_effect = [
            "Neither of the teams was ready.",
            "I have two pens.",
        ]

        with patch("app.nlp.gec_model.load_model", return_value=(mock_model, mock_tokenizer)):
            test_text = "Neither of the teams were ready. I has two pen."
            res = gec_model.check_grammar(test_text)

            assert res["grammar_engine"] == "t5"
            assert res["sentence_count"] == 2
            assert len(res["sentences"]) == 2
            assert res["total_mistakes"] >= 1
            assert "Neither of the teams was ready." in res["corrected_text"]

            # First sentence check
            s1 = res["sentences"][0]
            assert s1["original"] == "Neither of the teams were ready."
            assert s1["corrected"] == "Neither of the teams was ready."
            assert s1["has_errors"] is True
            assert any(m["wrong"] == "were" and m["correct"] == "was" for m in s1["mistakes"])

    def test_llm_grammar_fallback_to_rules_when_t5_weights_missing(self, monkeypatch, tmp_path):
        """When GRAMMAR_ENGINE_ORDER='t5,rules' and weights are absent, cleanly fall back to rules."""
        non_existent_path = str(tmp_path / "missing_t5")
        monkeypatch.setenv("GEC_MODEL_PATH", non_existent_path)
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "t5,rules")
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        res = llm_grammar.check_grammar("Neither of the teams were ready.")
        assert res["grammar_engine"] == "rules"
        assert res["sentence_count"] == 1
        assert res["total_mistakes"] >= 1

    def test_llm_grammar_uses_t5_when_available(self, monkeypatch):
        """When GRAMMAR_ENGINE_ORDER='t5,rules' and T5 is available, uses t5 engine."""
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "t5,rules")
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer.return_value = {"input_ids": [1, 2, 3]}
        mock_model.generate.return_value = [[4, 5, 6]]
        mock_tokenizer.decode.return_value = "Neither of the teams was ready."

        with patch("app.nlp.gec_model.load_model", return_value=(mock_model, mock_tokenizer)):
            res = llm_grammar.check_grammar("Neither of the teams were ready.")
            assert res["grammar_engine"] == "t5"
            assert res["total_mistakes"] == 1
            assert res["sentences"][0]["mistakes"][0]["correct"] == "was"
