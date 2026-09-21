from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import DEMO_STUDENT_ID, get_current_student_id
from app.core.security import create_access_token, hash_password, verify_password
from app.database.store import get_document, read_collection, upsert_document
from app.schemas.student import AuthResponse, LoginRequest, SignupRequest
from app.services import student_service

router = APIRouter(prefix="/auth", tags=["auth"])

_USERS_COLLECTION = "users"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest):
    existing = get_document(_USERS_COLLECTION, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    profile = student_service.signup(payload)
    upsert_document(
        _USERS_COLLECTION,
        payload.email,
        {"student_id": profile.student_id, "password_hash": hash_password(payload.password)},
    )
    token = create_access_token(profile.student_id)
    return AuthResponse(access_token=token, student_id=profile.student_id)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    user = get_document(_USERS_COLLECTION, payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user["student_id"])
    return AuthResponse(access_token=token, student_id=user["student_id"])


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, student_id: str = Depends(get_current_student_id)):
    if student_id == DEMO_STUDENT_ID:
        raise HTTPException(status_code=400, detail="Demo accounts can't change password — sign up for a real account first.")

    users = read_collection(_USERS_COLLECTION)
    match = next(((email, user) for email, user in users.items() if user.get("student_id") == student_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    email, user = match
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    user["password_hash"] = hash_password(payload.new_password)
    upsert_document(_USERS_COLLECTION, email, user)
    return {"status": "ok"}
