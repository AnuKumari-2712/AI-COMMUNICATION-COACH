# AI-Powered Personalized Communication & Interview Coach

An adaptive platform that evaluates a student's communication ability through voice and text, builds a dynamic learner profile, detects weaknesses, and generates a personalized (not identical-for-everyone) practice plan — grammar, vocabulary, fluency drills and full mock interviews, all adapting to the student's own history.

- **Frontend:** React + TypeScript + Tailwind CSS + Framer Motion + React Three Fiber + Recharts + React Router + React Hook Form/Zod
- **Backend:** Python + FastAPI + spaCy (NLP) + scikit-learn (adaptive difficulty) + SpeechRecognition (speech-to-text) + an optional HuggingFace Transformers model
- **Storage:** JSON-file "database" (swap-in ready for Postgres/Mongo — see `backend/app/database/store.py`)

This README is written so **someone who received this project as a ZIP file** (no git, no prior context) can get it running end to end. If you did clone it with git, skip the parts that don't apply.

---

## 1. What you need to install first

Nothing here is optional if you want the real backend (NLP/AI) running — without it the frontend still works on its own using realistic mock data, but you won't get real grammar analysis, adaptive plans, etc.

| Tool | Version | Why | Where to get it |
|---|---|---|---|
| **Node.js** | 20 LTS or newer | Runs the React frontend and its build tools | nodejs.org — download the "LTS" installer for your OS |
| **Python** | 3.11 or newer | Runs the FastAPI backend and all the NLP/ML code | python.org/downloads — on Windows, tick **"Add python.exe to PATH"** during install |
| **A code editor** (optional) | — | Only needed if you want to read/edit the code, not to run it | VS Code is a common free choice |
| **Git** (optional) | — | Only needed if you want version control; not required to run the app from a ZIP | git-scm.com |

You do **not** need: Docker, a database server, a paid API key, or a GPU. Everything runs locally on a normal laptop.

To check what's already installed, open a terminal (Command Prompt / PowerShell / Terminal) and run:

```bash
node --version
python --version
```

If either command isn't found, install that tool first, then close and reopen your terminal before continuing.

---

## 2. If you were given this as a ZIP file

1. **Extract the ZIP** anywhere you like, e.g. `C:\Users\you\Desktop\ai-comm-coach` (Windows) or `~/Desktop/ai-comm-coach` (Mac/Linux).
2. Open a terminal **inside that extracted folder** (on Windows: open the folder in File Explorer, click the address bar, type `cmd` or `powershell`, press Enter; on Mac/Linux: `cd` into it).
3. Follow **§3 (Frontend)** and **§4 (Backend)** below exactly as written — they don't assume git, only that you're standing inside the project folder.
4. `node_modules/`, `dist/`, and the Python `venv/` folder are **not** included in a ZIP export (they're huge and machine-specific) — the install commands below create them fresh on your machine. This is normal and expected; don't worry if you don't see them right after extracting.

---

## 3. Running the frontend

```bash
npm install
npm run dev
```

Wait for it to print a `http://localhost:5173` URL, then open that in your browser. It works standalone with realistic mock data even with **no backend running** — every page renders, every button works.

To point it at the real backend once you've started that too (see §4), copy the env file (the default value already matches the backend's default port, so this step is usually a no-op unless you changed something):

```bash
cp .env.example .env
```

(On Windows without a `cp` command, just duplicate `.env.example` in File Explorer and rename the copy to `.env`, or run `copy .env.example .env` in Command Prompt.)

---

## 4. Running the backend

