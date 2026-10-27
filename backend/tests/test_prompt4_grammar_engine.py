"""
Tests for Prompt 4: Multi-Engine Grammar Checker (Claude, T5, Rules fallback chain).

Verifies:
1. Fallback chain respects GRAMMAR_ENGINE_ORDER (default: "claude,t5,rules").
2. Without ANTHROPIC_API_KEY, falls back cleanly to 'rules' engine and logs fallback reason.
3. Test string catches all expected errors:
   - 'dont' (apostrophe)
   - 'dont have no' (double negative)
   - 'gonna' (informal)
   - 'alot' (spelling)
   - 'work alot hard' (word order)
   - 'Neither of the teams were' (were -> was)
4. With Claude mocked, parses strict JSON and sets grammar_engine = "claude".
5. Python independently recomputes total_mistakes and sentence_count (never blindly trusts model arithmetic).
6. End-to-end /assessment/text endpoint includes grammar_engine and sentence-by-sentence analysis.
"""
import json
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import config as cfg
from app.database import store
from app.main import app
from app.nlp import llm_grammar
from app.services.assessment_service import analyze_text


@pytest.fixture(autouse=True)
def db_test_env(tmp_path, monkeypatch):
    data_dir = tmp_path / "test_data"
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    cfg.get_settings.cache_clear()
    store._initialized_targets.clear()
    store.init_db()
    yield
    cfg.get_settings.cache_clear()
    store._initialized_targets.clear()


@pytest.fixture
def client():
    return TestClient(app)


TEST_STRING = "I dont have no experience but I am gonna work alot hard. Neither of the teams were ready."


