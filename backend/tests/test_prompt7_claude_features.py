"""
Tests for Prompt 7: Vocabulary, Answer Relevance, and Interview Follow-up with Claude and Heuristic Fallbacks.

Verifies:
1. Vocabulary analysis with Claude mocked returns context_appropriateness_score, word suggestions with example sentences,
   and tags vocab_engine = 'claude' while recomputing lexical metrics in Python.
2. Vocabulary analysis falls back cleanly to 'heuristic' when ANTHROPIC_API_KEY is missing or errors out.
3. Relevance analysis with Claude mocked evaluates semantic relevance (0-100), provides a concise one-line reason,
   and tags relevance_engine = 'claude'.
4. Relevance analysis falls back cleanly to 'heuristic' when ANTHROPIC_API_KEY is missing or errors out.
5. Interview follow-up generation with Claude mocked builds probing follow-up questions tailored to answer specifics,
   tagging followup_engine = 'claude'.
6. Interview follow-up generation falls back cleanly to 'heuristic' when ANTHROPIC_API_KEY is missing or errors out.
7. End-to-end /assessment/text endpoint includes vocab_engine, relevance_engine, and relevance_reason.
8. End-to-end /interview/answer endpoint includes vocab_engine, relevance_engine, relevance_reason, and followup_engine.
"""
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import config as cfg
from app.database import store
from app.main import app
from app.nlp import llm_vocab_relevance


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


SAMPLE_QUESTION = "Tell me about a time you handled conflict in a team."
SAMPLE_ANSWER = (
    "In my last project, two developers disagreed on whether to use GraphQL or REST. "
    "I organized a technical benchmarking session where we evaluated both options against our latency and caching requirements. "
    "Based on empirical results, the team aligned on REST, which helped us launch on schedule."
)


