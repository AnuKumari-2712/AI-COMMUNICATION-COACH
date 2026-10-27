# Prompt 3 Progress & Upgrades: Deterministic Score, Streak & Analytics

## Summary of Completed Tasks

### 1. Deterministic Streak Calculation (No ML, 100% Calendar Math)
- Updated `compute_streak_days(practice_history: list[dict], reference_date: date | None = None) -> int` in `backend/app/personalization/learner_profile.py`:
  - **Calendar Date Deduplication**: Parses ISO timestamps (`_parse_entry_date`) into unique calendar dates (`set[date]`). Two or more sessions on the same calendar day count as exactly 1 day toward the streak.
  - **Consecutive Calendar Days**: Chains days backwards (`(days[i-1] - days[i]).days == 1`).
  - **Missed Day Resets**: Streak resets to 0 if the gap between `reference_date` (defaults to today UTC) and the most recent session is > 1 day.
  - **Cross-Midnight Sessions**: Sessions at e.g. 23:55 on Day 1 and 00:05 on Day 2 are on distinct calendar days and correctly count as 2 consecutive days.

### 2. Real Baseline Scores & "No Data Yet" for Brand-New Users
- **Baseline Initialization** (`create_profile` in `learner_profile.py`):
  - Brand-new users start with all 8 skill scores set to `0.0` (grammar, vocabulary, fluency, speaking_pace, filler_words, confidence, pronunciation, response_structure).
  - Eliminated arbitrary mock numbers (formerly 55, 50).
- **First-Session Direct Assignment** (`update_scores` in `learner_profile.py`):
  - On the first session (or for unmeasured metrics where baseline is `0.0`), the measured score is assigned directly rather than being diluted by 0.
  - Subsequent sessions blend using exponential moving average (`round(current * (1 - weight) + new * weight, 1)`).
- **Weakness Detector Guard** (`weakness_detector.py`):
  - `detect(scores)` filters to active measured metrics (`v > 0.0`), preventing unmeasured skills from dragging down average scores or being falsely diagnosed as weaknesses.
- **Frontend Display**:
  - `src/pages/dashboard/DashboardPage.tsx`: Displays `"No data yet"` when `profile.scores.overall === 0`, and suppresses misleading placeholder trends.
  - `src/services/studentService.ts`: Computes `overall` score from active measured skills (or 0 for brand-new users).

### 3. Real Date Labels in Analytics Trend
- Updated `analytics_trend` in `backend/app/services/student_service.py`:
  - Replaced arbitrary `"Session N"` string labels with real calendar dates formatted as `%b %d` (e.g. `"Oct 22"`, `"Oct 23"`, `"Oct 24"`) parsed directly from snapshot timestamps.
  - Buckets preserve full session snapshots for accurate multi-skill trending.

### 4. Single Source of Truth Across Features
- **Dashboard, Analytics, Profile, and Achievements**:
  - All read from the student's unified learner profile (`learner_profiles` in `store_documents`).
  - `AnalyticsPage.tsx`: Dynamically binds `Exercises Completed` to `profile.exercisesCompleted` (from `practice_history.length`), and `Improvement Rate` to the real trend progression.
  - `AchievementsPage.tsx` and `backend/app/personalization/achievements.py`: Derive milestone progress directly from the profile's real streak and skill scores.

---

## Test Verification

1. **New Test Suite**: `backend/tests/test_prompt3_scores_streak.py`
   - `test_new_user_scores_and_streak`:
     - Hand-computed check: streak=0, all 8 skill scores=0.0, achievement progress=0.
     - Result: **PASSED**.
   - `test_two_sessions_same_day`:
     - Hand-computed check: 2 sessions on 2026-10-24 -> streak=1.
     - Result: **PASSED**.
   - `test_three_consecutive_days`:
     - Hand-computed check: sessions on Oct 22, 23, 24 -> streak=3.
     - Result: **PASSED**.
   - `test_missed_day_resets_streak`:
     - Hand-computed check: sessions on Oct 21, 22, skipping Oct 23 -> streak=0 on Oct 24.
     - Result: **PASSED**.
   - `test_session_just_after_midnight`:
     - Hand-computed check: 23:55 Oct 23 and 00:05 Oct 24 -> streak=2.
     - Result: **PASSED**.
   - `test_score_update_deterministic_blending`:
     - Hand-computed check: Session 1 (grammar 80) -> sets 80.0; Session 2 (grammar 90, weight 0.35) -> `round(80*0.65 + 90*0.35, 1) = 83.5`.
     - Result: **PASSED**.
   - `test_analytics_trend_real_dates`:
     - Validates that trend points return calendar date labels (e.g. "Oct 22", "Oct 23") and never "Session N".
     - Result: **PASSED**.
   - `test_consistency_across_dashboard_analytics_achievements_profile`:
     - Verifies identical values across `/students/me`, `/students/me/achievements`, and session updates.
     - Result: **PASSED**.
   - Overall suite result: **8 of 8 PASSED**.

2. **Combined Backend Tests (Prompts 1 + 2 + 3)**:
   - Command: `pytest tests/test_prompt1_auth_profile.py tests/test_prompt2_db_persistence.py tests/test_prompt3_scores_streak.py -v`
   - Result: **23 passed, 0 failed** in 13.65s.

3. **Frontend Build**:
   - Command: `npm run build`
   - Result: **Zero errors, build succeeded**.
