import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import get_current_student_id
from app.core.config import get_settings
from app.schemas.assessment import (
    ExplainMistakeRequest,
    ExplainMistakeResponse,
    TextAnalysisRequest,
    TextAnalysisResponse,
    VoiceAnalysisResponse,
)
from app.services import assessment_service
from pydantic import BaseModel

router = APIRouter(prefix="/assessment", tags=["assessment"])


class InitialAssessmentRequest(BaseModel):
    student_id: str
    intro_text: str = ""
    topic_answer: str = ""
    text_answer: str = ""


@router.post("/initial")
def run_initial_assessment(payload: InitialAssessmentRequest):
    scores = assessment_service.run_initial_assessment(
        payload.student_id, payload.intro_text, payload.topic_answer, payload.text_answer
    )
    return scores


@router.post("/text", response_model=TextAnalysisResponse)
def analyze_text(payload: TextAnalysisRequest):
    if len(payload.answer.strip()) < 3:
        raise HTTPException(status_code=422, detail="Answer is too short to analyze.")
    return assessment_service.analyze_text(payload.student_id, payload.question, payload.answer)


@router.post("/voice", response_model=VoiceAnalysisResponse)
async def analyze_voice(
    student_id: str = Depends(get_current_student_id),
    duration_seconds: float = Form(...),
    audio: UploadFile = File(...),
):
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty audio upload.")

    suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
    tmp_path = assessment_service.save_upload_to_tempfile(content, suffix=suffix)
    try:
        settings = get_settings()
        return assessment_service.analyze_voice_upload(student_id, tmp_path, duration_seconds, settings.stt_language)
    finally:
        os.remove(tmp_path)


@router.post("/explain-mistake", response_model=ExplainMistakeResponse)
def explain_mistake(payload: ExplainMistakeRequest):
    return assessment_service.explain_mistake(payload.original, payload.corrected, payload.rule)
