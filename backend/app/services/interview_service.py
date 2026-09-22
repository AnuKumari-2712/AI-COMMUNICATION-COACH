"""
Interview session lifecycle: start (pick/generate questions) -> answer each
question (voice or text) -> submit (aggregate into a final result and fold
the outcome back into the learner profile).

Sessions are short-lived, so they're kept in-memory rather than in the
JSON "database" — a real deployment would put these in Redis or a database
table with a TTL.
"""
import logging
import uuid

from app.interview import question_bank
from app.interview.structure_analyzer import evaluate_star_format, evaluate_structure
from app.ml.transformer_confidence import score_confidence
from app.nlp import grammar_rules, relevance_analysis, text_analysis
from app.personalization import learner_profile
from app.schemas.common import AnalysisSource
from app.schemas.interview import (
    AnswerStructureScore,
    InterviewAnswerResponse,
    InterviewQuestion,
    InterviewResultResponse,
)
from app.speech.speech_metrics import compute_speech_metrics, detect_filler_words, pronunciation_proxy, text_flow_consistency

logger = logging.getLogger(__name__)

_sessions: dict[str, dict] = {}


def start_session(student_id: str, category_id: str, job_role: str | None, resume_text: str | None) -> dict:
    profile = learner_profile.get_profile(student_id) or learner_profile.get_or_create_demo_profile()

    if category_id == "resume" and resume_text:
        raw_questions = question_bank.get_resume_based_questions(resume_text, profile.career_goal)
    elif category_id == "job_role" and job_role:
        raw_questions = question_bank.get_job_role_questions(job_role)
    else:
        raw_questions = question_bank.get_fixed_questions(category_id)

    session_id = str(uuid.uuid4())
    questions = [
        InterviewQuestion(id=f"{session_id}-q{i}", text=q, stage=category_id)
        for i, q in enumerate(raw_questions)
    ]
    _sessions[session_id] = {
        "student_id": student_id,
        "category_id": category_id,
        "questions": {q.id: q.text for q in questions},
        "answers": [],
    }
    return {"session_id": session_id, "category_id": category_id, "questions": questions}


def answer_question(session_id: str, question_id: str, answer_text: str, mode: str, duration_seconds: float | None) -> InterviewAnswerResponse:
    session = _sessions.get(session_id)
    if session is None:
        raise ValueError(f"Unknown interview session_id={session_id}")

    grammar_result = grammar_rules.analyze(answer_text)
    vocab_result = text_analysis.vocabulary_analysis(answer_text)
    confidence_score, confidence_source = score_confidence(answer_text)

    # MODULE 7: question text was already available per-question (session
    # stores it at start_session) but was never compared against the
    # answer at all — there was no relevance signal of any kind, so a
    # completely off-topic answer could score well on every other metric
    # with nothing flagging it.
    question_text = session["questions"].get(question_id, "")
    relevance_result = relevance_analysis.analyze_relevance(question_text, answer_text)

    is_behavioral = session["category_id"] in ("behavioral", "mock")
    if is_behavioral:
        structure_result = evaluate_star_format(answer_text)
        structure = AnswerStructureScore(
            introduction=structure_result["components"]["situation"],
            main_point=structure_result["components"]["task"],
            supporting_explanation=structure_result["components"]["action"],
            example=structure_result["components"]["action"],
            conclusion=structure_result["components"]["result"],
        )
        structure_score = structure_result["score"]
    else:
        generic = evaluate_structure(answer_text)
        c = generic["components"]
        structure = AnswerStructureScore(**c)
        structure_score = generic["score"]

    # MODULE 4: fluency_score used to be a flat hardcoded 90.0 (text mode) or
    # 70.0 (voice mode with no duration) — neither derived from anything
    # about the actual answer. Real speech timing gives a real measurement;
    # without it, fall back to a genuine (if indirect) text-based signal
    # instead of a made-up constant. filler_count now always goes through
    # the same context-aware detector from Module 3, instead of a separate,
    # cruder presence-check re-implementation that lived here before.
    if mode == "voice" and duration_seconds and duration_seconds > 0:
        metrics = compute_speech_metrics(answer_text, duration_seconds)
        fluency_score = metrics.pace_consistency
        filler_count = metrics.filler_word_count
        fluency_source = "speech_measured"
    else:
        fluency_score = text_flow_consistency(answer_text)
        filler_count = detect_filler_words(answer_text)["count"]
        fluency_source = "text_estimated"

    clarity_result = text_analysis.clarity_analysis(answer_text)

    feedback_bits = []
    if relevance_result["sufficient_data"] and relevance_result["score"] < 50:
        feedback_bits.append("make sure you directly address what the question is asking")
    if structure_score < 60:
        feedback_bits.append("try structuring your answer with a clear beginning, middle and end")
    if filler_count > 3:
        feedback_bits.append("watch your filler word usage")
    if grammar_result["score"] < 70:
        feedback_bits.append("double check verb tense consistency")
    feedback = "Solid answer overall." if not feedback_bits else "Focus on: " + "; ".join(feedback_bits) + "."

    session["answers"].append(
        {
            "question_id": question_id,
            "answer_text": answer_text,
            "mode": mode,
            "grammar": grammar_result["score"],
            "vocabulary": vocab_result["score"],
            "fluency": fluency_score,
            "confidence": confidence_score,
            "clarity": clarity_result["score"],
            "structure": structure_score,
            "filler_count": filler_count,
            "relevance": relevance_result["score"],
            "relevance_sufficient_data": relevance_result["sufficient_data"],
            # NOTE: this is practice-TIME bookkeeping only (feeds streak/total
            # practice minutes), separate from fluency/pace scoring above —
            # a typed answer has no speech duration, so 90s is an honest
            # documented estimate for session-length tracking, never used
            # to compute WPM or any "measured" score.
            "duration_seconds": duration_seconds if duration_seconds and duration_seconds > 0 else 90.0,
        }
    )

    return InterviewAnswerResponse(
        source=AnalysisSource.real,
        grammar_score=grammar_result["score"],
        vocabulary_score=vocab_result["score"],
        fluency_score=fluency_score,
        fluency_source=fluency_source,
        confidence_score=confidence_score,
        clarity_score=clarity_result["score"],
        structure=structure,
        structure_score=structure_score,
        filler_word_count=filler_count,
        relevance_score=relevance_result["score"],
        relevance_addressed_keywords=relevance_result["addressed_keywords"],
        relevance_missing_keywords=relevance_result["missing_keywords"],
        relevance_sufficient_data=relevance_result["sufficient_data"],
        feedback=feedback,
    )


