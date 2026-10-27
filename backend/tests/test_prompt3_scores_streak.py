import uuid
from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.core import config as cfg
from app.database import store
from app.main import app
from app.personalization import learner_profile, weakness_detector
from app.personalization.achievements import compute_achievements
from app.personalization.learner_profile import compute_streak_days, create_profile, update_scores
from app.services import student_service


@pytest.fixture(autouse=True)
def db_test_env(tmp_path, monkeypatch):
    """Isolate database in a clean temporary directory for each test."""
    data_dir = tmp_path / "test_data"
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    cfg.get_settings.cache_clear()
    store._initialized_targets.clear()
    store.init_db()
    yield
    cfg.get_settings.cache_clear()
    store._initialized_targets.clear()


@pytest.fixture
def test_client():
    return TestClient(app)


class TestPrompt3ScoresAndStreak:
    def test_new_user_scores_and_streak(self):
        """A brand-new user must have streak=0 and baseline scores of 0.0 (no fake numbers)."""
        student_id = str(uuid.uuid4())
        profile = create_profile(
            full_name="New Student",
            email="new.student@example.com",
            college="Test College",
            course="B.Tech CS",
            year="2nd Year",
            career_goal="Frontend Developer",
        )

        # Streak must be 0 for a brand new user
        assert profile.streak_days == 0
        assert compute_streak_days(profile.practice_history) == 0

        # All 8 skill scores must be 0.0
        scores_dict = profile.scores.model_dump()
        assert len(scores_dict) == 8
        for skill_name, score in scores_dict.items():
            assert score == 0.0, f"Expected 0.0 for {skill_name}, got {score}"

        # Weakness detector should return 0 mean score and no false weaknesses
        analysis = weakness_detector.detect(profile.scores)
        assert analysis["mean_score"] == 0.0
        assert analysis["weaknesses"] == []
        assert analysis["strengths"] == []

        # Achievements must reflect 0 progress for streak and scores
        achievements = compute_achievements(profile)
        ach_by_id = {a["id"]: a for a in achievements}
        assert ach_by_id["a1"]["progress"] == 0  # 7 Day Streak
        assert ach_by_id["a7"]["progress"] == 0  # 30 Day Streak
        assert ach_by_id["a8"]["progress"] == 0.0  # Confidence score

    def test_two_sessions_same_day(self):
        """Two sessions on the same calendar day must count as 1 streak day."""
        ref_date = date(2026, 10, 24)
        history = [
            {"type": "voice_practice", "timestamp": "2026-10-24T09:15:00Z"},
            {"type": "text_practice", "timestamp": "2026-10-24T16:45:00Z"},
        ]
        # Hand-computed: {2026-10-24} -> 1 unique calendar day -> streak = 1
        streak = compute_streak_days(history, reference_date=ref_date)
        assert streak == 1

    def test_three_consecutive_days(self):
        """Sessions on three consecutive calendar days must yield a streak of 3."""
        ref_date = date(2026, 10, 24)
        history = [
            {"type": "text_practice", "timestamp": "2026-10-22T10:00:00Z"},
            {"type": "voice_practice", "timestamp": "2026-10-23T11:30:00Z"},
            {"type": "text_practice", "timestamp": "2026-10-24T14:20:00Z"},
        ]
        # Hand-computed:
        # Days: 2026-10-24 (today, diff 0 <= 1)
        # 2026-10-24 - 2026-10-23 = 1 -> streak 2
        # 2026-10-23 - 2026-10-22 = 1 -> streak 3
        streak = compute_streak_days(history, reference_date=ref_date)
        assert streak == 3

    def test_missed_day_resets_streak(self):
        """A missed day breaks the streak (streak becomes 0 if latest session is > 1 day before reference date)."""
        ref_date = date(2026, 10, 24)
        # User practiced on Oct 21 and Oct 22, but skipped Oct 23 and has no session on Oct 24
        history = [
            {"type": "text_practice", "timestamp": "2026-10-21T10:00:00Z"},
            {"type": "voice_practice", "timestamp": "2026-10-22T15:00:00Z"},
        ]
        # Most recent session was Oct 22; (2026-10-24 - 2026-10-22) = 2 days ago > 1 -> streak = 0
        streak = compute_streak_days(history, reference_date=ref_date)
        assert streak == 0

        # Also verify: if user practiced Oct 20, missed Oct 21, and practiced Oct 22 and Oct 23 (ref_date Oct 23)
        history_broken_past = [
            {"type": "text_practice", "timestamp": "2026-10-20T10:00:00Z"},
            {"type": "voice_practice", "timestamp": "2026-10-22T15:00:00Z"},
            {"type": "text_practice", "timestamp": "2026-10-23T09:00:00Z"},
        ]
        # Oct 23 -> Oct 22 (diff 1 -> streak 2); Oct 22 -> Oct 20 (diff 2 != 1 -> chain stops at 2)
        assert compute_streak_days(history_broken_past, reference_date=date(2026, 10, 23)) == 2

    def test_session_just_after_midnight(self):
        """Cross-midnight sessions (e.g. 23:55 on Day 1, 00:05 on Day 2) correctly count as 2 consecutive calendar days."""
        ref_date = date(2026, 10, 24)
        # Session 1: 5 minutes before midnight on Oct 23
        # Session 2: 5 minutes after midnight on Oct 24
        history = [
            {"type": "voice_practice", "timestamp": "2026-10-23T23:55:00Z"},
            {"type": "voice_practice", "timestamp": "2026-10-24T00:05:00Z"},
        ]
        # Calendar dates: 2026-10-23 and 2026-10-24
        # Even though 10 minutes apart, calendar days are consecutive -> streak = 2
        streak = compute_streak_days(history, reference_date=ref_date)
        assert streak == 2

    def test_score_update_deterministic_blending(self):
        """First session sets measured scores directly; subsequent sessions blend via exponential moving average."""
        profile = create_profile(
            full_name="Score Learner",
            email="score.learner@example.com",
            college="Engineering College",
            course="B.E",
            year="3rd",
            career_goal="Data Engineer",
        )
        student_id = profile.student_id

        # Session 1: First time user completes an assessment (e.g. grammar: 80.0, vocabulary: 70.0)
        p1 = update_scores(
            student_id,
            {"grammar": 80.0, "vocabulary": 70.0},
            session_type="text_practice",
            weight=0.35,
        )
        # Hand-computed: uninitialized 0.0 metrics are initialized directly to measured score
        assert p1.scores.grammar == 80.0
        assert p1.scores.vocabulary == 70.0

        # Session 2: User completes second session scoring grammar: 90.0, vocabulary: 80.0
        # Hand-computed with weight 0.35:
        # grammar: round(80.0 * (1 - 0.35) + 90.0 * 0.35, 1) = round(52.0 + 31.5, 1) = 83.5
        # vocabulary: round(70.0 * (1 - 0.35) + 80.0 * 0.35, 1) = round(45.5 + 28.0, 1) = 73.5
        p2 = update_scores(
            student_id,
            {"grammar": 90.0, "vocabulary": 80.0},
            session_type="text_practice",
            weight=0.35,
        )
        assert p2.scores.grammar == 83.5
        assert p2.scores.vocabulary == 73.5

    def test_analytics_trend_real_dates(self):
        """Analytics trend labels must show real calendar dates (e.g. 'Oct 23', 'Oct 24') instead of 'Session N'."""
        profile = create_profile(
            full_name="Trend Student",
            email="trend.student@example.com",
            college="Test Univ",
            course="B.A",
            year="1st",
            career_goal="Journalist",
        )
        student_id = profile.student_id

        # Add 3 practice sessions with explicit timestamps and snapshots
        now = datetime(2026, 10, 22, 10, 0, 0, tzinfo=timezone.utc)
        for i, day_offset in enumerate([0, 1, 2]):
            ts = datetime(2026, 10, 22 + day_offset, 14, 0, 0, tzinfo=timezone.utc).isoformat()
            profile = learner_profile.get_profile(student_id)
            profile.practice_history.append(
                {
                    "type": "text_practice",
                    "scores": {"grammar": 70.0 + i * 5, "vocabulary": 65.0 + i * 5},
                    "profile_snapshot": {
                        "grammar": 70.0 + i * 5,
                        "vocabulary": 65.0 + i * 5,
                        "fluency": 60.0,
                        "speaking_pace": 60.0,
                        "filler_words": 60.0,
                        "confidence": 60.0,
                        "pronunciation": 60.0,
                        "response_structure": 60.0,
                    },
                    "timestamp": ts,
                    "minutes": 3.0,
                }
            )
            store.upsert_document("learner_profiles", student_id, profile.model_dump(mode="json"))

        trend_points = student_service.analytics_trend(student_id, max_points=3)
        assert len(trend_points) >= 2

        # Verify that labels are real dates, NOT "Session 1", "Session 2", etc.
        for point in trend_points:
            label = point["label"]
            assert not label.startswith("Session "), f"Label '{label}' should be a real date, not 'Session N'"
            assert any(month in label for month in ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]), (
                f"Label '{label}' should contain a formatted month name"
            )

    def test_consistency_across_dashboard_analytics_achievements_profile(self, test_client):
        """Dashboard, Analytics, Achievements and Profile must read the same real values."""
        signup_payload = {
            "full_name": "Consistent Learner",
            "email": f"consistent_{uuid.uuid4().hex[:6]}@example.com",
            "password": "Password123!",
            "college": "BITS Pilani",
            "course": "B.E",
            "year": "4th Year",
            "career_goal": "Product Manager",
        }
        res = test_client.post("/api/v1/auth/signup", json=signup_payload)
        assert res.status_code == 201
        token = res.json()["access_token"]
        auth_header = {"Authorization": f"Bearer {token}"}

        # 1. Profile route: /students/me
        profile_res = test_client.get("/api/v1/students/me", headers=auth_header)
        assert profile_res.status_code == 200
        profile_data = profile_res.json()
        student_id = profile_data["student_id"]

        assert profile_data["streak_days"] == 0
        assert profile_data["scores"]["grammar"] == 0.0

        # 2. Achievements route: /students/me/achievements
        ach_res = test_client.get("/api/v1/students/me/achievements", headers=auth_header)
        assert ach_res.status_code == 200
        ach_items = {a["id"]: a for a in ach_res.json()}
        # Must reflect the exact streak and confidence from the profile
        assert ach_items["a1"]["progress"] == profile_data["streak_days"]
        assert ach_items["a8"]["progress"] == profile_data["scores"]["confidence"]

        # Now simulate a session and check updated consistency
        update_scores(
            student_id,
            {"grammar": 85.0, "confidence": 75.0},
            session_type="voice_practice",
            duration_minutes=5.0,
        )

        updated_profile = test_client.get("/api/v1/students/me", headers=auth_header).json()
        assert updated_profile["scores"]["grammar"] == 85.0
        assert updated_profile["scores"]["confidence"] == 75.0
        assert updated_profile["streak_days"] == 1
        assert updated_profile["total_practice_minutes"] == 5

        # Achievements must now reflect the new streak and confidence immediately
        updated_ach = {a["id"]: a for a in test_client.get("/api/v1/students/me/achievements", headers=auth_header).json()}
        assert updated_ach["a1"]["progress"] == 1
        assert updated_ach["a8"]["progress"] == 75.0
