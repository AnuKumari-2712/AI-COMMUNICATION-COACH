"""
Minimal, dependency-free auth for a student project.

Passwords are salted + hashed with PBKDF2 (stdlib `hashlib`, no plaintext
storage). Tokens are a simple HMAC-signed payload (student_id + expiry) —
functionally similar to a JWT but without pulling in a JWT library, since
this project doesn't need multi-issuer/multi-audience token claims. This is
demo-grade: fine for a portfolio/hackathon deployment, NOT a substitute for
a hardened auth provider in a real product (no rate limiting, no refresh
tokens, no revocation list).
"""
import base64
import hashlib
import hmac
import json
import time

from app.core.config import get_settings


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or hashlib.sha256(str(time.time()).encode()).digest()[:16]
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return base64.urlsafe_b64encode(salt + derived).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        raw = base64.urlsafe_b64decode(stored_hash.encode())
        salt, derived = raw[:16], raw[16:]
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
        return hmac.compare_digest(candidate, derived)
    except Exception:  # noqa: BLE001
        return False


def _sign(payload: str) -> str:
    settings = get_settings()
    signature = hmac.new(settings.jwt_secret.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(signature).decode()


def create_access_token(student_id: str) -> str:
    settings = get_settings()
    expires_at = int(time.time()) + settings.jwt_expires_minutes * 60
    payload = json.dumps({"sub": student_id, "exp": expires_at})
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode()
    return f"{payload_b64}.{_sign(payload_b64)}"


def decode_access_token(token: str) -> str | None:
    try:
        payload_b64, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(payload_b64)):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
        if payload["exp"] < time.time():
            return None
        return payload["sub"]
    except Exception:  # noqa: BLE001
        return None