def submit_session(session_id: str) -> InterviewResultResponse:
    session = _sessions.get(session_id)
    if session is None:
        raise ValueError(f"Unknown interview session_id={session_id}")
    answers = session["answers"]
    if not answers:
        raise ValueError("Cannot submit an interview with no answered questions.")

    def avg(key: str) -> float:
        return round(sum(a[key] for a in answers) / len(answers), 1)

    grammar = avg("grammar")
    vocabulary = avg("vocabulary")
    fluency = avg("fluency")
    confidence = avg("confidence")
    clarity = avg("clarity")
    structure = avg("structure")
    relevance = avg("relevance")
    relevance_sufficient_data = all(a["relevance_sufficient_data"] for a in answers)

    # MODULE 5: pronunciation used to be a flat hardcoded 78.0 for every
    # interview, regardless of anything in the actual answers — the exact
    # "score from the LLM's imagination" the audit flags as VERY IMPORTANT
    # to avoid. There's no audio here at all (interview answers are text,
    # whether typed or already-transcribed client-side), so this can only
    # ever be a weak transcript-based proxy — never a real measurement.
    # It's now derived from the actual answers' average word length, and
    # always reported with reliable=False and an explicit method string,
    # via the same pronunciation_proxy() used by voice assessment.
    all_answer_text = " ".join(a["answer_text"] for a in answers)
    vocab_of_answers = text_analysis.vocabulary_analysis(all_answer_text)
    pronunciation_result = pronunciation_proxy(vocab_of_answers["average_word_length"], stt_used=False)
    pronunciation = pronunciation_result["score"]

    communication = round((grammar + vocabulary + clarity + structure) / 4, 1)
    overall = round((communication + confidence + fluency + pronunciation) / 4, 1)

    went_well = []
    needs_improvement = []
    recommended = []

    if grammar >= 75:
        went_well.append("Consistently correct grammar throughout your answers.")
    else:
        needs_improvement.append("Grammar consistency, particularly verb tense, needs attention.")
        recommended.append("Complete a Grammar Practice session focused on tense consistency.")

    if structure >= 70:
        went_well.append("Clear, well-structured answers with a logical flow.")
    else:
        needs_improvement.append("Answer structure could be clearer — aim for intro, point, example, conclusion.")
        recommended.append("Practice STAR-format storytelling in Fluency Practice.")

    if relevance_sufficient_data:
        if relevance >= 65:
            went_well.append("Your answers stayed clearly on-topic and addressed what was asked.")
        else:
            needs_improvement.append("Some answers didn't fully address what the question was asking.")
            recommended.append("Practice reading the question closely and directly answering each part before adding detail.")

    total_fillers = sum(a["filler_count"] for a in answers)
    if total_fillers <= len(answers) * 1:
        went_well.append("Minimal filler word usage — you sounded composed.")
    else:
        needs_improvement.append("Noticeable filler words during your answers.")
        recommended.append("Try the pacing/filler-word drill in Voice Practice.")

    if confidence >= 70:
        went_well.append("You came across as confident and assertive.")
    else:
        needs_improvement.append("Your phrasing came across as slightly hesitant in places.")
        recommended.append("Practice a confidence-building speaking exercise.")

    student_id = session["student_id"]
    total_minutes = round(sum(a["duration_seconds"] for a in answers) / 60, 1)
    try:
        learner_profile.update_scores(
            student_id,
            {
                "grammar": grammar,
                "vocabulary": vocabulary,
                "fluency": fluency,
                "confidence": confidence,
                "response_structure": structure,
            },
            session_type="interview",
            duration_minutes=total_minutes,
        )
    except ValueError:
        logger.info("No learner profile for %s — interview result not persisted.", student_id)

    del _sessions[session_id]

    return InterviewResultResponse(
        overall=overall,
        communication=communication,
        confidence=confidence,
        clarity=clarity,
        grammar=grammar,
        vocabulary=vocabulary,
        structure=structure,
        fluency=fluency,
        pronunciation=pronunciation,
        pronunciation_reliable=pronunciation_result["reliable"],
        pronunciation_method=pronunciation_result["method"],
        relevance=relevance,
        relevance_sufficient_data=relevance_sufficient_data,
        went_well=went_well or ["You completed the full interview — that's a strong first step."],
        needs_improvement=needs_improvement or ["No major issues detected — keep practicing to maintain this level."],
        recommended_exercises=recommended or ["Take another mock interview to build consistency."],
    )
