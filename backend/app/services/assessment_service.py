"""
Orchestrates the NLP/speech/ML modules into the responses the API returns.
Routes stay thin; all "how do we combine these signals into one score"
decisions live here so they're testable independent of FastAPI.
"""
import logging
import os
import tempfile

from app.ml.transformer_confidence import score_confidence
from app.nlp import grammar_rules, text_analysis
from app.personalization import learner_profile
from app.schemas.assessment import (
    ExplainMistakeResponse,
    GrammarCorrection,
    TextAnalysisResponse,
    VoiceAnalysisResponse,
)
from app.schemas.common import AnalysisSource, SkillScores
from app.speech import stt
from app.speech.audio_utils import analyze_wav_pauses
from app.speech.speech_metrics import compute_speech_metrics

logger = logging.getLogger(__name__)

_RULE_EXPLANATIONS = {
    "double_negative": {
        "wrong": "Two negative words were used in the same clause.",
        "why": "In standard English, two negatives cancel out logically and read as unintentionally confusing or informal.",
        "improve": "Pair a negative verb (don't/doesn't/isn't) with a neutral word like 'any', 'anything' or 'anyone' instead of another negative.",
        "practice": "Rewrite this sentence correctly: \"I don't have no time today.\"",
    },
    "subject_verb_agreement": {
        "wrong": "The verb form doesn't match its subject in number or person.",
        "why": "Singular subjects (I, he, neither, each) need singular verb forms, and plural subjects need plural verb forms.",
        "improve": "Identify the true subject of the sentence first, then match the verb to it — ignore words in between.",
        "practice": "Fill in the blank correctly: \"Each of the students ___ (was/were) given feedback.\"",
    },
    "repeated_word": {
        "wrong": "A word was accidentally typed or said twice in a row.",
        "why": "This usually happens when speaking quickly or self-correcting mid-sentence, and it disrupts fluency for the listener.",
        "improve": "Slow down slightly at clause boundaries, and proofread written answers once before submitting.",
        "practice": "Read this sentence aloud smoothly: \"The team finally finished the the project on time.\"",
    },
    "spelling": {
        "wrong": "A commonly misspelled or informal word was used.",
        "why": "Some casual spellings (like 'alot') aren't standard English and can look careless in formal writing.",
        "improve": "Learn the standard two-word or correctly spelled form and proofread for it specifically.",
        "practice": "Correct this: \"I practiced alot this week.\"",
    },
    "homophone": {
        "wrong": "A homophone (a word that sounds like another) was used incorrectly.",
        "why": "'Your' vs 'you're' and 'their' vs 'they're' are different words with different grammatical roles.",
        "improve": "If you can expand it to 'you are' or 'they are' and it still makes sense, use the contraction with an apostrophe.",
        "practice": "Choose correctly: \"___ (Your/You're) going to do great.\"",
    },
    "formality": {
        "wrong": "A casual contraction was used in a formal communication context.",
        "why": "Interview and professional writing contexts expect a more formal register than everyday speech.",
        "improve": "Expand casual contractions (gonna, wanna, kinda) to their full form.",
        "practice": "Rewrite formally: \"I'm gonna finish it by Friday.\"",
    },
    "tense_consistency": {
        "wrong": "The sentence mixed past and present tense verbs.",
        "why": "Switching tense mid-sentence (or mid-story) makes the timeline of events unclear to the listener.",
        "improve": "Decide whether you're narrating the past or the present before you start the sentence, then keep every verb in that tense.",
        "practice": "Correct the tense: \"Yesterday I go to the office and finished my report.\"",
    },
}


def analyze_text(student_id: str, question: str, answer: str) -> TextAnalysisResponse:
    grammar_result = grammar_rules.analyze(answer)
    vocab_result = text_analysis.vocabulary_analysis(answer)
    structure_result = text_analysis.structure_analysis(answer)
    clarity_result = text_analysis.clarity_analysis(answer)
    alternative = text_analysis.better_alternative(answer, question)

    overall = round(
        grammar_result["score"] * 0.3
        + vocab_result["score"] * 0.25
        + structure_result["score"] * 0.25
        + clarity_result["score"] * 0.2,
        1,
    )

    corrections = [
        GrammarCorrection(
            original=c.original,
            corrected=c.corrected,
            reason=c.reason,
            rule=c.rule,
            category=c.category,
            confidence=c.confidence,
            sentence=c.sentence,
        )
        for c in grammar_result["corrections"]
    ]

    try:
        learner_profile.update_scores(
            student_id,
            {
                "grammar": grammar_result["score"],
                "vocabulary": vocab_result["score"],
                "response_structure": structure_result["score"],
            },
            session_type="text_practice",
        )
    except ValueError:
        logger.info("No learner profile for %s yet — skipping profile update.", student_id)

    return TextAnalysisResponse(
        source=AnalysisSource.real,
        score=overall,
        grammar_score=grammar_result["score"],
        vocabulary_score=vocab_result["score"],
        structure_score=structure_result["score"],
        clarity_score=clarity_result["score"],
        corrections=corrections,
        vocabulary_suggestions=vocab_result["suggestions"],
        repeated_words=vocab_result["repeated_words"],
        better_alternative=alternative,
        word_count=len(answer.split()),
        grammar_issue_count=grammar_result["grammar_issue_count"],
        spelling_issue_count=grammar_result["spelling_issue_count"],
        style_issue_count=grammar_result["style_issue_count"],
        grammar_score_formula=grammar_result["formula"],
        grammar_sufficient_data=grammar_result["sufficient_data"],
    )