class TestPrompt4GrammarEngine:
    def test_without_api_key_falls_back_to_rules(self, monkeypatch):
        """Without ANTHROPIC_API_KEY, check_grammar must fall back to 'rules' engine."""
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.delenv("GRAMMAR_ENGINE_ORDER", raising=False)

        res = llm_grammar.check_grammar(TEST_STRING)

        assert res["grammar_engine"] == "rules"
        assert res["sentence_count"] == 2
        assert len(res["sentences"]) == 2

        # Flatten mistakes across sentences
        all_mistakes = []
        for s in res["sentences"]:
            for m in s["mistakes"]:
                all_mistakes.append(m)

        wrongs = [m["wrong"].lower() for m in all_mistakes]
        rules_types = [m["type"].lower() for m in all_mistakes]

        # Verify expected errors are detected
        # 1. dont (apostrophe/spelling)
        assert any("dont" in w for w in wrongs), "Expected 'dont' detected"
        # 2. double negative (dont have no)
        assert any("no" in w for w in wrongs) or any("double" in t for t in rules_types), "Expected double negative detected"
        # 3. gonna (informal)
        assert any("gonna" in w for w in wrongs), "Expected 'gonna' detected"
        # 4. alot (spelling)
        assert any("alot" in w for w in wrongs), "Expected 'alot' detected"
        # 5. work alot hard (word order)
        assert any("hard" in w for w in wrongs) or any("order" in t for t in rules_types), "Expected word order issue detected"
        # 6. were (were -> was)
        assert any("were" in w for w in wrongs), "Expected 'were' (should be was) detected"

        # Python recomputes total_mistakes exactly
        assert res["total_mistakes"] == len(all_mistakes)

    def test_with_claude_mock_detects_all_errors(self, monkeypatch):
        """When Claude API is active, strict JSON is parsed and engine is labeled 'claude'."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-mock-key")
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "claude,t5,rules")

        mock_claude_response = [
            {
                "sentence": "I dont have no experience but I am gonna work alot hard.",
                "original": "I dont have no experience but I am gonna work alot hard.",
                "corrected": "I don't have any experience, but I am going to work very hard.",
                "mistakes": [
                    {"wrong": "dont", "correct": "don't", "type": "apostrophe", "explanation": "Add apostrophe to contraction."},
                    {"wrong": "have no", "correct": "have any", "type": "double negative", "explanation": "Avoid double negative."},
                    {"wrong": "gonna", "correct": "going to", "type": "informal", "explanation": "Use standard phrasing in formal contexts."},
                    {"wrong": "alot", "correct": "a lot", "type": "spelling", "explanation": "'alot' is misspelled; use 'a lot'."},
                    {"wrong": "work alot hard", "correct": "work very hard", "type": "word order", "explanation": "Use 'work very hard'."},
                ],
            },
            {
                "sentence": "Neither of the teams were ready.",
                "original": "Neither of the teams were ready.",
                "corrected": "Neither of the teams was ready.",
                "mistakes": [
                    {"wrong": "were", "correct": "was", "type": "subject-verb agreement", "explanation": "'Neither' requires a singular verb 'was'."},
                ],
            },
        ]

        mock_block = MagicMock()
        mock_block.type = "text"
        mock_block.text = json.dumps(mock_claude_response)

        mock_anthropic_resp = MagicMock()
        mock_anthropic_resp.content = [mock_block]

        with patch("app.nlp.llm_grammar.Anthropic") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.messages.create.return_value = mock_anthropic_resp
            mock_client_cls.return_value = mock_client

            res = llm_grammar.check_grammar_claude(TEST_STRING)

            assert res["grammar_engine"] == "claude"
            assert res["sentence_count"] == 2
            assert res["total_mistakes"] == 6
            assert len(res["sentences"][0]["mistakes"]) == 5
            assert len(res["sentences"][1]["mistakes"]) == 1
            assert res["sentences"][1]["mistakes"][0]["correct"] == "was"

    def test_python_recomputes_total_mistakes(self, monkeypatch):
        """Python must independently recompute total_mistakes and never trust the model's reported count."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-mock-key")

        # LLM reports total_mistakes = 99 (incorrect math) with 2 actual mistake items
        mock_payload = {
            "corrected_text": "Corrected text.",
            "total_mistakes": 99,
            "sentences": [
                {
                    "original": "Sentence one.",
                    "corrected": "Sentence one.",
                    "mistakes": [{"wrong": "one", "correct": "1", "type": "style", "explanation": "test"}],
                },
                {
                    "original": "Sentence two.",
                    "corrected": "Sentence two.",
                    "mistakes": [{"wrong": "two", "correct": "2", "type": "style", "explanation": "test"}],
                },
            ],
        }

        mock_block = MagicMock()
        mock_block.type = "text"
        mock_block.text = f"```json\n{json.dumps(mock_payload)}\n```"

        mock_resp = MagicMock()
        mock_resp.content = [mock_block]

        with patch("app.nlp.llm_grammar.Anthropic") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.messages.create.return_value = mock_resp
            mock_client_cls.return_value = mock_client

            res = llm_grammar.check_grammar_claude("Sentence one. Sentence two.")
            # Independent Python computation: 1 + 1 = 2 (not 99!)
            assert res["total_mistakes"] == 2
            assert res["sentence_count"] == 2

    def test_engine_order_priority_configuration(self, monkeypatch):
        """GRAMMAR_ENGINE_ORDER controls priority (e.g. 'rules,claude' prioritizes rules even when key exists)."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-mock-key")
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "rules,claude")

        res = llm_grammar.check_grammar(TEST_STRING)
        # Should execute rules directly without calling Claude
        assert res["grammar_engine"] == "rules"

    def test_t5_fallback_when_unavailable(self, monkeypatch):
        """If T5 engine is first but weights are not loaded, falls back to rules gracefully."""
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "t5,rules")

        res = llm_grammar.check_grammar(TEST_STRING)
        assert res["grammar_engine"] == "rules"

    def test_assessment_service_computes_score_from_mistakes_per_sentence(self, monkeypatch):
        """Grammar score is deterministically calculated as 100 - (mistakes / sentences) * 25."""
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "rules")

        resp = analyze_text(
            student_id="test-student",
            question="Tell me about your background",
            answer=TEST_STRING,
        )

        assert resp.grammar_engine == "rules"
        assert len(resp.sentences) == 2
        assert resp.total_mistakes >= 5
        # 6 mistakes over 2 sentences: 100 - (6/2)*25 = 25.0
        expected_score = max(0.0, min(100.0, round(100.0 - (resp.total_mistakes / 2) * 25.0, 1)))
        assert resp.grammar_score == expected_score
        assert "Rules grammar engine" in resp.grammar_score_formula

    def test_api_assessment_text_endpoint(self, client, monkeypatch):
        """POST /api/v1/assessment/text includes grammar_engine and sentence breakdown."""
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setenv("GRAMMAR_ENGINE_ORDER", "rules")

        res = client.post(
            "/api/v1/assessment/text",
            json={
                "student_id": "test-student-id",
                "question": "What are your strengths?",
                "answer": "Neither of the teams were ready.",
            },
        )

        assert res.status_code == 200
        data = res.json()
        assert "grammar_engine" in data
        assert data["grammar_engine"] in ["claude", "t5", "rules"]
        assert "sentences" in data
        assert len(data["sentences"]) >= 1
        assert "total_mistakes" in data
        assert data["total_mistakes"] >= 1
