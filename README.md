# AI-Powered Personalized Communication & Interview Coach

An adaptive platform that evaluates a student's communication ability through voice and text, builds a dynamic learner profile, detects weaknesses, and generates a personalized (not identical-for-everyone) practice plan — including grammar, vocabulary, fluency and full interview simulations.

- **Frontend:** React + TypeScript + Tailwind CSS + Framer Motion + React Three Fiber + Recharts + React Router + React Hook Form/Zod
- **Backend:** Python + FastAPI + spaCy (NLP) + scikit-learn (adaptive difficulty) + SpeechRecognition (speech-to-text) + an optional HuggingFace Transformers model
- **Storage:** JSON-file "database" (swap-in ready for Postgres/Mongo — see `backend/app/database/store.py`)

---

## 1. Project structure

```
ai-comm-coach/
├── src/                        # React + TypeScript frontend
│   ├── components/
│   │   ├── ui/                 # Design system: Button, Card, Badge, Input, Select,
│   │   │                       #   Modal, ProgressBar, RadialProgress, Tooltip, Toaster,
│   │   │                       #   Skeleton, EmptyState, ErrorState, Switch
│   │   ├── layout/              # Sidebar, Topbar, MobileNav, AppShell, PublicShell
│   │   ├── three/                # CommunicationOrb, ParticleField (React Three Fiber)
│   │   ├── charts/                # Recharts wrappers (trend, radar, donut, bar, line)
│   │   └── shared/                 # PageHeader, StatCard, Waveform, Accordion, FlipCard...
│   ├── pages/                       # One folder per route (landing, auth, onboarding,
│   │                                 #   dashboard, practice/*, interview/*, plan, analytics,
│   │                                 #   profile, settings, coach, achievements, admin)
│   ├── services/                     # api layer — apiClient.ts (axios) + one service per
│   │                                 #   domain; each currently mocks data and is written so
│   │                                 #   swapping in a real backend call is a one-line change
│   │                                 #   (see practiceService.analyzeText for a live example)
│   ├── hooks/                         # useAuth, useToast, useTheme, useVoiceRecorder, ...
│   ├── data/mockData.ts                # realistic demo data used by the mock services
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
│   │   │                                             #   exercise generation, recommendations
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

## 2. Install & run

### Frontend

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. It works standalone with realistic mock data even with no backend running.

To point it at the real backend, copy the env file and adjust if needed (the default already matches the backend's default port):

```bash
cp .env.example .env
```

### Backend

Requires Python 3.11+.

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python -m spacy download en_core_web_sm

cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Opens at `http://localhost:8000`. Interactive API docs (Swagger UI) at `http://localhost:8000/docs`.

Optional — enable the real transformer-based confidence model (otherwise a fast lexical heuristic is used, clearly labeled as such in every response):

```bash
pip install -r requirements-ml-optional.txt
# then set ENABLE_TRANSFORMER_CONFIDENCE=true in backend/.env
```

Run both at once and the frontend automatically uses the real backend wherever it's wired up — see §5 for the full list (Dashboard, Text/Voice Practice, Grammar/Vocabulary Practice, Interview Practice, AI Coach). Each of those pages shows a **"Live from backend" / "Demo data — backend offline"** badge so it's always visible which path served the data on screen.

---

## 3. What's real vs. mock (per-module)

The spec explicitly requires mock data to be used — and clearly labeled — wherever a real service isn't configured (no GPU, no internet, model not downloaded), rather than faked as real. Every backend response includes a `source: "real" | "mock"` field so the frontend (and you, testing it) can always tell which path ran.

