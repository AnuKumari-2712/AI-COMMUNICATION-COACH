# Project Execution & Upgrade Tracking (Brain)

Yeh folder har prompt ke upgrades, bug fixes, test results aur implementation decisions ko step-by-step track karne ke liye banaya gaya hai.

---

## Roadmap Overview

| Prompt | Focus Area | Status |
|---|---|---|
| **Prompt 1** | Real Name/Email + Frontend-Backend Connection, No Mock Fallback for Logged-In Users, CORS & Render Banner | **COMPLETED** |
| **Prompt 2** | Data Permanent Save (SQLite locally, PostgreSQL on Render/Neon/Supabase) | **COMPLETED** |
| **Prompt 3** | Deterministic Score, Streak, Analytics (No ML model) | **COMPLETED** |
| **Prompt 4** | Grammar Engines (Claude + Order Setting + Sentence-by-sentence UI) | **COMPLETED** |
| **Prompt 5** | Voice Transcript Fix (Whisper + ffmpeg + Google Web Speech fallback) | **COMPLETED** |
| **Prompt 6** | Real Voice Feedback (Pause, Pace/WPM, Filler, Pronunciation confidence) | **COMPLETED** |
| **Prompt 7** | Vocabulary, Answer Relevance, Interview Follow-up (Claude) | **COMPLETED** |
| **Prompt 8** | T5 Model Fine-Tuning Pipeline & Evaluation | **COMPLETED** |
| **Prompt 9** | Honest AI Mode + Final Check + Accuracy Report | **COMPLETED** |

---

## Common Rules Enforced
1. **Never commit secrets**: Keep `.env` in `.gitignore`, update `.env.example` only.
2. **Never silently fall back to mock data**: Logged-in users see real backend data or error/retry state. Mock data only allowed in explicit, clearly labeled Demo mode.
3. **Backward compatibility**: All existing endpoints, response fields, and pages preserved.
4. **Testing**: `pytest` for backend, `npm run build` for frontend. All tests must pass before finishing each prompt.
5. **Documentation**: Keep README (§7 accuracy table, §8 real-vs-mock table) and DEPLOYMENT.md updated.
6. **No git push**: Leave changes uncommitted for user review.
