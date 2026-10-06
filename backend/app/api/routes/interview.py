from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_student_id
from app.interview import question_bank
from app.interview.resume_parser import extract_text_from_upload
from app.schemas.interview import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewCategory,
    InterviewResultResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewSubmitRequest,
)
from app.services import interview_service

router = APIRouter(prefix="/interview", tags=["interview"])


@router.get("/categories", response_model=list[InterviewCategory])
def get_categories():
    return question_bank.get_categories()


@router.post("/start", response_model=InterviewStartResponse)
def start_interview(payload: InterviewStartRequest, student_id: str = Depends(get_current_student_id)):
    result = interview_service.start_session(
        student_id=payload.student_id or student_id,
        category_id=payload.category_id,
        job_role=payload.job_role,
        resume_text=payload.resume_text,
    )
    return result


@router.post("/resume-upload")
async def upload_resume(resume: UploadFile = File(...)):
    content = await resume.read()
    text = extract_text_from_upload(resume.filename or "resume.txt", content)
    if not text.strip():
        raise HTTPException(status_code=422, detail="Couldn't extract any text from this file.")
    return {"resume_text": text}


@router.post("/answer", response_model=InterviewAnswerResponse)
def answer(payload: InterviewAnswerRequest):
    try:
        return interview_service.answer_question(
            payload.session_id, payload.question_id, payload.answer_text, payload.mode, payload.duration_seconds,
            payload.speech_fluency_score, payload.speech_pause_count,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/submit", response_model=InterviewResultResponse)
def submit(payload: InterviewSubmitRequest):
    try:
        return interview_service.submit_session(payload.session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