| Capability | Real implementation | Falls back to mock when... |
|---|---|---|
| Grammar checking | Rule-based checker (regex + spaCy POS tags) — subject-verb agreement, double negatives, tense consistency, homophones, formality | spaCy model not downloaded → tense-consistency check is skipped, other rules still run |
| Vocabulary analysis | Type-token ratio, average word length, repeated-word detection, upgrade suggestions | Never mocked — pure Python, always real |
| Structure / STAR analysis | Keyword + position heuristics for intro/body/example/conclusion and Situation-Task-Action-Result | Never mocked |
| Speech-to-text | `SpeechRecognition` + Google Web Speech API on uploaded WAV audio | No internet, non-WAV upload, or empty recognition → realistic canned transcript, `source: "mock"` |
| Pause/silence detection | Real RMS-energy analysis on WAV/PCM audio (stdlib `wave`/`audioop`) | Upload isn't parseable as WAV (e.g. raw webm/opus) → transcript-based estimate |
| Confidence/tone scoring | Optional HuggingFace DistilBERT sentiment pipeline (opt-in, see above) | Not enabled, or `transformers`/`torch` not installed → lexical heuristic (hedging/assertive word counts) |
| Adaptive difficulty | scikit-learn `RandomForestClassifier`, trained at startup | Always real — trained on a synthetic bootstrap dataset since there's no historical cohort data yet (see `app/ml/difficulty_model.py` docstring for the real-data upgrade path) |
| Weakness/strength detection | Rule-based (absolute + relative thresholds against the student's own mean score) | Never mocked |
| Resume parsing | `pypdf` text extraction + keyword/section matching | Unreadable PDF → empty text, handled gracefully |
| Frontend pages not yet wired to the backend | — | Use `src/data/mockData.ts` via each `services/*.ts` file; each is written so swapping in a real call is localized to that one file |

---

## 4. Testing paths — how to verify each piece

### 4.1 Frontend only (no backend needed)

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and walk the flow:

1. **Landing → Start Practice → Signup** — fill the form, watch the password-strength meter, submit → success screen.
2. **Onboarding** (5 steps) — personal info → goals (multi-select chips) → career goal → assessment (type an answer) → animated "Generating..." → **Your Personalized Learning Profile is Ready** with radial score rings.
3. **Dashboard** — stat cards, performance chart, skill breakdown, today's plan (click a task to toggle done), 3D AI coach orb.
4. **Voice Practice / Fluency Practice** — click the mic button; your browser will prompt for microphone permission (grant it in a real browser — the sandboxed preview pane used during development blocks mic access, which is a pane limitation, not an app bug). Record, stop, "View Detailed Feedback".
5. **Text Practice** — submit an answer with a deliberate mistake (e.g. "alot", "gonna", "Neither of the teams were ready") and see it flagged.
6. **Interview Practice** — pick a category, answer each question, "Finish Interview" → **Interview Result** page with went-well/needs-improvement/recommended sections.
7. **Vocabulary / Grammar Practice, Learning Plan, Analytics, Achievements, Profile, Settings, AI Coach, Admin Dashboard** (`/app/admin`) — each is a self-contained, fully clickable page; there are no dead buttons.

Build check:
```bash
npm run build     # tsc -b && vite build — should complete with no errors
```

### 4.2 Backend only (no frontend needed) — via Swagger UI or curl

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for an interactive UI, or run these from a terminal:

```bash
# Health check — confirms spaCy actually loaded
curl http://localhost:8000/api/v1/health

# Sign up a student
curl -X POST http://localhost:8000/api/v1/auth/signup -H "Content-Type: application/json" -d '{
  "full_name": "Test Student", "email": "test@example.edu", "password": "Password123!",
  "college": "VIT", "course": "CSE", "year": "3rd Year", "career_goal": "Software Engineer"
}'
# → copy the "student_id" from the response into $SID below

# Analyze intentionally broken text (real spaCy + rule-based grammar engine)
curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{
  "student_id": "'"$SID"'", "question": "Tell me about yourself",
  "answer": "I dont have no experience but I am gonna work alot hard. Neither of the teams were ready."
}'
# → expect corrections for subject_verb_agreement, spelling, formality

# Fetch the adaptive daily plan (built from scikit-learn difficulty + weakness detection)
curl http://localhost:8000/api/v1/students/me/plan/today -H "Authorization: Bearer $TOKEN"

# Run a full interview round
curl -X POST http://localhost:8000/api/v1/interview/start -H "Content-Type: application/json" -d '{"student_id":"'"$SID"'","category_id":"behavioral"}'
# → copy session_id + a question_id, then:
curl -X POST http://localhost:8000/api/v1/interview/answer -H "Content-Type: application/json" -d '{
  "session_id": "'"$SESSION"'", "question_id": "'"$Q0"'", "mode": "text",
  "answer_text": "At the time, we were behind schedule and I needed to resolve a disagreement. So I organized a meeting and proposed a compromise. As a result, we shipped on time."
}'
curl -X POST http://localhost:8000/api/v1/interview/submit -H "Content-Type: application/json" -d '{"session_id":"'"$SESSION"'"}'

# Repeat the broken-text call above 3 times, then check the revision queue and real trend/activity:
curl http://localhost:8000/api/v1/students/me/revision-queue
curl http://localhost:8000/api/v1/students/me/analytics/trend
curl http://localhost:8000/api/v1/students/me/analytics/activity
```

Each call above was run during development against this exact codebase and produced real, non-mocked grammar/structure/adaptive-plan/revision-queue output — not placeholder text.

### 4.3 Full stack together

Run both dev servers, then open the frontend. Pages that are wired to the real backend (each shows a **"Live from backend"** / **"Demo data — backend offline"** badge, so the fallback is always visible, never silent):

| Page | Real endpoint(s) it calls |
|---|---|
| Dashboard | `GET /students/me`, `/students/me/plan/today`, `/students/me/analytics/trend`, `/students/me/analytics/activity` |
| Communication Analysis | `GET /students/me/weaknesses`, `/students/me/recommendation` |
| Learning Plan | `GET /students/me/plan/week`, `/students/me/revision-queue`, `DELETE /students/me/revision-queue/{topic}` |
| Analytics | `GET /students/me/analytics/trend`, `/students/me/analytics/activity`, `/students/me/weaknesses`, `/students/me/recommendation` |
| Text Practice | `POST /assessment/text` |
| Voice Practice, Fluency Practice | `POST /assessment/voice` (multipart audio upload) |
| Grammar Practice | `GET /practice/grammar/questions` (weakness + difficulty ordered) |
| Vocabulary Practice | `GET /practice/vocabulary/words` (weakness + difficulty ordered), `POST /students/me/vocabulary/learned/{word}` |
| Interview Practice | `GET /interview/categories`, `POST /interview/resume-upload`, `/interview/start` (resume/job-role generated when applicable) → `/assessment/voice` (transcript) → `/interview/answer` → `/interview/submit` |
| Achievements | `GET /students/me/achievements` — every unlock/progress value computed from real streak, session counts and score history, not a static list |
| AI Coach | `POST /coach/chat`, `GET /coach/suggested-prompts` |

Try it: stop the backend (`Ctrl+C` in its terminal) and reload the Dashboard — every card still renders, now from `src/data/mockData.ts`, with the badge switched to "Demo data — backend offline". Restart the backend and reload again — the badge flips back and the numbers change to the backend's live values. That live-vs-mock switch, visible in the UI without any frontend code change, is the "ready to swap for a real backend" requirement made concrete.

The trend/activity endpoints need real session history to return anything (a brand-new student has none) — they 404 until there are 2+ sessions, and the frontend's `withFallback` treats that exactly like a backend-down case and shows demo data with the "offline" badge. Generate real history quickly via curl (§4.2's `/assessment/text` example, called 2-3 times) or by using Text/Voice Practice in the UI a couple of times, then reload Dashboard/Analytics/Learning Plan to see it switch to genuine per-session numbers, a real "Topics to Review" list, and a recommendation that reprioritizes once you clear a topic.

