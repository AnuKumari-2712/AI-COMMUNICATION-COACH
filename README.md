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
{
  "status": "ok",
  "use_mock_ai": false,
  "spacy_model_loaded": true,
  "transformer_confidence_enabled": false,
  "engines": {
    "claude": false,
    "t5": false,
    "whisper": true,
    "spacy": true
  }
}
```

`use_mock_ai: false` confirms Honest AI Mode is active (no silent mock data for logged-in users). `engines` reports the live operational status of each backend AI engine. Interactive API docs are at `http://localhost:8000/docs`.

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

This platform employs a transparent, multi-engine hybrid architecture designed to deliver production-level insights while remaining 100% explainable and deterministic. Rather than relying on black-box scoring, numerical scores and streak analytics follow exact mathematical formulas, while contextual language intelligence is powered by state-of-the-art models with deterministic fallbacks. Every response includes transparent engine source tags (`grammar_engine`, `vocab_engine`, `relevance_engine`, `transcript_engine`) displayed directly in the user interface.

| Capability | How accurate | Why |
|---|---|---|
| Filler word detection | **Exact & Reliable** | Real regex match against the actual transcript + Whisper hesitation prompting (`Umm, uh, like, you know, basically`). |
| Speaking pace (WPM) | **Reliable & Measured** | Real math (words ÷ actual speech duration in minutes), computed from 16 kHz WAV audio stream. |
| Fluency scoring | **Signal-derived formula** | Measured from real audio PCM signals using adaptive RMS energy silence detection. Fluency = `100 − hesitation (long pauses/min) − fillers/min − excess silence`. The exact arithmetic breakdown is returned to the client as `fluency_formula`. |
| Scoring consistency & Streaks | **Deterministic, 100% calendar math** | Same input produces the exact same score. Streaks chain consecutive calendar days, deduplicate same-day practice sessions, and reset to 0 upon missed days. Brand-new users display "No data yet" (0.0 baseline) instead of fake numbers. |
| Grammar checking | **Multi-Engine (Claude / T5 / Rules)** | Configurable via `GRAMMAR_ENGINE_ORDER` (default: `"claude,t5,rules"`). When Claude is active (`ANTHROPIC_API_KEY`), runs strict sentence-by-sentence JSON correction with context-aware analysis. Falls back to fine-tuned local T5 (`backend/models/gec-t5`, evaluated at 81.39 GLEU on JFLEG benchmark) or rule-based engine (25+ exact grammatical patterns + spaCy POS tagging). Engine source badge is displayed in UI. |
| Vocabulary scoring | **Dual-Engine (Claude + Herdan's C)** | Claude evaluates contextual appropriateness (0-100 score), identifies weak words, and recommends 3-5 elevated replacements with contextual rationales. Python independently recomputes Herdan's C lexical diversity ($C = \frac{\log V}{\log N}$) and word length to eliminate hallucinations. Falls back to pure lexical diversity heuristics when Claude is unavailable. |
| Answer relevance to question | **Dual-Engine (Claude + Keyword)** | Claude evaluates whether the candidate's answer directly addresses the interview or speaking question, returning a 0-100 `relevance_score`, a concise 10-25 word `relevance_reason`, and key covered/missing topics. Falls back to keyword coverage matching. |
| Interview follow-up questions | **Dual-Engine (Claude + Template)** | Claude generates 1 probing follow-up question referencing specific technologies, metrics, or experiences mentioned in the candidate's previous answer. Falls back to template-based follow-up generator. |
| Speech-to-text | **Multi-Engine (Faster-Whisper / Google)** | Configurable local faster-whisper speech recognition with int8 CPU quantization, word-level timestamps, and hesitation prompts. Falls back to Google Web Speech API or browser Web Speech. On recognition failure, displays a clear retry badge ("Could not understand audio, please try again"), never a canned transcript. |
| STAR / behavioral structure | **Pattern-based heuristic** | Analyzes Situation, Task, Action, and Result markers via structured semantic indicator phrases. |
| Technical answer correctness | **Checklist-based** | Evaluates candidate answer against a concept checklist for technical questions; returns `applicable=False` for open-ended or resume-based questions to avoid guessing. |

---

## 8. What's real vs. mock (per-module reference)

Every backend response includes an explicit `source: "real" | "mock"` field along with specific engine identifiers (`grammar_engine`, `vocab_engine`, `relevance_engine`, `transcript_engine`). The UI displays matching badges across all pages so you can immediately see which engine evaluated your submission.

| Capability | Real implementation | Fallback behavior |
|---|---|---|
| Grammar checking | Multi-engine fallback: Claude 3.5 Sonnet → Fine-tuned T5 (`gec-t5`) → Regex/spaCy rule engine | Degrades gracefully down the configured order (`GRAMMAR_ENGINE_ORDER`). Always reports exact engine badge ("Claude AI", "T5 Model", "Rule Engine"). |
| Vocabulary analysis | Claude contextual analysis + Herdan's C lexical diversity | Falls back to pure statistical lexical diversity & word length analysis (`vocab_engine="heuristic"`). |
| Answer relevance | Claude semantic evaluation (score + 10-25 word explanation + keyword sets) | Falls back to keyword matching (`relevance_engine="heuristic"`). |
| Interview follow-up | Claude dynamic question referencing candidate's specific answer details | Falls back to template-based generator (`followup_engine="heuristic"`). |
| Speech-to-text | Local Faster-Whisper (int8 CPU quantization with word timestamps & filler prompts) | Falls back to Google Web Speech API or browser speech recognition. Unintelligible audio returns clear error badge, never canned text. |
| Voice delivery & pause analysis | Adaptive RMS-energy silence detection on 16 kHz WAV/PCM audio | Non-WAV upload falls back to transcript-based pace estimation (`pace_source="estimated"`). |
| Confidence & tone scoring | Lexical heuristic or optional HuggingFace DistilBERT pipeline | Defaults to fast lexical analysis; transformer model is opt-in (`ENABLE_TRANSFORMER_CONFIDENCE=true`). |
| Adaptive difficulty | scikit-learn `RandomForestClassifier` trained at startup | Always real — predicts beginner/intermediate/advanced difficulty dynamically from profile history. |
| Weakness & revision queue | Deterministic threshold logic (weakness if score < 65 and below learner average) | Always real — mistakes recurring 3+ times auto-enqueued for revision. |
| Streak & score calculation | 100% deterministic calendar math with same-day deduplication and midnight crossover | Never mocked — brand-new users show 0.0 baseline ("No data yet"). |
| Resume parsing | `pypdf` text extraction | Unreadable PDF returns empty text gracefully. |
| Data persistence | SQLite locally (`coach.db`), PostgreSQL in production via `DATABASE_URL` | Never mocked — persistent relational storage with auto-migration. |
| Admin Dashboard | — | Intentionally rich mock data for presentation purposes. |

### 8.1 Where your data is stored

All application data is permanently stored in the configured database (SQLite locally at `backend/data/coach.db`, or PostgreSQL via `DATABASE_URL` in production):
- **User Accounts & Credentials**: Stored in the `store_documents` table under `collection = 'users'`. Passwords are salted and hashed using PBKDF2-HMAC-SHA256 with 100,000 iterations; passwords are never logged and never stored in plaintext.
- **Learner Profiles, Scores, & Progress**: Stored in the `store_documents` table under `collection = 'learner_profiles'`. Contains the student's 8 skill scores, streak count, calendar dates, practice history items, strengths, weaknesses, and revision queue.
- **Data Persistence**: Data survives server restarts, application object recreation, and deployments without loss. Legacy JSON files are automatically migrated on startup.

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

## 13. System Architecture & Multi-Engine Intelligence

- **Honest AI Mode (`USE_MOCK_AI=false`):** By default, mock data is never returned for authenticated users. The backend connects directly to real speech, NLP, and database engines. If any engine is configured or active, mock AI is automatically disabled system-wide.
- **Multi-Engine Grammar Pipeline:** Uses Claude 3.5 Sonnet for rich, contextual sentence-by-sentence JSON correction. Seamlessly falls back to a fine-tuned Seq2Seq model (`flan-t5-small-gec`, 81.39 GLEU) or a high-speed rule-based engine (25+ exact patterns + spaCy POS tagging).
- **Dual-Engine Vocabulary & Relevance:** Evaluates contextual vocabulary appropriateness and semantic answer relevance via Claude 3.5 Sonnet with concise 10-25 word rationales, while Python independently computes Herdan's C lexical diversity to guarantee hallucination-free metrics.
- **Speech & Fluency Processing:** Features local Faster-Whisper with int8 CPU quantization, word-level confidence timestamps, and hesitation prompts (`Umm, uh, like`), alongside client-side 16 kHz mono WAV conversion and server-side adaptive RMS energy silence detection.
- **Permanent Relational Database:** Supports SQLite locally at `backend/data/coach.db` and PostgreSQL in production via `DATABASE_URL` with salted PBKDF2 password hashing (100,000 iterations).

---

## 14. Tech stack (as required)

**Backend / AI:** Python 3.11+, FastAPI, Anthropic Claude 3.5 Sonnet, Hugging Face Transformers (`google/flan-t5-small`), spaCy (`en_core_web_sm`), Faster-Whisper (int8 quantization), SpeechRecognition, scikit-learn (`RandomForestClassifier`), PyTorch, SQLite / PostgreSQL (`psycopg2`), stdlib `wave` / `audioop` / `difflib`.
**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, React Three Fiber, Recharts, React Router v7, React Hook Form + Zod, Axios, Lucide React.
**Evaluation & Benchmarking:** Generalized Language Evaluation Understanding (GLEU), JFLEG Benchmark, Grammatical Error Correction (`grammarly/coedit`).
**Version control:** Git (uncommitted for review, `.env` gitignored).
