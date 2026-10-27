"""
Tests for Prompt 2: Data Permanent Save (SQLite locally, PostgreSQL via DATABASE_URL).

Verifies:
- A user created via /auth/signup still exists (with the same sessions, scores, and streak)
  after the FastAPI app object and TestClient are recreated.
- Passwords are saved as PBKDF2 hashes and NEVER stored in plaintext.
- The underlying SQLite database schema (store_documents) is created automatically.
- Legacy JSON files are seamlessly migrated into the database.
"""
import json
import random
import sqlite3
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import config as cfg
from app.core.security import verify_password
from app.database import store
from app.main import app


@pytest.fixture()
def db_test_env(tmp_path, monkeypatch):
    """Provides an isolated test directory for SQLite database storage."""
    data_dir = tmp_path / "test_data"
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    cfg.get_settings.cache_clear()
    store._initialized_targets.clear()
    store.init_db()
    email = f"persisted_{int(time.time())}_{random.randint(1000, 9999)}@example.com"
    yield {"data_dir": data_dir, "email": email}
    cfg.get_settings.cache_clear()
    store._initialized_targets.clear()


class TestDataPersistence:
    """Verifies that user data, scores, and streak survive app recreation."""

    def test_user_and_scores_persist_after_app_recreation(self, db_test_env):
        email = db_test_env["email"]
        password = "SecurePassword123!"
        full_name = "Persistent Learner"

        # 1. Create client and signup
        client1 = TestClient(app)
        signup_resp = client1.post(
            "/api/v1/auth/signup",
            json={
                "full_name": full_name,
                "email": email,
                "password": password,
                "college": "Stanford University",
                "course": "Computer Science",
                "year": "3rd Year",
                "career_goal": "AI Engineer",
            },
        )
        assert signup_resp.status_code == 201, signup_resp.text
        signup_data = signup_resp.json()
        student_id = signup_data["student_id"]
        token1 = signup_data["access_token"]

        # 2. Record a practice session to update score and practice history
        practice_resp = client1.post(
            "/api/v1/assessment/text",
            headers={"Authorization": f"Bearer {token1}"},
            json={
                "student_id": student_id,
                "question": "Tell me about yourself.",
                "answer": "I am an enthusiastic software engineer with experience in full stack web development and natural language processing.",
            },
        )
        assert practice_resp.status_code == 200, practice_resp.text
        text_data = practice_resp.json()
        assert "score" in text_data

        # Fetch profile before app restart
        profile1_resp = client1.get(
            "/api/v1/students/me",
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert profile1_resp.status_code == 200
        profile1_data = profile1_resp.json()
        history1_len = len(profile1_data.get("practice_history", []))
        assert history1_len >= 1, "Practice session should be recorded in profile history"
        scores1 = profile1_data["scores"]
        streak1 = profile1_data["streak_days"]

        # 3. Simulate app restart: recreate a fresh FastAPI app and TestClient
        cfg.get_settings.cache_clear()
        from importlib import reload
        import app.main as app_module
        reload(app_module)
        client2 = TestClient(app_module.app)

        # 4. Verify login still works on the fresh app object with original credentials
        login_resp = client2.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login_resp.status_code == 200, f"Login failed on recreated app: {login_resp.text}"
        token2 = login_resp.json()["access_token"]

        # 5. Fetch profile on the recreated app and verify all fields match exactly
        profile2_resp = client2.get(
            "/api/v1/students/me",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert profile2_resp.status_code == 200
        profile2_data = profile2_resp.json()

        assert profile2_data["full_name"] == full_name
        assert profile2_data["email"] == email
        assert profile2_data["student_id"] == student_id
        assert profile2_data["scores"] == scores1
        assert profile2_data["streak_days"] == streak1
        assert len(profile2_data.get("practice_history", [])) == history1_len

    def test_passwords_are_pbkdf2_hashed_and_not_plaintext(self, db_test_env):
        email = db_test_env["email"]
        password = "VerySecretPassword99!"
        client = TestClient(app)

        signup_resp = client.post(
            "/api/v1/auth/signup",
            json={
                "full_name": "Hash Check",
                "email": email,
                "password": password,
                "college": "Test College",
                "course": "CSE",
                "year": "2nd Year",
                "career_goal": "Engineer",
            },
        )
        assert signup_resp.status_code == 201

        # Check the SQLite database directly
        db_file = db_test_env["data_dir"] / "coach.db"
        assert db_file.exists(), f"SQLite database not found at {db_file}"

        conn = sqlite3.connect(str(db_file))
        cursor = conn.cursor()
        cursor.execute(
            "SELECT data FROM store_documents WHERE collection = 'users' AND doc_id = ?",
            (email,),
        )
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "User record not found in store_documents table"
        user_record = json.loads(row[0])

        assert "password_hash" in user_record
        stored_hash = user_record["password_hash"]
        assert stored_hash != password, "Password must not be stored in plaintext!"
        assert password not in row[0], "Plaintext password must not appear anywhere in stored JSON!"
        assert verify_password(password, stored_hash) is True, "Stored hash must verify with PBKDF2"

    def test_legacy_json_migration(self, db_test_env):
        """Pre-existing JSON files are automatically migrated into the SQLite database."""
        data_dir = db_test_env["data_dir"]
        legacy_file = data_dir / "legacy_items.json"
        test_payload = {
            "item_1": {"title": "Legacy Item 1", "score": 95},
            "item_2": {"title": "Legacy Item 2", "score": 88},
        }
        legacy_file.write_text(json.dumps(test_payload), encoding="utf-8")

        # Run migration via init_db
        store.init_db()

        # Check that documents are now accessible through store API
        doc1 = store.get_document("legacy_items", "item_1")
        doc2 = store.get_document("legacy_items", "item_2")

        assert doc1 is not None and doc1["title"] == "Legacy Item 1" and doc1["score"] == 95
        assert doc2 is not None and doc2["title"] == "Legacy Item 2" and doc2["score"] == 88
