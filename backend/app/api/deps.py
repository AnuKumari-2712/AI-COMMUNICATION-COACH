"""
Shared FastAPI dependencies.

`get_current_student_id` accepts a bearer token when present and valid, but
falls back to the fixed "demo-student" id ONLY when no Authorization header
is sent at all — this lets the API be explored without forcing a
signup/login round-trip first.

If a bearer token IS present but invalid or expired, we return 401 rather
than silently switching to the demo profile; a logged-in user must never
see demo data because of a bad token.
"""
from fastapi import Header, HTTPException

from app.core.security import decode_access_token

DEMO_STUDENT_ID = "demo-student"


def get_current_student_id(authorization: str | None = Header(default=None)) -> str:
    if authorization is None:
        # No auth header at all → unauthenticated / demo mode.
        return DEMO_STUDENT_ID

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization scheme. Expected: Bearer <token>")

    token = authorization.split(" ", 1)[1]
    student_id = decode_access_token(token)
    if student_id is None:
        raise HTTPException(status_code=401, detail="Token is invalid or has expired. Please log in again.")

    return student_id
