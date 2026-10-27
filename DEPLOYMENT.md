# Deploying this project live

This repo is pre-configured for a free-tier deployment: **Render** for the
FastAPI backend, **Vercel** for the React frontend. Both connect directly
to this GitHub repo and auto-deploy on every push to `main`.

Deploy the **backend first** — the frontend needs its live URL.

## 1. Backend → Render

1. Go to https://render.com and sign up (free, GitHub login works).
2. Click **New** → **Blueprint**.
3. Connect your GitHub account and select `AnuKumari-2712/AI-COMMUNICATION-COACH`.
4. Render detects `render.yaml` automatically and shows the `ai-comm-coach-backend` service — click **Apply**.
5. Wait for the first build to finish (installs dependencies + downloads the spaCy model, ~3-5 min).
6. Copy the live URL it gives you, e.g. `https://ai-comm-coach-backend.onrender.com`.

**Database Persistence (Prompt 2):**
- Local development defaults to SQLite (`backend/data/coach.db`).
- For permanent persistence on Render / Vercel, attach a PostgreSQL database (e.g., Render Postgres, Neon, or Supabase) and set the `DATABASE_URL` environment variable:
  `DATABASE_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require`
- Storage locations:
  - **Email & Password Hash**: stored in `store_documents` table under `collection='users'` (`password_hash` is salted PBKDF2 with 100,000 iterations, never plaintext, never logged).
  - **Scores, Streaks, Practice History**: stored in `store_documents` table under `collection='learner_profiles'`.
- The instance **spins down after 15 minutes of inactivity** on Render's free tier and takes ~30-60 seconds to wake up (a cold start banner is displayed automatically in the UI).

**AI Grammar Engine Configuration (Prompt 4 & Prompt 8):**
- `ANTHROPIC_API_KEY`: Set your Anthropic API key to enable Claude-powered sentence-by-sentence grammar checking.
- `ANTHROPIC_MODEL`: (Optional) Defaults to `claude-3-5-sonnet-20241022`.
- `GEC_MODEL_PATH`: (Optional) Local directory or Hugging Face Hub repository id containing fine-tuned T5 GEC weights (e.g., `backend/models/gec-t5` or `your-username/flan-t5-small-gec`). Defaults to `backend/models/gec-t5`.
  - To train locally or on Google Colab: follow `backend/ml_training/README_TRAINING.md` and run `python backend/ml_training/train_gec.py`.
  - To evaluate on JFLEG benchmark: run `python backend/ml_training/evaluate_gec.py` (produces `eval_report.md`).
  - Fallback: If `GEC_MODEL_PATH` directory is missing or empty, the system gracefully falls back to rules/spaCy without failing application startup.
- `GRAMMAR_ENGINE_ORDER`: (Optional) Comma-separated order of preference, defaults to `claude,t5,rules`. If Claude is unavailable or fails, automatically falls back down the chain. Engine badge is reported to the frontend.

**Speech-to-Text & Audio Conversion (Prompt 5):**
- `ENABLE_WHISPER`: (Optional) Defaults to `true`. Enables local faster-whisper speech recognition with int8 CPU quantization.
- `WHISPER_MODEL`: (Optional) Defaults to `base` (or `tiny`, `small`, `medium`).
- `ffmpeg`: Recommended for server-side conversion of `.webm`/`.ogg` audio uploads to 16kHz mono WAV (`apt-get install -y ffmpeg` on Linux, `winget install ffmpeg` on Windows). If ffmpeg is absent, WAV recordings are converted via Python stdlib wave/audioop without crashing.

## 2. Frontend → Vercel

1. Go to https://vercel.com and sign up (free, GitHub login works).
2. Click **Add New** → **Project**, select the same GitHub repo.
3. Vercel auto-detects Vite from `vercel.json`. Before deploying, add one **Environment Variable**:
   - `VITE_API_BASE_URL` = `https://<your-render-backend-url>/api/v1` (the URL from step 1.6, with `/api/v1` appended)
4. Click **Deploy**. You'll get a live URL like `https://ai-communication-coach.vercel.app`.

## 3. Connect them (one last step, back on Render)

The backend only accepts requests from origins listed in `CORS_ORIGINS`. Once
you have your Vercel URL:

1. On Render, open the backend service → **Environment**.
2. Edit `CORS_ORIGINS` to: `["https://<your-vercel-url>"]`
3. Save — Render redeploys automatically.

That's it — both URLs are now genuinely live and talking to each other.

## Updating the live deployment later

Both services auto-redeploy whenever you (or I) push new commits to `main`
on GitHub — no manual redeploy step needed after this initial setup.
