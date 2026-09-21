from fastapi import APIRouter, Depends

from app.api.deps import get_current_student_id
from app.services import content_bank, student_service

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/grammar/questions")
def get_grammar_questions(student_id: str = Depends(get_current_student_id)):
    profile = student_service.get_profile(student_id)
    return content_bank.personalized_grammar_set(profile)


@router.get("/vocabulary/words")
def get_vocabulary_words(student_id: str = Depends(get_current_student_id)):
    profile = student_service.get_profile(student_id)
    return content_bank.personalized_vocab_set(profile)
