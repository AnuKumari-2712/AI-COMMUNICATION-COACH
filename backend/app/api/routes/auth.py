from fastapi import APIRouter, HTTPException

from app.core.security import create_access_token, hash_password, verify_password
from app.database.store import get_document, upsert_document
from app.schemas.student import AuthResponse, LoginRequest, SignupRequest
from app.services import student_service

router = APIRouter(prefix="/auth", tags=["auth"])

_USERS_COLLECTION = "users"


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
