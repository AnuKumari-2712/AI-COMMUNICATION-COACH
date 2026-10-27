"""
Unit tests for LLM-based grammar checker and fallback behavior.
"""
import json
from unittest.mock import MagicMock, patch

import pytest

from app.nlp.llm_grammar import _clean_json_text, check_grammar, check_grammar_claude
from app.services.assessment_service import analyze_text


def test_clean_json_text_strips_code_fences():
    raw_markdown = """```json
{
  "corrected_text": "I have experience.",
  "sentences": [
    {
      "original": "I has experience.",
      "corrected": "I have experience.",
      "has_errors": true,
      "mistakes": [
        {
          "wrong": "has",
          "correct": "have",
          "type": "subject-verb agreement",
          "explanation": "Use 'have' with first-person pronoun 'I'."
        }
      ]
    }
  ]
}
```"""
    cleaned = _clean_json_text(raw_markdown)
    parsed = json.loads(cleaned)
    assert parsed["corrected_text"] == "I have experience."
    assert len(parsed["sentences"]) == 1


def test_clean_json_text_plain():
    raw = '{"corrected_text": "Hello world.", "sentences": []}'
    assert json.loads(_clean_json_text(raw)) == {"corrected_text": "Hello world.", "sentences": []}


def test_check_grammar_raises_when_no_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with patch("app.nlp.llm_grammar.get_settings") as mock_settings:
        mock_settings.return_value.anthropic_api_key = None
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY not configured"):
            check_grammar_claude("This are wrong.")


def test_check_grammar_empty_string(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-mock")
    res = check_grammar("   ")
    assert res["corrected_text"] == ""
    assert res["sentences"] == []
    assert res["total_mistakes"] == 0


def test_check_grammar_with_mock_client(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-mock")

    mock_llm_payload = {
        "corrected_text": "I don't have any experience, but I am going to work very hard. Neither of the teams was ready.",
        "sentences": [
            {
                "original": "I dont have no experience but I am gonna work alot hard.",
                "corrected": "I don't have any experience, but I am going to work very hard.",
                "has_errors": True,
                "mistakes": [
                    {
                        "wrong": "dont",
                        "correct": "don't",
                        "type": "punctuation",
                        "explanation": "Missing apostrophe in contraction."
                    },
                    {
                        "wrong": "have no",
                        "correct": "have any",
                        "type": "grammar",
                        "explanation": "Avoid double negative."
                    },
                    {
                        "wrong": "gonna",
                        "correct": "going to",
                        "type": "word choice",
                        "explanation": "Use formal phrasing in professional context."
                    },
                    {
                        "wrong": "alot hard",
                        "correct": "very hard",
                        "type": "word choice",
                        "explanation": "Incorrect adverbial phrasing."
                    }
                ]
            },
            {
                "original": "Neither of the teams were ready.",
                "corrected": "Neither of the teams was ready.",
                "has_errors": True,
                "mistakes": [
                    {
                        "wrong": "were",
                        "correct": "was",
                        "type": "subject-verb agreement",
                        "explanation": "'Neither' takes a singular verb."
                    }
                ]
            }
        ]
    }

    mock_text_block = MagicMock()
    mock_text_block.type = "text"
    mock_text_block.text = f"```json\n{json.dumps(mock_llm_payload)}\n```"

    mock_response = MagicMock()
    mock_response.content = [mock_text_block]

    with patch("app.nlp.llm_grammar.Anthropic") as mock_anthropic_cls:
        mock_instance = MagicMock()
        mock_instance.messages.create.return_value = mock_response
        mock_anthropic_cls.return_value = mock_instance

        res = check_grammar("I dont have no experience but I am gonna work alot hard. Neither of the teams were ready.")

        assert res["total_mistakes"] == 5
        assert len(res["sentences"]) == 2
        assert res["sentences"][0]["has_errors"] is True
        assert len(res["sentences"][0]["mistakes"]) == 4
        assert res["sentences"][1]["mistakes"][0]["correct"] == "was"


def test_analyze_text_with_llm(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-mock")

    mock_llm_result = {
        "corrected_text": "I have experience. My skills are strong.",
        "sentences": [
            {
                "original": "I has experience.",
                "corrected": "I have experience.",
                "has_errors": True,
                "mistakes": [
                    {
                        "wrong": "has",
                        "correct": "have",
                        "type": "subject-verb agreement",
                        "explanation": "Use 'have' with 'I'."
                    }
                ]
            },
            {
                "original": "My skills are strong.",
                "corrected": "My skills are strong.",
                "has_errors": False,
                "mistakes": []
            }
        ],
        "total_mistakes": 1
    }

    with patch("app.nlp.llm_grammar.check_grammar", return_value=mock_llm_result):
        resp = analyze_text(
            student_id="test_student",
            question="Tell me about yourself",
            answer="I has experience. My skills are strong."
        )

        assert resp.total_mistakes == 1
        assert len(resp.sentences) == 2
        assert resp.sentences[0].has_errors is True
        assert resp.sentences[1].has_errors is False
        # 1 mistake over 2 sentences: 100 - (1/2)*25 = 87.5
        assert resp.grammar_score == 87.5
        assert resp.corrected_text == "I have experience. My skills are strong."
        assert len(resp.corrections) == 1
        assert resp.corrections[0].original == "has"
        assert resp.corrections[0].corrected == "have"


def test_analyze_text_fallback_on_llm_failure(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with patch("app.nlp.llm_grammar.get_settings") as mock_settings:
        mock_settings.return_value.anthropic_api_key = None

        resp = analyze_text(
            student_id="test_student",
            question="Tell me about yourself",
            answer="I has a project. I am study in college."
        )

        assert resp.grammar_score < 100
        assert len(resp.sentences) > 0
        assert resp.total_mistakes > 0
        assert resp.corrected_text != ""
