"""
Orchestrates the NLP/speech/ML modules into the responses the API returns.
Routes stay thin; all "how do we combine these signals into one score"
decisions live here so they're testable independent of FastAPI.
"""
import logging
import os
import re
import tempfile

from app.ml.transformer_confidence import score_confidence
from app.nlp import grammar_rules, llm_grammar, llm_vocab_relevance, relevance_analysis, text_analysis
from app.personalization import learner_profile
from app.schemas.assessment import (
    ExplainMistakeResponse,
    GrammarCorrection,
    SentenceAnalysis,
    SentenceMistake,
    TextAnalysisResponse,
    VoiceAnalysisResponse,
)
from app.schemas.common import AnalysisSource, SkillScores
from app.services.scoring_engine import compute_weighted_score
from app.speech import stt
from app.speech.audio_utils import analyze_wav_pauses
from app.speech.speech_metrics import compute_speech_metrics, detect_filler_words, pronunciation_proxy, text_flow_consistency

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
    "modal_of": {
        "wrong": "'of' was used after a modal verb (should/could/would/must) instead of 'have'.",
        "why": "'Should of' comes from how 'should've' sounds when spoken, but the written form is always 'should have'.",
        "improve": "Whenever you hear 'should've / could've / would've', write 'have' in full.",
        "practice": "Correct this: \"I could of finished earlier.\"",
    },
    "double_comparative": {
        "wrong": "'more' was added in front of a word that is already a comparative.",
        "why": "Words like 'better', 'easier' and 'faster' already mean 'more good / more easy / more fast', so adding 'more' repeats the idea.",
        "improve": "Use either the -er form (easier) or 'more' + the base word (more useful) — never both.",
        "practice": "Correct this: \"This method is more easier to maintain.\"",
    },
    "verb_form": {
        "wrong": "The verb form after 'didn't' (or after 'I am') is not the one standard English expects.",
        "why": "After 'did/didn't' the main verb stays in its base form because 'did' already carries the past tense. 'Agree' is itself a verb, so it doesn't need 'am' in front of it.",
        "improve": "Use 'didn't + base verb' (didn't go), and say 'I agree' instead of 'I am agree'.",
        "practice": "Correct this: \"I didn't saw the message.\"",
    },
    "preposition": {
        "wrong": "An unnecessary preposition was added after the verb.",
        "why": "Some verbs, like 'discuss', already include the meaning of 'about', so the extra word is redundant.",
        "improve": "Say 'discuss the plan', not 'discuss about the plan'.",
        "practice": "Correct this: \"We will discuss about the schedule tomorrow.\"",
    },
    "article_usage": {
        "wrong": "The wrong article ('a' / 'an') was used before this word.",
        "why": "'A' or 'an' depends on the first SOUND of the next word, not its first letter: 'an interview' but 'a university', 'an hour' but 'a house'.",
        "improve": "Say the next word aloud: if it starts with a vowel sound use 'an', otherwise use 'a'.",
        "practice": "Fill in: \"I attended ___ (a/an) interview at ___ (a/an) university.\"",
    },
    "capitalization": {
        "wrong": "The pronoun 'I' was written in lowercase.",
        "why": "'I' is always capitalized in English, including in contractions like I'm and I've.",
        "improve": "Proofread once specifically for lowercase 'i' before you submit.",
        "practice": "Correct this: \"i think i'm ready for the interview.\"",
    },
    "tense_consistency": {
        "wrong": "The sentence mixed past and present tense verbs.",
        "why": "Switching tense mid-sentence (or mid-story) makes the timeline of events unclear to the listener.",
        "improve": "Decide whether you're narrating the past or the present before you start the sentence, then keep every verb in that tense.",
        "practice": "Correct the tense: \"Yesterday I go to the office and finished my report.\"",
    },
}