**Still intentionally on mock data** (see §6): the Admin Dashboard — a fresh backend install has only the handful of students you've created via curl/signup, which would look sparse next to the "premium SaaS" demo that page is meant to show.

---

## 5. Architecture notes

- **Personalization loop:** `POST /assessment/text|voice` → updates `LearnerProfile.scores` via an exponential moving average → `GET /students/me/weaknesses` (rule-based) → `GET /students/me/plan/today` (scikit-learn difficulty + weakness-driven exercise selection) → practicing again updates the profile again. This loop is what makes two students' plans diverge over time instead of being identical. You can watch it happen: submit a few Text Practice answers, then reload the Dashboard — the Skill Breakdown numbers and Today's Plan both shift.
- **Revision queue (spec §31):** every score update also re-runs weakness detection and checks it against the last 5 sessions (`app/personalization/learner_profile.py::update_scores`) — a weakness present in 3+ of them is auto-added to `revision_queue` and surfaced as "Topics to Review" on the Learning Plan page; it's auto-removed once it stops appearing, or a student can clear it manually. The recommendation engine checks this queue first, ahead of the general weakness ranking.
- **Achievements (spec §36) and resume/job-role interviews (spec §25-26)** are genuinely data-driven, not decorative: achievements read real streak/session-count/score-history fields (`app/personalization/achievements.py`), and the Resume-based / Job-role interview categories only differ from a generic HR interview once the frontend's setup modal actually collects a resume or role — see `InterviewPracticePage.tsx`'s `setupCategory` modal and `question_bank.get_resume_based_questions` / `get_job_role_questions`.
- **Demo student:** the frontend calls every endpoint as `demo-student` (see `src/lib/constants.ts` and `app/api/deps.py`), a fixed backend profile seeded with the same starting scores as `src/data/mockData.ts`'s "Ananya Sharma" — so the mock and real paths show consistent data and the whole app is explorable with zero signup/login. A real bearer token from `/auth/signup` or `/auth/login` switches to that student's own profile instead.
- **Services layer (frontend):** every page calls a function in `src/services/*.ts`, never `fetch`/`axios` directly. Each service follows the same `try backend, catch → mock` pattern (see `studentService.ts`'s `withFallback` helper) — that's the seam to extend when wiring the remaining pages listed above.
- **3D:** `CommunicationOrb` (React Three Fiber + drei, distorted sphere) and `ParticleField` are the only 3D elements, used sparingly (hero, auth pages, dashboard, AI Coach) and kept lightweight (low poly count, capped DPR, no postprocessing) per the "3D only where it improves the experience" requirement.

---

## 6. Known limitations / future improvements

- **Pronunciation scoring** has no ground-truth phoneme model — it's a documented heuristic (STT success + word complexity). A real upgrade path is a forced-alignment model (e.g. Montreal Forced Aligner) or a phoneme-level ASR confidence score.
- **Adaptive difficulty model** is trained on a synthetic bootstrap dataset (no student cohort exists yet for this fresh project) — see the docstring in `app/ml/difficulty_model.py` for exactly where to swap in real historical data once it exists.
- **STT** requires internet access (Google's free Web Speech API) and WAV input; browser recordings are webm/opus, so a production deployment should transcode with ffmpeg before calling `/assessment/voice` for the real STT path to engage (it degrades to a mock transcript otherwise, never silently).
- **Auth** is demo-grade (HMAC-signed token, no refresh/revocation) — swap for a real auth provider before any real deployment.
- **Interview voice answers** are transcribed via a reused `/assessment/voice` call purely for its transcript field before scoring — an extra round-trip that a dedicated "transcribe only" endpoint would avoid in a larger deployment.
- **Analytics trend buckets** are labeled "Session N", not calendar dates/weeks — the backend groups by session order, not wall-clock time, since a demo student's sessions may all happen in one sitting. A production version would bucket by real calendar week once usage is spread over time.
- The **Admin Dashboard** is intentionally still on rich mock data (see §4.3) — every other page's service follows the same `try backend, catch → mock` structure (see §2's `services/` note), so wiring it up once there's a real student cohort is mechanical, not a redesign.

---

## 7. Tech stack (as required)

**Backend / AI:** Python, FastAPI, NLP (spaCy), Transformer Models (HuggingFace `transformers`, optional), scikit-learn, PyTorch (transformer backend), Speech-to-Text & Speech Processing (`SpeechRecognition`, stdlib `wave`/`audioop`)
**Frontend:** React, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber, Recharts, React Router, React Hook Form + Zod, Axios, Lucide React
**Version control:** Git (this repo)