class TestPrompt7Vocabulary:
    def test_vocabulary_without_api_key_falls_back_to_heuristic(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        result = llm_vocab_relevance.get_vocabulary_analysis(SAMPLE_ANSWER)

        assert result["vocab_engine"] == "heuristic"
        assert result["score"] >= 0.0
        assert result["lexical_diversity"] > 0.0
        assert "suggestions" in result
        assert isinstance(result["suggestions"], list)

    def test_vocabulary_with_claude_mocked(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-claude-vocab")

        mock_claude_json = json.dumps({
            "context_appropriateness_score": 91.5,
            "better_word_suggestions": [
                {
                    "word": "disagreed",
                    "suggested": "held divergent perspectives",
                    "reason": "Sounds more diplomatic and professional.",
                    "example_sentence": "The engineers held divergent perspectives on API architecture.",
                },
                {
                    "word": "aligned",
                    "suggested": "reached consensus",
                    "reason": "Emphasizes team unity and leadership.",
                    "example_sentence": "After reviewing benchmark data, the engineers reached consensus.",
                },
                {
                    "word": "launched",
                    "suggested": "deployed the production release",
                    "reason": "More technically specific.",
                    "example_sentence": "We deployed the production release on schedule.",
                },
            ],
            "weak_or_repeated_words": ["stuff", "disagreed"],
        })

        mock_msg = MagicMock()
        mock_msg.content = [MagicMock(text=mock_claude_json)]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_msg

        with patch("app.nlp.llm_vocab_relevance.Anthropic", return_value=mock_client):
            result = llm_vocab_relevance.get_vocabulary_analysis(SAMPLE_ANSWER)

        assert result["vocab_engine"] == "claude"
        assert result["score"] == 91.5
        assert result["context_appropriateness_score"] == 91.5
        assert len(result["suggestions"]) == 3
        assert 'Replace "disagreed" with "held divergent perspectives"' in result["suggestions"][0]
        assert "held divergent perspectives" in result["suggestions"][0]
        # Lexical diversity computed in Python
        assert result["lexical_diversity"] > 0.0
        assert result["content_word_count"] > 0


class TestPrompt7Relevance:
    def test_relevance_without_api_key_falls_back_to_heuristic(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        result = llm_vocab_relevance.get_relevance_analysis(SAMPLE_QUESTION, SAMPLE_ANSWER)

        assert result["relevance_engine"] == "heuristic"
        assert result["score"] >= 0.0
        assert "relevance_reason" in result
        assert len(result["relevance_reason"]) > 5

    def test_relevance_with_claude_mocked(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-claude-relevance")

        mock_claude_json = json.dumps({
            "relevance_score": 94.0,
            "relevance_reason": "Directly describes a concrete technical disagreement, mediation process, and positive outcome.",
            "addressed_keywords": ["conflict", "team disagreement", "resolution", "benchmarking"],
            "missing_keywords": ["preventative measures"],
        })

        mock_msg = MagicMock()
        mock_msg.content = [MagicMock(text=mock_claude_json)]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_msg

        with patch("app.nlp.llm_vocab_relevance.Anthropic", return_value=mock_client):
            result = llm_vocab_relevance.get_relevance_analysis(SAMPLE_QUESTION, SAMPLE_ANSWER)

        assert result["relevance_engine"] == "claude"
        assert result["score"] == 94.0
        assert "Directly describes a concrete technical disagreement" in result["relevance_reason"]
        assert "conflict" in result["addressed_keywords"]
        assert result["sufficient_data"] is True


class TestPrompt7InterviewFollowup:
    def test_followup_without_api_key_falls_back_to_heuristic(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        followup = llm_vocab_relevance.get_followup_question(SAMPLE_QUESTION, SAMPLE_ANSWER)

        assert followup is not None
        assert followup["followup_engine"] == "heuristic"
        assert "question_text" in followup
        assert "phrase" in followup

    def test_followup_with_claude_mocked(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-claude-followup")

        mock_claude_json = json.dumps({
            "phrase": "technical benchmarking session",
            "question_text": "You mentioned organizing a benchmarking session between GraphQL and REST — what specific latency metrics proved decisive?",
        })

        mock_msg = MagicMock()
        mock_msg.content = [MagicMock(text=mock_claude_json)]

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_msg

        with patch("app.nlp.llm_vocab_relevance.Anthropic", return_value=mock_client):
            followup = llm_vocab_relevance.get_followup_question(SAMPLE_QUESTION, SAMPLE_ANSWER)

        assert followup is not None
        assert followup["followup_engine"] == "claude"
        assert followup["phrase"] == "technical benchmarking session"
        assert "what specific latency metrics proved decisive" in followup["question_text"]


class TestPrompt7EndToEndEndpoints:
    def test_text_analysis_endpoint_includes_prompt7_fields(self, client, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        resp = client.post(
            "/api/v1/assessment/text",
            json={
                "student_id": "test-student-p7",
                "question": SAMPLE_QUESTION,
                "answer": SAMPLE_ANSWER,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "vocab_engine" in data
        assert data["vocab_engine"] in ("claude", "heuristic")
        assert "relevance_engine" in data
        assert data["relevance_engine"] in ("claude", "heuristic")
        assert "relevance_reason" in data
        assert isinstance(data["relevance_reason"], str)
        assert len(data["relevance_reason"]) > 0

    def test_interview_answer_endpoint_includes_prompt7_fields(self, client, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        # Start session
        start_resp = client.post(
            "/api/v1/interview/start",
            json={
                "student_id": "test-student-p7-interview",
                "category_id": "behavioral",
            },
        )
        assert start_resp.status_code == 200
        start_data = start_resp.json()
        session_id = start_data["session_id"]
        first_q = start_data["questions"][0]

        # Answer question
        ans_resp = client.post(
            "/api/v1/interview/answer",
            json={
                "session_id": session_id,
                "question_id": first_q["id"],
                "answer_text": SAMPLE_ANSWER,
                "mode": "text",
            },
        )
        assert ans_resp.status_code == 200
        ans_data = ans_resp.json()

        assert "vocab_engine" in ans_data
        assert ans_data["vocab_engine"] in ("claude", "heuristic")
        assert "relevance_engine" in ans_data
        assert ans_data["relevance_engine"] in ("claude", "heuristic")
        assert "relevance_reason" in ans_data
        assert "followup_engine" in ans_data
        assert ans_data["followup_engine"] in ("claude", "heuristic")
        assert "followup_question" in ans_data