def analyze_text(student_id: str, question: str, answer: str) -> TextAnalysisResponse:
    grammar_res = llm_grammar.check_grammar(answer)
    engine_used = grammar_res.get("grammar_engine", "rules")
    total_mistakes = grammar_res["total_mistakes"]
    sentences_data = grammar_res["sentences"]
    corrected_text = grammar_res["corrected_text"]
    sentence_count = max(1, grammar_res.get("sentence_count", len(sentences_data)))

    # Formula: standard CEFR / IELTS mistake density scoring (12 pts per mistake/sentence density, not 25 pts)
    mistake_density = total_mistakes / sentence_count
    grammar_score = max(25.0, min(100.0, round(100.0 - (mistake_density * 12.0), 1))) if total_mistakes > 0 else 98.0
    grammar_formula = (
        f"score = max(25, min(100, 100 - ({total_mistakes} mistakes / {sentence_count} sentences) * 12.0)) "
        f"= {grammar_score} ({engine_used.capitalize()} grammar engine)."
    )
    grammar_sufficient_data = bool(answer.strip())

    sentences = [
        SentenceAnalysis(
            original=s["original"],
            corrected=s["corrected"],
            has_errors=s["has_errors"],
            mistakes=[
                SentenceMistake(
                    wrong=m["wrong"],
                    correct=m["correct"],
                    type=m["type"],
                    explanation=m["explanation"],
                )
                for m in s.get("mistakes", [])
            ],
        )
        for s in sentences_data
    ]

    # Flatten into GrammarCorrection for backwards compatibility
    corrections: list[GrammarCorrection] = []
    for s in sentences:
        for m in s.mistakes:
            corrections.append(
                GrammarCorrection(
                    original=m.wrong,
                    corrected=m.correct,
                    reason=m.explanation,
                    rule=m.type.lower().replace(" ", "_"),
                    error_type=m.type,
                    category="spelling" if "spelling" in m.type.lower() else "grammar",
                    confidence="high",
                    sentence=s.original,
                )
            )

    grammar_issue_count = total_mistakes
    spelling_issue_count = sum(1 for c in corrections if "spelling" in c.error_type.lower())
    style_issue_count = sum(1 for c in corrections if any(k in c.error_type.lower() for k in ["style", "informal", "unnatural", "word choice"]))

    vocab_result = llm_vocab_relevance.get_vocabulary_analysis(answer)
    structure_result = text_analysis.structure_analysis(answer)
    clarity_result = text_analysis.clarity_analysis(answer)
    alternative = text_analysis.better_alternative(answer, question)
    relevance_result = llm_vocab_relevance.get_relevance_analysis(question, answer)

    overall_result = compute_weighted_score(
        [
            {"name": "grammar", "score": grammar_score, "weight": 0.25, "reliable": grammar_sufficient_data},
            {"name": "vocabulary", "score": vocab_result["score"], "weight": 0.20, "reliable": vocab_result["sufficient_data"]},
            {"name": "structure", "score": structure_result["score"], "weight": 0.20, "reliable": True},
            {"name": "clarity", "score": clarity_result["score"], "weight": 0.15, "reliable": True},
            {"name": "relevance", "score": relevance_result["score"], "weight": 0.20, "reliable": relevance_result["sufficient_data"]},
        ]
    )
    overall = overall_result["score"]

    try:
        learner_profile.update_scores(
            student_id,
            {
                "grammar": grammar_score,
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
        grammar_score=grammar_score,
        grammar_engine=engine_used,
        vocabulary_score=vocab_result["score"],
        vocab_engine=vocab_result.get("vocab_engine", "heuristic"),
        structure_score=structure_result["score"],
        clarity_score=clarity_result["score"],
        corrections=corrections,
        sentences=sentences,
        total_mistakes=total_mistakes,
        corrected_text=corrected_text,
        vocabulary_suggestions=vocab_result["suggestions"],
        repeated_words=vocab_result["repeated_words"],
        better_alternative=alternative,
        corrected_answer=corrected_text,
        word_count=len(answer.split()),
        grammar_issue_count=grammar_issue_count,
        spelling_issue_count=spelling_issue_count,
        style_issue_count=style_issue_count,
        grammar_score_formula=grammar_formula,
        grammar_sufficient_data=grammar_sufficient_data,
        lexical_diversity=vocab_result["lexical_diversity"],
        content_word_count=vocab_result["content_word_count"],
        vocabulary_score_formula=vocab_result["formula"],
        vocabulary_sufficient_data=vocab_result["sufficient_data"],
        relevance_score=relevance_result["score"],
        relevance_reason=relevance_result.get("relevance_reason", ""),
        relevance_engine=relevance_result.get("relevance_engine", "heuristic"),
        relevance_addressed_keywords=relevance_result["addressed_keywords"],
        relevance_missing_keywords=relevance_result["missing_keywords"],
        relevance_score_formula=relevance_result["formula"],
        relevance_sufficient_data=relevance_result["sufficient_data"],
        overall_score_formula=overall_result["formula"],
        overall_excluded_components=overall_result["excluded_components"],
    )


def analyze_voice_upload(
    student_id: str,
    tmp_path: str,
    duration_seconds: float,
    language: str,
    client_transcript: str | None = None,
    question: str | None = None,
) -> VoiceAnalysisResponse:
    # The server-side Google call proved unreliable from the deployed host (it
    # returned only the tail of longer clips for the same audio that transcribed
    # completely elsewhere). When the browser already recognized the speech on
    # the user's own connection, use that; pace, pauses and fluency are still
    # measured from the uploaded audio.
    client_text = (client_transcript or "").strip()
    words: list[dict] = []
    server_transcript, stt_source = stt.transcribe_wav(tmp_path, language=language)
    transcript_engine = getattr(stt, "last_transcript_engine", "gemini")
    words = getattr(stt, "last_words", [])

    client_words = len(client_text.split())
    server_words = len(server_transcript.split()) if server_transcript != stt.EMPTY_TRANSCRIPT_FALLBACK else 0

    # Pick whichever transcript captured more spoken content (guards against either side getting cut off)
    if server_words >= client_words and server_words > 0:
        transcript = server_transcript
        transcript_source = "server"
    elif client_words > 0:
        transcript = client_text
        transcript_source = "browser"
        stt_source = AnalysisSource.real
    elif server_transcript and server_transcript != stt.EMPTY_TRANSCRIPT_FALLBACK:
        transcript = server_transcript
        transcript_source = "server"
    else:
        transcript = "(Could not understand the audio, please try again)"
        transcript_source = "server"
    pause_analysis = analyze_wav_pauses(tmp_path)
    if pause_analysis is None and words:
        from app.speech.speech_metrics import compute_pauses_from_words
        pause_analysis = compute_pauses_from_words(words, duration_seconds)

    metrics = compute_speech_metrics(transcript, duration_seconds, real_pause_analysis=pause_analysis)

    # Multi-engine grammar checking
    grammar_res = llm_grammar.check_grammar(transcript)
    engine_used = grammar_res.get("grammar_engine", "rules")
    total_mistakes = grammar_res.get("total_mistakes", 0)
    sentences_data = grammar_res.get("sentences", [])
    corrected_answer = grammar_res.get("corrected_text", transcript)
    sentence_count = max(1, grammar_res.get("sentence_count", len(sentences_data)))

    sentences = [
        SentenceAnalysis(
            original=s["original"],
            corrected=s["corrected"],
            has_errors=s["has_errors"],
            mistakes=[
                SentenceMistake(
                    wrong=m["wrong"],
                    correct=m["correct"],
                    type=m["type"],
                    explanation=m["explanation"],
                )
                for m in s.get("mistakes", [])
            ],
        )
        for s in sentences_data
    ]

    corrections = []
    for s in sentences:
        for m in s.mistakes:
            corrections.append(
                GrammarCorrection(
                    original=m.wrong,
                    corrected=m.correct,
                    reason=m.explanation,
                    rule=m.type.lower().replace(" ", "_"),
                    error_type=m.type,
                    category="spelling" if "spelling" in m.type.lower() else "grammar",
                    confidence="high",
                    sentence=s.original,
                )
            )

    vocab_result = llm_vocab_relevance.get_vocabulary_analysis(transcript)
    if question and question.strip():
        relevance_res = llm_vocab_relevance.get_relevance_analysis(question, transcript)
        relevance_score = relevance_res.get("score", 0.0)
        relevance_reason = relevance_res.get("relevance_reason", "")
        relevance_engine = relevance_res.get("relevance_engine", "none")
    else:
        relevance_score = 0.0
        relevance_reason = "No speaking prompt provided for relevance assessment."
        relevance_engine = "none"

    confidence_score, confidence_source = score_confidence(transcript)

    # Pronunciation via Whisper per-word confidence probabilities
    from app.speech.speech_metrics import analyze_pronunciation_confidence
    pron_analysis = analyze_pronunciation_confidence(words)
    pronunciation_score = pron_analysis["score"]
    pronunciation_available = pron_analysis["available"]
    pronunciation_reliable = pron_analysis["reliable"]
    pronunciation_method = pron_analysis["method"]
    unclear_words = pron_analysis["unclear_words"]

    overall_source = AnalysisSource.real if stt_source == AnalysisSource.real else AnalysisSource.mock
    vocabulary_suggestions = vocab_result.get("suggestions", [])

    word_count = metrics.word_count
    sufficient_data = word_count >= 4
    if not sufficient_data:
        grammar_score = 45.0 if word_count > 0 else 0.0
        vocabulary_score = 40.0 if word_count > 0 else 0.0
        fluency_score = 45.0 if word_count > 0 else 0.0
        confidence_score = 40.0 if word_count > 0 else 0.0
        pace_score = metrics.pace_score if word_count > 0 else 0.0
    else:
        mistake_density = total_mistakes / sentence_count
        grammar_score = max(25.0, min(100.0, round(100.0 - (mistake_density * 12.0), 1))) if total_mistakes > 0 else 98.0
        vocabulary_score = vocab_result["score"]
        fluency_score = metrics.fluency_score
        pace_score = metrics.pace_score

    # Observable confidence signals
    confidence_signals: list[str] = []
    if 120 <= metrics.words_per_minute <= 165:
        confidence_signals.append(f"Steady conversational pacing ({round(metrics.words_per_minute)} wpm)")
    elif metrics.words_per_minute > 0 and metrics.words_per_minute < 105:
        confidence_signals.append(f"Slow / deliberate tempo ({round(metrics.words_per_minute)} wpm)")
    elif metrics.words_per_minute > 165:
        confidence_signals.append(f"Fast delivery tempo ({round(metrics.words_per_minute)} wpm)")

    if metrics.filler_word_count == 0:
        confidence_signals.append("Zero filler word hesitations")
    elif metrics.filler_words_per_minute < 2.0:
        confidence_signals.append(f"Low filler hesitation ({metrics.filler_word_count} filler)")
    else:
        confidence_signals.append(f"Elevated filler hesitation ({metrics.filler_word_count} fillers)")

    score_reasons = {
        "grammar": (
            f"{len(corrections)} issue(s) detected across {sentence_count} sentence(s) ({engine_used.capitalize()} engine)."
            if corrections
            else ("No grammatical or syntactic issues detected." if word_count >= 4 else "Short speech sample (< 4 words) — insufficient data for grammar evaluation.")
        ),
        "vocabulary": (
            f"Lexical diversity score of {round(vocabulary_score)}% ({vocab_result.get('content_word_count', 0)} content words)."
            if word_count >= 4
            else "Too few words to evaluate vocabulary variety."
        ),
        "fluency": (
            f"Delivery at {round(metrics.words_per_minute)} WPM with {metrics.filler_word_count} filler word(s)."
            if word_count >= 4
            else "Short speech sample cannot reliably measure speaking fluency."
        ),
        "pace": (
            f"{round(metrics.words_per_minute)} WPM ({'optimal' if 130 <= metrics.words_per_minute <= 160 else 'outside optimal'} 130-160 WPM interview range)."
            if word_count > 0
            else "0 WPM."
        ),
        "confidence": (
            f"Estimated from delivery signals: {', '.join(confidence_signals[:2])}."
            if confidence_signals
            else "Insufficient speech length to estimate confidence."
        ),
        "pronunciation": pronunciation_method,
    }

    try:
        learner_profile.update_scores(
            student_id,
            {
                "grammar": grammar_score,
                "vocabulary": vocabulary_score,
                "fluency": fluency_score,
                "speaking_pace": pace_score,
                "filler_words": max(0.0, 100.0 - metrics.filler_words_per_minute * 8),
                "confidence": confidence_score,
                "pronunciation": pronunciation_score if pronunciation_score is not None else 75.0,
            },
            session_type="voice_practice",
            duration_minutes=round(duration_seconds / 60, 2),
        )
    except ValueError:
        logger.info("No learner profile for %s yet — skipping profile update.", student_id)

    return VoiceAnalysisResponse(
        source=overall_source,
        transcript=transcript,
        grammar_score=grammar_score,
        grammar_engine=engine_used,
        vocabulary_score=vocabulary_score,
        fluency_score=fluency_score,
        pronunciation_score=pronunciation_score,
        confidence_score=confidence_score,
        words_per_minute=metrics.words_per_minute,
        pace_score=pace_score,
        pace_consistency=metrics.pace_consistency,
        filler_word_count=metrics.filler_word_count,
        filler_words_per_minute=metrics.filler_words_per_minute,
        most_frequent_filler=metrics.most_frequent_filler,
        pause_count=metrics.pause_count,
        average_pause_seconds=metrics.average_pause_seconds,
        high_confidence_filler_count=metrics.high_confidence_filler_count,
        ambiguous_filler_count=metrics.ambiguous_filler_count,
        filler_excluded_examples=metrics.excluded_examples,
        word_count=metrics.word_count,
        reference_range_wpm=metrics.reference_range_wpm,
        pace_source=metrics.pace_source,
        pronunciation_reliable=pronunciation_reliable,
        pronunciation_available=pronunciation_available,
        pronunciation_method=pronunciation_method,
        fluency_formula=metrics.fluency_formula,
        transcript_source=transcript_source,
        transcript_engine=transcript_engine,
        words=words,
        unclear_words=unclear_words,
        sentences=sentences,
        corrections=corrections,
        corrected_answer=corrected_answer,
        vocabulary_suggestions=vocabulary_suggestions,
        vocab_engine=vocab_result.get("vocab_engine", "heuristic"),
        relevance_score=relevance_score,
        relevance_reason=relevance_reason,
        relevance_engine=relevance_engine,
        score_reasons=score_reasons,
        confidence_signals=confidence_signals,
        sufficient_data=sufficient_data,
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

    # MODULE 4: this step is typed text with no real recording, so there's
    # no real speaking duration to measure WPM/pace from at all — the
    # previous code fabricated one (duration_seconds=45.0), which fed a
    # fake speaking_pace number into the student's very first profile.
    # fluency uses a real (if indirect) text-only signal instead; pace has
    # no honest signal available yet, so it starts at the same neutral
    # baseline create_profile() uses, to be replaced by real voice-practice
    # data on the first actual recording.
    fluency_estimate = text_flow_consistency(intro_text or combined_text)
    filler_result = detect_filler_words(combined_text)
    word_count = len(re.findall(r"[A-Za-z']+", combined_text))
    filler_per_word = (filler_result["count"] / word_count) if word_count else 0.0

    scores = SkillScores(
        grammar=grammar_result["score"],
        vocabulary=vocab_result["score"],
        fluency=fluency_estimate,
        speaking_pace=55.0,  # no real duration exists at this stage — neutral baseline, not a fabricated measurement
        filler_words=max(0.0, 100.0 - filler_per_word * 800),
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