Open a **second, separate terminal** (keep the frontend one running) and go into the `backend` folder:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment (this isolates the project's Python packages from the rest of your system):

```bash
venv\Scripts\activate        # Windows (Command Prompt or PowerShell)
source venv/bin/activate     # macOS / Linux
```

You'll know it worked because your terminal prompt now starts with `(venv)`. Then install everything and start the server:

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
copy .env.example .env       # or: cp .env.example .env  (macOS/Linux)
uvicorn app.main:app --reload --port 8000
```

- `pip install -r requirements.txt` — installs FastAPI, spaCy, scikit-learn, SpeechRecognition, etc. Takes 1-3 minutes depending on your internet connection.
- `python -m spacy download en_core_web_sm` — downloads the ~15MB English language model spaCy needs for real grammar/tense analysis. Without this step the backend still runs, but grammar analysis quietly degrades to a simpler rule set (see §7).
- The last command starts the server. Leave this terminal open.

Once it's running, open `http://localhost:8000/api/v1/health` in a browser — you should see:

```json
{"status":"ok","use_mock_ai":true,"spacy_model_loaded":true,"transformer_confidence_enabled":false}
```

`spacy_model_loaded: true` confirms the spaCy download step worked. Interactive API docs (try any endpoint directly from the browser) are at `http://localhost:8000/docs`.

**Optional** — enable a real transformer-based confidence model instead of the lightweight default heuristic (downloads a ~260MB model the first time it's used):

```bash
pip install -r requirements-ml-optional.txt
```

Then set `ENABLE_TRANSFORMER_CONFIDENCE=true` in `backend/.env` and restart the server.

### Now run both together

With the frontend terminal (`npm run dev`) and backend terminal (`uvicorn ...`) both running, open `http://localhost:5173` again. Pages that talk to the backend will now show a green **"Live from backend"** badge instead of an outlined **"Demo data — backend offline"** badge — that badge is always visible, so you can tell at a glance which one you're looking at.

---

## 5. What this project actually does (feature tour)

All 20 pages are fully built and clickable — there are no placeholder "coming soon" screens except a few footer marketing links (About/Careers/Blog) that intentionally show a toast since there's nothing to link them to.

| Page | What it does |
|---|---|
| **Landing** | Marketing page: hero with a 3D orb + live waveform, how-it-works, feature grid, testimonials, FAQ |
| **Login / Signup** | Real accounts — password hashing, JWT-style tokens, per-user profiles (see §6) |
| **Onboarding** | 5-step flow: personal info (prefilled from your real signup), communication goals, career goal, a free-text assessment that's actually analyzed, then a "profile ready" screen with real computed scores |
| **Dashboard** | Overall score, streak, weekly progress, skill breakdown, performance chart, today's adaptive plan, AI coach shortcut |
| **Communication Analysis** | Deep-dive radar chart, per-skill trend, strengths/weaknesses, a specific recommendation |
| **Voice Practice / Fluency Practice** | Real microphone recording (`MediaRecorder`), waveform visualization, sends audio to the backend for analysis |
| **Text Practice** | Submit a written answer, get real grammar corrections, vocabulary suggestions, and a rewritten "better" version |
| **Vocabulary Practice** | Flip-card word learning, difficulty-ordered by your own weaknesses, marks persist to your profile |
| **Grammar Practice** | Fill-blank / multiple-choice / rewrite exercises, personalized ordering based on your actual grammar weaknesses |
| **Interview Practice** | 7 interview types including **Resume-based** (paste/upload a resume, questions reference your actual skills) and **Job-role based** (pick a role, get role-specific questions); live per-answer metrics; full result breakdown at the end |
| **Learning Plan** | 7-day adaptive plan + an auto-managed "Topics to Review" queue (a mistake repeated 3+ times gets added automatically, removed once it stops recurring) |
| **Analytics** | Real trend chart and daily activity chart once you have 2+ real sessions; biggest improvement / current weakness / next-step cards |
| **Achievements** | 8 milestones, every one computed from your real streak, session counts, and score history — not decorative |
| **Profile** | Real profile data, editable, real (not fake) recent session history |
| **Settings** | Account, appearance (dark/light, actually switches the whole app's color scheme), notifications/privacy/voice preferences (persisted), real password change |
| **AI Coach** | Chat that reads your actual weakest skill and career goal to personalize its reply (not a generic canned bot) |
| **Admin Dashboard** | Platform-wide stats and a student table — intentionally kept on rich mock data (see §8) since a fresh install only has the couple of test accounts you create |

---

## 6. How personalization actually works (the important part)

This is what makes the app adaptive instead of a static demo:

1. You submit a real session (Text Practice, Voice Practice, or an Interview).
2. The backend runs real NLP on what you actually wrote/said and computes 8 skill scores.
3. Those scores are blended into your profile (`app/personalization/learner_profile.py`) — recent sessions matter more than old ones, but one bad session doesn't wreck your whole average.
4. Weakness detection re-runs on every update (a skill is "weak" if it's both below 65 **and** below your own average).
5. A scikit-learn model (trained at startup) predicts your difficulty level from your average score, recent trend, and consistency.
6. Your daily/weekly plan is built from your specific weaknesses at that difficulty level — two students never see the same plan.
7. If the same weakness shows up in 3 of your last 5 sessions, it's auto-added to your "Topics to Review" queue; it's removed automatically once it stops appearing.

You can watch this happen: sign up as a new user, do a couple of Text Practice sessions with deliberately bad grammar, then check the Dashboard, Learning Plan, and Analytics pages — the numbers and recommendations will have shifted to target exactly what you did wrong.

---

## 7. Honesty check: how accurate is the AI, really?

This section exists because "adaptive AI platform" can sound like it's using a large language model to grade you. **It isn't.** No LLM scores anything in this project — every number comes from regex pattern-matching, spaCy POS tagging, and statistical formulas written by hand. That makes scores fast, free, deterministic, and explainable — but it also means the analysis is intentionally lightweight, not production-grade. Here's the honest breakdown:

| Capability | How accurate | Why |
|---|---|---|
| Filler word detection | **Reliable** | Real regex match against the actual transcript. |
| Speaking pace (WPM) | **Reliable, if the transcript is real** | Real math (words ÷ duration), but only as good as the transcript feeding it. |
| Scoring consistency | **Reliable** | Same input always produces the same score — no randomness, no LLM guessing. |
| Grammar checking | **Narrow coverage** | Catches ~7 specific patterns (double negatives, a few subject-verb agreement cases, tense-mixing, some homophones, casual contractions). Will **miss** most grammar errors outside these patterns — it is not a substitute for Grammarly/LanguageTool. |
| Vocabulary scoring | **A real but simple proxy** | Measures lexical diversity + word length + repetition, not contextual "appropriateness." Correct, simple English scores lower than it deserves to. |
| STAR/behavioral structure | **Keyword-based, decent for typical phrasing** | Looks for phrases like "at the time," "I decided," "as a result." Unusual phrasing can fool it either direction. |
| Fluency scoring | **Weaker in the actual browser flow** | Real pause detection needs genuine WAV audio; browsers record webm, which this project can't decode (no ffmpeg included), so it falls back to an estimated pause pattern rather than your real speech rhythm. |
| Pronunciation scoring | **Not a real assessment — treat as a placeholder** | No phoneme model exists. It's a rough guess based on whether speech-to-text succeeded. Documented here so it's never mistaken for real pronunciation feedback. |
| Interview follow-up questions | **Not implemented** | The interview asks a fixed sequence of questions; it does not generate a smart follow-up based on what you actually said. |
| Answer relevance to the question | **Not checked** | Grammar/vocabulary/structure are analyzed regardless of whether you actually answered the question asked. |
| Technical answer correctness | **Not checked** | There's no fact-checking of technical content — a confident wrong answer can score similarly to a correct one if phrased similarly. |

**What this project is good evidence of:** a working adaptive-learning *architecture* (personalization loop, weakness detection, revision queue, difficulty modeling) built on a real full-stack NLP pipeline. **What it is not:** a linguistically validated, production-accurate grammar/pronunciation grading service. Say so if you present it — it's a stronger, more credible pitch than overclaiming.

---

## 8. What's real vs. mock (per-module reference)

Every backend response includes a `source: "real" | "mock"` field, and every page that calls it shows a matching badge — so this is always visible in the running app, not just documented here.

| Capability | Real implementation | Falls back to mock when... |
|---|---|---|
| Grammar checking | Rule-based checker (regex + spaCy POS tags) | spaCy model not downloaded → tense-consistency check is skipped, other rules still run |
| Vocabulary analysis | Type-token ratio, word length, repetition | Never mocked — pure Python, always real |
| Structure / STAR analysis | Keyword + position heuristics | Never mocked |
| Speech-to-text | `SpeechRecognition` + Google Web Speech API on WAV audio | No internet, non-WAV upload, or empty recognition → canned transcript |
| Pause/silence detection | RMS-energy analysis on WAV/PCM (stdlib `wave`/`audioop`) | Upload isn't parseable as WAV (e.g. webm/opus) → transcript-based estimate |
| Confidence/tone scoring | Optional HuggingFace DistilBERT pipeline | Not enabled, or `transformers`/`torch` not installed → lexical heuristic |
| Adaptive difficulty | scikit-learn `RandomForestClassifier`, trained at startup | Always real (trained on a synthetic bootstrap dataset — see `app/ml/difficulty_model.py`) |
| Weakness/strength detection | Rule-based thresholds | Never mocked |
| Resume parsing | `pypdf` text extraction | Unreadable PDF → empty text, handled gracefully |
| Admin Dashboard | — | Intentionally always mock (see §5) |

---

## 9. Testing paths

### 9.1 Frontend only

```bash
npm install && npm run dev
```

Walk the flow: Landing → Signup → Onboarding (5 steps) → Dashboard → try Voice/Text/Grammar/Vocabulary Practice → Interview Practice → Learning Plan → Analytics → Achievements → Profile → Settings → AI Coach.

Build check (should complete with zero errors):
```bash
npm run build
```

### 9.2 Automated backend tests (accuracy modules)

Each analysis module (grammar, vocabulary, etc.) gets its own pytest file as it's audited and rebuilt for accuracy — see `AUDIT.md` for the full module-by-module plan and honesty findings.

```bash
cd backend
venv\Scripts\activate
pip install -r requirements-dev.txt
pytest tests/ -v
```

Currently covers: `tests/test_grammar_rules.py` (Module 1 — grammar scoring, category separation, confidence levels). Every score assertion in these tests is an exact hand-computed value from the documented formula, not a range check.

### 9.3 Backend only — via Swagger UI or curl

```bash
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for a clickable interface, or:

```bash
curl http://localhost:8000/api/v1/health

curl -X POST http://localhost:8000/api/v1/auth/signup -H "Content-Type: application/json" -d '{
  "full_name": "Test Student", "email": "test@example.edu", "password": "Password123!",
  "college": "VIT", "course": "CSE", "year": "3rd Year", "career_goal": "Software Engineer"
}'
# copy the "student_id" from the response into $SID below

curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{
  "student_id": "'"$SID"'", "question": "Tell me about yourself",
  "answer": "I dont have no experience but I am gonna work alot hard. Neither of the teams were ready."
}'
# expect corrections for subject_verb_agreement, spelling, formality

curl -X POST http://localhost:8000/api/v1/interview/start -H "Content-Type: application/json" -d '{"student_id":"'"$SID"'","category_id":"behavioral"}'
```

### 9.4 Full stack together

Run both dev servers, open the frontend, and watch the **"Live from backend"** badge on the Dashboard, Text Practice, Interview Practice, Achievements, and Learning Plan pages. Stop the backend and reload — the badge switches to "Demo data — backend offline" and every page keeps working.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `'node' is not recognized` / `'python' is not recognized` | The tool isn't installed or isn't on your PATH. Reinstall and make sure to check "Add to PATH" (Python installer has this checkbox), then open a **new** terminal window. |
| `spacy_model_loaded: false` in the health check | Run `python -m spacy download en_core_web_sm` again from inside the activated `venv`. |
| Backend port 8000 already in use | Another process is using it. Either stop that process, or run uvicorn on a different port (`--port 8001`) and update `VITE_API_BASE_URL` in the frontend's `.env` to match. |
| Frontend shows "Demo data — backend offline" even though the backend is running | Check the backend terminal for errors, confirm `http://localhost:8000/api/v1/health` loads in a browser, and confirm `src/.env` (or the default) points at the right port. |
| `pip install` fails partway through | Usually a flaky network — just re-run `pip install -r requirements.txt`, pip resumes from where it left off. |
| Microphone doesn't work | Browser microphone permissions must be granted for `localhost:5173`. If you're testing inside a sandboxed preview/embedded browser (not a real browser tab), mic access may be blocked by that environment — this is a browser/sandbox limitation, not an app bug. |
| `npm install` is slow or fails | Delete `node_modules` and `package-lock.json`-generated lock issues by re-running `npm install`; make sure you have a stable internet connection for the first install. |

---

## 11. Project structure

```
ai-comm-coach/
├── src/                        # React + TypeScript frontend
│   ├── components/
│   │   ├── ui/                 # Design system: Button, Card, Badge, Input, Select,
│   │   │                       #   Modal, ProgressBar, RadialProgress, Tooltip, Toaster,
│   │   │                       #   Skeleton, EmptyState, ErrorState, Switch
│   │   ├── layout/              # Sidebar, Topbar, MobileNav, AppShell, PublicShell
│   │   ├── three/                # CommunicationOrb (lazy-loaded), ParticleField
│   │   ├── charts/                # Recharts wrappers (trend, radar, donut, bar, line)
│   │   └── shared/                 # PageHeader, StatCard, Waveform, Accordion, FlipCard...
│   ├── pages/                       # One folder per route — see §5 for the full list
│   ├── services/                     # apiClient.ts (axios) + one service per domain;
│   │                                 #   each tries the real backend, falls back to mock
│   ├── hooks/                         # useAuth, useToast, useTheme, useVoiceRecorder, ...
│   ├── lib/auth.ts                     # decodes the stored token to get the real student id
│   ├── data/mockData.ts                # realistic demo data used by the mock fallbacks
│   └── types/                           # shared TypeScript interfaces
│
├── backend/                               # Python + FastAPI backend
│   ├── app/
│   │   ├── main.py                         # FastAPI app, CORS, router registration
│   │   ├── core/                            # config.py (env settings), security.py (auth)
│   │   ├── api/routes/                       # auth, students, assessment, practice,
│   │   │                                     #   interview, coach, admin
│   │   ├── schemas/                           # Pydantic request/response models
│   │   ├── nlp/                                 # spaCy pipeline + rule-based grammar checker
│   │   │                                       #   + vocabulary/structure/clarity analysis
│   │   ├── speech/                               # speech-to-text + pace/filler/pause metrics
│   │   ├── ml/                                     # scikit-learn adaptive-difficulty model +
│   │   │                                           #   optional transformer confidence model
│   │   ├── personalization/                          # learner profile, weakness detection,
│   │   │                                             #   exercise generation, achievements,
│   │   │                                             #   revision queue, recommendations
│   │   ├── interview/                                  # question bank, resume parsing,
│   │   │                                               #   STAR/answer-structure analysis
│   │   ├── services/                                     # orchestrates the modules above
│   │   │                                                 #   into the API's actual responses
│   │   └── database/store.py                               # JSON-file persistence
│   ├── requirements.txt                                      # core dependencies
│   ├── requirements-ml-optional.txt                            # torch + transformers (opt-in)
│   └── .env.example
│
└── .env.example                                                # VITE_API_BASE_URL
```

---

## 12. Architecture notes

- **Auth:** real signup/login (password hashing via PBKDF2, HMAC-signed tokens — see `backend/app/core/security.py`). A wrong password shows a real error rather than silently succeeding. No `Authorization` header sent → the backend transparently serves a fixed `demo-student` profile so the whole app is explorable with zero signup.
- **Services layer (frontend):** every page calls a function in `src/services/*.ts`, never `fetch`/`axios` directly. Each follows the same `try backend, catch → mock` pattern (see `studentService.ts`'s `withFallback` helper).
- **3D:** `CommunicationOrb` (React Three Fiber + drei) is lazy-loaded (`React.lazy` + `Suspense`) so its ~900KB chunk streams in after a page's initial paint instead of blocking it, and pages that never render it never fetch it at all.

---

## 13. Known limitations / future improvements

- **Pronunciation, follow-up questions, answer relevance, and technical correctness** are not implemented — see §7 for the full honest breakdown.
- **STT** requires internet (Google's free Web Speech API) and WAV input; a production deployment should transcode browser webm/opus to WAV with ffmpeg before calling `/assessment/voice`.
- **Adaptive difficulty model** is trained on a synthetic bootstrap dataset (no real student cohort exists yet) — see the docstring in `app/ml/difficulty_model.py` for the real-data upgrade path.
- **Analytics trend buckets** are labeled "Session N," not calendar dates — a production version would bucket by real calendar week once usage spreads over time.
- **Auth** is demo-grade (no refresh tokens, no revocation, no rate limiting) — swap for a real auth provider before any real deployment.
- The **Admin Dashboard** stays on mock data until there's a real student cohort large enough to look like the intended "premium SaaS" demo.

---

## 14. Tech stack (as required)

**Backend / AI:** Python, FastAPI, NLP (spaCy), Transformer Models (HuggingFace `transformers`, optional), scikit-learn, PyTorch (transformer backend), Speech-to-Text & Speech Processing (`SpeechRecognition`, stdlib `wave`/`audioop`)
**Frontend:** React, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber, Recharts, React Router, React Hook Form + Zod, Axios, Lucide React
**Version control:** Git
