from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_student_id
from app.services import coach_service, student_service

router = APIRouter(prefix="/coach", tags=["coach"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, student_id: str = Depends(get_current_student_id)):
    reply = coach_service.chat(student_id, payload.message)
    return ChatResponse(reply=reply)


@router.get("/suggested-prompts")
def suggested_prompts(student_id: str = Depends(get_current_student_id)):
    profile = student_service.get_profile(student_id)
    return coach_service.suggested_prompts(profile)
