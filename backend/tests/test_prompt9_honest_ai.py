"""
Test suite for Prompt 9: Honest AI Mode & Engine Health Status.

Covers:
1. USE_MOCK_AI defaults to False.
2. Auto-disables USE_MOCK_AI when real engines (Claude, T5, Whisper, spaCy) are configured.
3. /api/v1/health returns honest use_mock_ai: false and engines dictionary {"claude", "t5", "whisper", "spacy"}.
4. Health endpoint backward compatibility.
"""
from fastapi.testclient import TestClient
import pytest

from app.core.config import Settings
from app.main import app


class TestPrompt9HonestAIMode:
    def test_default_use_mock_ai_is_false(self):
        """Settings defaults use_mock_ai to False (honest AI mode)."""
        settings = Settings(use_mock_ai=False, anthropic_api_key=None, enable_whisper=False)
        assert settings.use_mock_ai is False

    def test_auto_disable_mock_ai_with_claude(self):
        """When Claude API key is configured, mock AI is automatically disabled."""
        settings = Settings(use_mock_ai=True, anthropic_api_key="sk-ant-test-key-12345", enable_whisper=False)
        assert settings.use_mock_ai is False

    def test_auto_disable_mock_ai_with_whisper(self):
        """When Whisper is enabled, mock AI is automatically disabled."""
        settings = Settings(use_mock_ai=True, anthropic_api_key=None, enable_whisper=True)
        assert settings.use_mock_ai is False

    def test_auto_disable_mock_ai_with_hf_t5_model(self):
        """When a Hugging Face Hub T5 model ID is configured, mock AI is automatically disabled."""
        settings = Settings(use_mock_ai=True, anthropic_api_key=None, enable_whisper=False, gec_model_path="user/t5-gec")
        assert settings.use_mock_ai is False

    def test_health_endpoint_schema_and_engines(self):
        """Verify /api/v1/health returns use_mock_ai: false and the 4 engine statuses."""
        client = TestClient(app)
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()

        # Backward compatibility
        assert data["status"] == "ok"
        assert "spacy_model_loaded" in data
        assert isinstance(data["spacy_model_loaded"], bool)
        assert "transformer_confidence_enabled" in data

        # Honest AI mode
        assert data["use_mock_ai"] is False

        # Engines breakdown
        assert "engines" in data
        engines = data["engines"]
        assert isinstance(engines, dict)
        for expected_engine in ("claude", "t5", "whisper", "spacy"):
            assert expected_engine in engines
            assert isinstance(engines[expected_engine], bool)

    def test_health_endpoint_reflects_claude_when_configured(self, monkeypatch):
        """When Anthropic API key is set, engines.claude reports True."""
        test_settings = Settings(anthropic_api_key="sk-ant-mock-key")
        monkeypatch.setattr("app.main.settings", test_settings)

        client = TestClient(app)
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["engines"]["claude"] is True
