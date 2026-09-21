"""
Shared FastAPI dependencies.

`get_current_student_id` accepts a bearer token when present and valid, but
falls back to the fixed "demo-student" id when it's missing — this lets the
whole API be explored (Swagger UI, curl, a frontend that hasn't wired up
auth headers yet) without forcing a signup/login round-trip first, while
still supporting real per-student auth for clients that do send a token.
"""
from fastapi import Header

from app.core.security import decode_access_token

DEMO_STUDENT_ID = "demo-student"


def get_current_student_id(authorization: str | None = Header(default=None)) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        student_id = decode_access_token(token)
        if student_id:
            return student_id
    return DEMO_STUDENT_ID
