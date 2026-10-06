"""
Interview voice answers: the same STT-transcript problems as voice practice
(no punctuation -> 1 giant sentence) used to make every spoken answer score
clarity 40, grammar 0-50 for a single slip, and a constant 75 fluency that was
still labelled "speech_measured". These tests pin the corrected behaviour.
"""
import pytest

from app.nlp import text_analysis
from app.services import interview_service

# 60 words, no punctuation, one grammar slip ("he don't").
TRANSCRIPT = (
    "i built a hospital management system using react and node for my final year project "
    "my team had four members and i handled the backend and the database design "
    "he don't like deadlines but we planned weekly milestones and shipped the project two weeks early "
    "after launch the hospital reduced its paperwork by thirty percent"
)


@pytest.fixture
def session():
    started = interview_service.start_session("demo-student", "hr", None, None)
    return started["session_id"], started["questions"][0].id


def test_spoken_clarity_uses_pauses_not_sentence_length():
    words = len(TRANSCRIPT.split())
    assert text_analysis.clarity_analysis(TRANSCRIPT)["score"] == 40.0  # the old, broken result
    # 4 pauses -> 5 phrases -> ~12 words each -> inside the 10-22 ideal band
    spoken = text_analysis.spoken_clarity(TRANSCRIPT, pause_count=4)
    assert spoken["average_phrase_length"] == round(words / 5, 1)
    assert spoken["score"] == 95.0
    # no pauses at all: one long unbroken run is correctly hard to follow
    assert text_analysis.spoken_clarity(TRANSCRIPT, pause_count=0)["score"] == 40.0


def test_voice_answer_with_measured_audio_uses_it(session):
    session_id, question_id = session
    result = interview_service.answer_question(
        session_id, question_id, TRANSCRIPT, "voice", 30.0, speech_fluency_score=82.0, speech_pause_count=4
    )
    assert result.fluency_score == 82.0
    assert result.fluency_source == "speech_measured"
    assert result.clarity_score == 95.0


def test_voice_answer_without_audio_data_is_honestly_labelled_an_estimate(session):
    session_id, question_id = session
    result = interview_service.answer_question(session_id, question_id, TRANSCRIPT, "voice", 30.0)
    assert result.fluency_source == "text_estimated"
    assert result.clarity_score == 75.0  # neutral default, not the bogus 40


def test_voice_grammar_is_not_over_penalised_but_text_grammar_is_unchanged(session):
    session_id, question_id = session
    voice = interview_service.answer_question(session_id, question_id, TRANSCRIPT, "voice", 30.0)
    typed = interview_service.answer_question(session_id, question_id, TRANSCRIPT, "text", None)
    assert voice.grammar_score > typed.grammar_score
    # typed: one "sentence", one high-confidence error -> 100 - 1/1 * 50
    assert typed.grammar_score == 50.0