def analyze_voice_upload(student_id: str, tmp_path: str, duration_seconds: float, language: str) -> VoiceAnalysisResponse:
    transcript, stt_source = stt.transcribe_wav(tmp_path, language=language)
    pause_analysis = analyze_wav_pauses(tmp_path)

    metrics = compute_speech_metrics(transcript, duration_seconds, real_pause_analysis=pause_analysis)
    grammar_result = grammar_rules.analyze(transcript)
    vocab_result = text_analysis.vocabulary_analysis(transcript)
    confidence_score, confidence_source = score_confidence(transcript)

    # Pronunciation has no ground truth without a phoneme-alignment model;
    # this heuristic combines STT success (recognized speech implies
    # reasonably clear pronunciation) with word length as a rough proxy for
    # articulation of more complex words, and is intentionally conservative.
    pronunciation_score = 80.0 if stt_source == AnalysisSource.real else 70.0
    pronunciation_score = round(min(96.0, pronunciation_score + (vocab_result["average_word_length"] - 4) * 2), 1)

    overall_source = AnalysisSource.real if stt_source == AnalysisSource.real else AnalysisSource.mock

    try:
        learner_profile.update_scores(
            student_id,
            {
                "grammar": grammar_result["score"],
                "vocabulary": vocab_result["score"],
                "fluency": metrics.pace_consistency,
                "speaking_pace": metrics.pace_score,
                "filler_words": max(0.0, 100.0 - metrics.filler_words_per_minute * 8),
                "confidence": confidence_score,
                "pronunciation": pronunciation_score,
            },
            session_type="voice_practice",
            duration_minutes=round(duration_seconds / 60, 2),
        )
    except ValueError:
        logger.info("No learner profile for %s yet — skipping profile update.", student_id)

    return VoiceAnalysisResponse(
        source=overall_source,
        transcript=transcript,
        grammar_score=grammar_result["score"],
        vocabulary_score=vocab_result["score"],
        fluency_score=metrics.pace_consistency,
        pronunciation_score=pronunciation_score,
        confidence_score=confidence_score,
        words_per_minute=metrics.words_per_minute,
        pace_score=metrics.pace_score,
        pace_consistency=metrics.pace_consistency,
        filler_word_count=metrics.filler_word_count,
        filler_words_per_minute=metrics.filler_words_per_minute,
        most_frequent_filler=metrics.most_frequent_filler,
        pause_count=metrics.pause_count,
        average_pause_seconds=metrics.average_pause_seconds,
    )


def explain_mistake(original: str, corrected: str, rule: str) -> ExplainMistakeResponse:
    template = _RULE_EXPLANATIONS.get(
        rule,
        {
            "wrong": "This phrasing doesn't match standard grammatical conventions.",
            "why": "Small grammar deviations like this can distract a listener or reader from your actual message.",
            "improve": "Compare your phrasing to the corrected version and notice exactly what changed.",
            "practice": f"Try rewriting this in your own words: \"{original}\"",
        },
    )
    return ExplainMistakeResponse(
        what_was_wrong=f'"{original}" — {template["wrong"]}',
        why_it_was_wrong=template["why"],
        how_to_improve=template["improve"],
        practice_question=template["practice"],
    )


def run_initial_assessment(student_id: str, intro_text: str, topic_answer: str, text_answer: str) -> SkillScores:
    """
    Combines the 4-part initial assessment (self-intro, speaking topic, text
    answer, interview question — the caller passes the transcribed/typed
    text for each) into the student's very first SkillScores, which become
    their starting learner profile.
    """
    combined_text = "\n".join(t for t in [intro_text, topic_answer, text_answer] if t)
    grammar_result = grammar_rules.analyze(combined_text)
    vocab_result = text_analysis.vocabulary_analysis(combined_text)
    structure_result = text_analysis.structure_analysis(text_answer or combined_text)
    confidence_score, _ = score_confidence(combined_text)
    speech_metrics = compute_speech_metrics(intro_text or combined_text, duration_seconds=45.0)

    scores = SkillScores(
        grammar=grammar_result["score"],
        vocabulary=vocab_result["score"],
        fluency=speech_metrics.pace_consistency,
        speaking_pace=speech_metrics.pace_score,
        filler_words=max(0.0, 100.0 - speech_metrics.filler_words_per_minute * 8),
        confidence=confidence_score,
        pronunciation=75.0,  # no audio available yet at this stage of onboarding
        response_structure=structure_result["score"],
    )

    # weight=1.0 makes this a full replacement rather than a blend — appropriate
    # since it's establishing the baseline, not adjusting an existing average —
    # while still recording it as a real session (history entry, streak day 1,
    # weakness/strength detection) via the same path every other session uses.
    try:
        learner_profile.update_scores(student_id, scores.model_dump(), session_type="initial_assessment", weight=1.0, duration_minutes=5.0)
    except ValueError:
        logger.info("No learner profile for %s yet — initial assessment not persisted.", student_id)

    return scores


def save_upload_to_tempfile(content: bytes, suffix: str = ".wav") -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(content)
    return path
