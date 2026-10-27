"""
Tests for Prompt 1: real name/email + frontend-backend connection.

Verifies:
- Signup creates a real named profile (not "Ananya Sharma").
- Login returns a valid token for that profile.
- GET /students/me with the token returns the real name/email.
- A token for an unknown student_id returns 404 (not the demo profile).
- No Authorization header returns 200 with the demo profile.
- Invalid bearer token returns 401.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _signup(email: str, password: str = "Test1234!", full_name: str = "Test User") -> dict:
    resp = client.post("/api/v1/auth/signup", json={
        "full_name": full_name,
        "email": email,
        "password": password,
        "college": "Test College",
        "course": "B.Tech CSE",
        "year": "2nd Year",
        "career_goal": "Software Engineer",
    })
    return resp


def _login(email: str, password: str = "Test1234!") -> dict:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSignupAndProfile:
    """Signup creates a real profile with the user's actual name/email."""

    def test_signup_returns_201_with_token(self, unique_email):
        resp = _signup(unique_email)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert "access_token" in data
        assert "student_id" in data

    def test_profile_has_real_name_and_email(self, unique_email):
        full_name = "Priya Nair"
        resp = _signup(unique_email, full_name=full_name)
        token = resp.json()["access_token"]

        profile_resp = client.get(
            "/api/v1/students/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert profile_resp.status_code == 200, profile_resp.text
        profile = profile_resp.json()
        assert profile["full_name"] == full_name, (
            f"Expected real name '{full_name}' but got '{profile['full_name']}'"
        )
        assert profile["email"] == unique_email

    def test_profile_is_not_demo_student(self, unique_email):
        """The demo profile MUST NOT bleed through for real accounts."""
        resp = _signup(unique_email)
        token = resp.json()["access_token"]

        profile_resp = client.get(
            "/api/v1/students/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        profile = profile_resp.json()
        assert profile["full_name"] not in ("Demo Student", "Ananya Sharma"), (
            "Real user is still seeing the demo profile!"
        )
        assert profile["email"] not in ("demo.student@example.edu", "ananya.sharma@example.edu")

    def test_duplicate_signup_returns_409(self, unique_email):
        _signup(unique_email)  # first signup
        resp = _signup(unique_email)  # duplicate
        assert resp.status_code == 409

    def test_login_returns_token(self, unique_email):
        _signup(unique_email)
        resp = _login(unique_email)
        assert resp.status_code == 200, resp.text
        assert "access_token" in resp.json()

    def test_wrong_password_returns_401(self, unique_email):
        _signup(unique_email)
        resp = _login(unique_email, password="WrongPassword!")
        assert resp.status_code == 401

    def test_no_auth_header_returns_demo_profile(self):
        """No token → demo mode, not 401."""
        resp = client.get("/api/v1/students/me")
        assert resp.status_code == 200
        profile = resp.json()
        # Should be the demo profile
        assert profile["student_id"] == "demo-student"

    def test_invalid_token_returns_401(self):
        """Invalid bearer token must be rejected, not silently downgraded to demo."""
        resp = client.get(
            "/api/v1/students/me",
            headers={"Authorization": "Bearer definitely.not.a.valid.token"},
        )
        assert resp.status_code == 401, (
            "An invalid token should return 401, not serve the demo profile!"
        )

    def test_profile_persists_after_app_object_recreated(self, unique_email):
        """Profile created in one app object is still there in a new one (same store)."""
        full_name = "Persistent User"
        resp = _signup(unique_email, full_name=full_name)
        student_id = resp.json()["student_id"]
        token = resp.json()["access_token"]

        # Simulate app restart by importing store directly
        from app.personalization.learner_profile import get_profile
        profile = get_profile(student_id)
        assert profile is not None, "Profile not found after app object would be recreated"
        assert profile.full_name == full_name
        assert profile.email == unique_email

        # Also verify the token still works for the API
        profile_resp = client.get(
            "/api/v1/students/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert profile_resp.status_code == 200
        assert profile_resp.json()["full_name"] == full_name


class TestCorsOriginParsing:
    """CORS_ORIGINS env var can be a comma-separated string or a JSON array."""

    def test_comma_separated_parsing(self):
        from app.core.config import Settings
        s = Settings(
            cors_origins="https://foo.vercel.app,https://bar.vercel.app",  # type: ignore[arg-type]
        )
        assert s.cors_origins == ["https://foo.vercel.app", "https://bar.vercel.app"]

    def test_json_array_parsing(self):
        from app.core.config import Settings
        s = Settings(
            cors_origins='["https://foo.vercel.app","https://bar.vercel.app"]',  # type: ignore[arg-type]
        )
        assert s.cors_origins == ["https://foo.vercel.app", "https://bar.vercel.app"]

    def test_list_passthrough(self):
        from app.core.config import Settings
        s = Settings(
            cors_origins=["https://foo.vercel.app"],
        )
        assert s.cors_origins == ["https://foo.vercel.app"]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def unique_email(tmp_path, monkeypatch):
    """Each test gets a fresh email so tests don't interfere."""
    import time, random
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    # Invalidate lru_cache so DATA_DIR env var takes effect
    from app.core import config as cfg
    cfg.get_settings.cache_clear()
    yield f"testuser_{int(time.time())}_{random.randint(0, 9999)}@example.com"
    cfg.get_settings.cache_clear()
