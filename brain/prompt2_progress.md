# Prompt 2 Progress & Upgrades: Data Permanent Save (SQLite / PostgreSQL)

## Summary of Completed Tasks

### 1. Database Architecture & Multi-Backend Support
- Replaced ephemeral single-file JSON store with a relational database store in `backend/app/database/store.py`.
- **Local Development**: Uses SQLite by default (`backend/data/coach.db`), requiring zero setup or external services.
- **Production Deployment**: Connects to PostgreSQL when `DATABASE_URL` is set (e.g., Render Postgres, Neon, Supabase).
- Supported standard connection formatting (`postgres://` converted to `postgresql://` automatically).
- Maintained exact backward compatibility with existing store methods:
  - `read_collection(collection: str) -> dict[str, Any]`
  - `write_collection(collection: str, data: dict[str, Any]) -> None`
  - `get_document(collection: str, doc_id: str) -> dict[str, Any] | None`
  - `upsert_document(collection: str, doc_id: str, document: dict[str, Any]) -> dict[str, Any]`
  - `delete_document(collection: str, doc_id: str) -> None`

### 2. Automatic Schema Migration & Init Step
- Created table `store_documents` with composite primary key `(collection, doc_id)`, `data TEXT`, and timestamp columns (`created_at`, `updated_at`).
- Added index `idx_store_collection` on `collection` for fast queries.
- Added automatic migration: on initialization (`init_db()`), any existing legacy `.json` files in `DATA_DIR` (e.g. `users.json`, `learner_profiles.json`) are read and imported into `store_documents` if not already present.
- Hooked `init_db()` into FastAPI's `lifespan` in `backend/app/main.py`.

### 3. Password Security & Storage
- Passwords are encrypted using salted PBKDF2-HMAC-SHA256 with 100,000 iterations (`app/core/security.py`).
- Plaintext passwords are never stored, never logged, and verified securely via `hmac.compare_digest`.
- Documented exact storage layout in `README.md` (§8.1) and `DEPLOYMENT.md`:
  - **Email and Password Hash**: stored in `store_documents` where `collection = 'users'`.
  - **Scores, Streaks, and Progress**: stored in `store_documents` where `collection = 'learner_profiles'`.

### 4. Configuration & Dependencies
- Added `database_url: str | None = None` to `Settings` in `backend/app/core/config.py`.
- Added `DATABASE_URL=` configuration and examples to `backend/.env.example`.
- Added `psycopg2-binary>=2.9.9` to `backend/requirements.txt` for PostgreSQL deployments.

---

## Test Verification

1. **New Test Suite**: `backend/tests/test_prompt2_db_persistence.py`
   - `test_user_and_scores_persist_after_app_recreation`:
     - Signs up a user via `/api/v1/auth/signup`.
     - Completes a text practice session to record scores and practice history.
     - Simulates server restart by reloading the FastAPI module, recreating `app` and a new `TestClient`.
     - Logs in with original credentials and validates all profile data, scores, streak, and history survive unchanged.
   - `test_passwords_are_pbkdf2_hashed_and_not_plaintext`:
     - Directly queries the SQLite database table `store_documents`.
     - Confirms password hash exists, verifies using PBKDF2, and ensures no plaintext password exists anywhere in storage.
   - `test_legacy_json_migration`:
     - Writes a legacy JSON file and calls `init_db()`.
     - Confirms documents are seamlessly migrated and queryable via the store API.
   - Result: **All 3 tests PASSED**.

2. **Combined Backend Tests**:
   - `pytest tests/test_prompt1_auth_profile.py tests/test_prompt2_db_persistence.py tests/test_cors_config.py -v`
   - Result: **26 passed, 0 failed** in 38.17s.

3. **Frontend Build**:
   - `npm run build`
   - Result: **Zero errors, build succeeded**.
