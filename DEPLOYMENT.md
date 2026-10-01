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

**Known limitations on Render's free tier (be aware, not a bug):**
- The filesystem is **ephemeral** — the JSON "database" under `backend/data/` resets whenever the service restarts or redeploys. Signups/practice history won't persist long-term. Fine for a demo; for real persistence you'd swap in a real database (see `backend/app/database/store.py`).
- The free instance **spins down after 15 minutes of inactivity** and takes ~30-60 seconds to wake up on the next request.

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
