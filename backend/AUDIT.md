# Analysis/Scoring Accuracy Audit

This document tracks, module by module, which metrics in this project are genuinely measured, which are estimated with a documented method, and which were previously fake/hardcoded and have been fixed. Each module lists: current metric, current implementation, accuracy problem found, required change, files touched, and the test plan used to verify the fix.

Rule for every module in this file: **no score may be presented as more certain than the method that produced it.**

---

## Module 1 — Grammar Accuracy Engine — ✅ DONE

**Current metric (before):** `grammar_score` (0-100).

**Implementation found:** `backend/app/nlp/grammar_rules.py` — 7 regex patterns + spaCy tense-mixing check. Scoring formula blended a punctuation-count-based "sentence count" with an undocumented penalty multiplier.

**Accuracy problems found:**
1. Spelling ("alot") and style ("gonna"/"kinda") issues were folded into the same `corrections` list that fed `grammar_score` — a spelling mistake could lower your *grammar* score.
2. No confidence/uncertainty distinction — the tense-mixing heuristic (which can false-positive on correct reported speech) was reported with the same certainty as an exact regex match.
3. "Sentence count" was a character tally (`.`/`!`/`?` count), not real sentence splitting.
4. No formula transparency in the API response.

**Fix implemented:**
- Every detected issue now carries `category: "grammar" | "spelling" | "style"` and `confidence: "high" | "medium"`.
- Only `category == "grammar"` contributes to `grammar_score`.
- `confidence == "medium"` issues (currently only `tense_consistency`) count at half weight.
- Real sentence splitting via spaCy `doc.sents`, falling back to punctuation-boundary regex only if spaCy is unavailable.
- Documented, reproducible formula: `score = 100 - (weighted_error_count / sentence_count) * 50`, clamped to [0, 100]. Returned verbatim in the API response as `grammar_score_formula`.
- Each correction now includes the full sentence it was found in (`sentence` field), not just the matched fragment.
- Empty/whitespace-only input returns `grammar_sufficient_data: false` and `score: 0.0` instead of silently scoring "100 — perfect grammar" for no input.

**Files changed:**
- `backend/app/nlp/grammar_rules.py` (rewritten)
- `backend/app/schemas/assessment.py` (`GrammarCorrection` gains `category`/`confidence`/`sentence`; `TextAnalysisResponse` gains `grammar_issue_count`, `spelling_issue_count`, `style_issue_count`, `grammar_score_formula`, `grammar_sufficient_data`)
- `backend/app/services/assessment_service.py` (maps the new fields through)
- `backend/tests/test_grammar_rules.py` (new — 17 tests)

**Known, honest, NOT fixed in this module** (documented, not hidden): coverage is still only 7 error patterns. This module makes the *existing* checks trustworthy (correctly categorized, confidence-labeled, transparent formula) — it does not add broad grammar-error detection, which would require a much heavier dependency (see README §13).

**Verification — run this yourself:**
```bash
cd backend
venv\Scripts\activate
pip install -r requirements-dev.txt
pytest tests/test_grammar_rules.py -v
```

**Actual output obtained (2026-09-21):**
```
17 passed, 1 warning in 3.35s
```

**Live API proof** (not just unit tests — the real endpoint, real spaCy model loaded):
```bash
curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{
  "student_id": "demo-student", "question": "Tell me about yourself",
  "answer": "I dont have no experience but I am gonna work alot hard. Neither of the teams were ready."
}'
```
Result: `grammar_issue_count: 1` (only the subject-verb-agreement error), `spelling_issue_count: 1` ("alot", did not affect grammar_score), `style_issue_count: 1` ("gonna", did not affect grammar_score), `grammar_score: 75.0` — matching the formula exactly for 1 weighted grammar error across 2 detected sentences: `100 - (1.0/2)*50 = 75.0`.

---

## Module 2 — Vocabulary Accuracy Engine — ✅ DONE

**Current metric (before):** `vocabulary_score` (0-100), from raw type-token ratio (TTR = unique words / total content words).

**Accuracy problem found:** Raw TTR is length-biased. A 5-word answer with zero repeated words scores a perfect TTR of 1.0 just as easily as a genuinely rich answer — the metric can't tell "diverse" from "too short to have had a chance to repeat anything." It was presented with the same confidence regardless of sample size.

**Fix implemented:**
- Diversity measure switched to Herdan's C (`log(unique)/log(total)`), a standard corpus-linguistics measure that decays more realistically as text lengthens (raw TTR is still reported alongside it for reference, not hidden).
- New `sufficient_data` flag: below 15 content words, the score is still computed (callers always get a number) but flagged as a low-confidence estimate rather than a reliable measurement — directly fixes "don't give a vocabulary score just because the answer happens to be short and repeat-free."
- Documented, reproducible formula returned in `vocabulary_score_formula`.
- Empty input → `score: 0.0`, `sufficient_data: false`, not a default-high score.

**Files changed:**
- `backend/app/nlp/text_analysis.py` (`vocabulary_analysis` rewritten)
- `backend/app/schemas/assessment.py` (`TextAnalysisResponse` gains `lexical_diversity`, `content_word_count`, `vocabulary_score_formula`, `vocabulary_sufficient_data`)
- `backend/app/services/assessment_service.py` (maps the new fields through)
- `backend/tests/test_vocabulary_analysis.py` (new — 11 tests)

**Known, honest, NOT fixed in this module:** Herdan's C still maxes out at 1.0 for any text with zero repeats, regardless of length (mathematically unavoidable — `log(n)/log(n) = 1` for any n). This is exactly why `sufficient_data` exists as an independent signal rather than trying to make one number do both jobs — see `test_herdan_c_is_more_length_stable_than_raw_ttr`, which proves this limitation directly instead of hiding it.

**Verification — run this yourself:**
```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

**Actual output obtained (2026-09-21):**
```
28 passed, 1 warning in 9.94s
```

**Live API proof:**
```bash
# Short answer:
curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{"student_id":"demo-student","question":"Tell me about yourself","answer":"I build cool software fast."}'
# → vocabulary_score: 89.7, lexical_diversity: 1.0, content_word_count: 4, vocabulary_sufficient_data: FALSE

# Long, diverse answer:
curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{"student_id":"demo-student","question":"Tell me about yourself","answer":"I have worked on several innovative projects throughout my academic career, including a healthcare scheduling platform, a machine learning pipeline for fraud detection, and a mobile application supporting local community volunteering."}'
# → vocabulary_score: 100.0, lexical_diversity: 1.0, content_word_count: 22, vocabulary_sufficient_data: TRUE
```
Both hit maximum raw diversity (neither repeats a word), but only the long answer is presented with confidence — proving the fix does what it claims, not just in unit tests but against the live running server.

---

## Module 3 — Filler Word False-Positive Reduction — ✅ DONE

**Current metric (before):** `filler_word_count`, from a fixed word list matched anywhere in the transcript, including "actually", "basically", "you know", "like", "kind of"/"sort of".

**Accuracy problem found:** Real, demonstrable false positives — "Do **you know** the deadline?" and "I **like** pizza" both counted as filler usage, even though neither is hesitation.

**Fix implemented — three-tier detection:**
1. **Unambiguous** (um, uh, hmm, erm): counted anywhere, high confidence — these have no other real use in English.
2. **Clause-boundary fillers** (actually, basically, you know, i mean): only counted when they form a whole clause on their own or sit at a clause's start/end (the classic discourse-marker position) — not when embedded mid-clause as part of a genuine question or statement.
3. **"like"**: uses spaCy's POS tag on the word itself — verb usage ("I like pizza", "my friends like it") and simile usage ("like a filter") are excluded; only genuine filler "like" is counted. **A real bug was found and fixed during testing**: spaCy's small model mis-tags "like" as a preposition after certain noun subjects ("my friends like it" → ADP, not VERB) — a documented model limitation, not a logic bug. Added a targeted correction: "like" immediately followed by a bare object pronoun (it/him/her/them/this/that) is treated as verb usage regardless of the raw POS tag, since a genuine simile essentially never continues that way.
4. **"kind of"/"sort of"**: POS-tags the following word — precedes a noun ("this kind of problem") = genuine usage, excluded; precedes an adjective ("kind of hard") = filler, counted.

Every excluded near-match is returned in `excluded_examples` (human-readable) so the false-positive-reduction claim is falsifiable, not just asserted.

**Files changed:**
- `backend/app/speech/speech_metrics.py` (`detect_filler_words` rewritten with clause-boundary/POS-aware sub-detectors; `SpeechMetrics` gains `high_confidence_filler_count`, `ambiguous_filler_count`, `excluded_examples`)
- `backend/tests/test_filler_detection.py` (new — 14 tests)

**Bug found and fixed mid-module** (documented, not hidden): the first implementation used a fixed pronoun list (I/you/we/they/he/she/it) to detect "like" verb usage, which missed "my friends like it" (noun subject). `test_like_as_verb_is_not_a_filler` caught this immediately — replaced with spaCy POS tagging plus the pronoun-object correction described above.

**Verification — run this yourself:**
```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

**Actual output obtained (2026-09-21):**
```
42 passed, 2 warnings in 2.11s
```

**Live proof, through the real integration path the API uses** (not a standalone regex demo):
```bash
python -c "
from app.speech.speech_metrics import compute_speech_metrics
m = compute_speech_metrics('Do you know the deadline? Um, actually, I think, uh, this is kind of hard, you know.', duration_seconds=20.0)
print(m.filler_word_count, m.high_confidence_filler_count, m.ambiguous_filler_count, m.excluded_examples)
"
```
Result: `filler_word_count=5, high_confidence=2 (um, uh), ambiguous=3 (actually, kind of, you know), excluded=['"you know" in "Do you know the deadline" (mid-clause, not a discourse marker position)']` — the exact false positive named in the audit is now correctly excluded, while every genuine filler in the same sentence is still caught.

---

## Module 4 — Fluency/Pace Transparency — ✅ DONE

**Current metrics (before):** `fluency_score`, `words_per_minute`/`pace_score` (voice assessment), and the interview session's `total_minutes`.

**Accuracy problems found — three separate fabricated-duration/hardcoded-fluency instances:**
1. `run_initial_assessment()` (onboarding, text-only, no real recording) fed a hardcoded `duration_seconds=45.0` into `compute_speech_metrics()`, producing a fake WPM/pace number for a student's very first learner profile — before any audio had ever been recorded.
2. `interview_service.answer_question()` used a flat hardcoded `fluency_score = 90.0` (text mode) or `70.0` (voice mode with no duration) — a constant unrelated to anything in the actual answer — and re-implemented filler detection with a cruder presence-check that bypassed Module 3's false-positive fix entirely.
3. `compute_speech_metrics()` silently clamped any `duration_seconds <= 0` up to `1.0`, which would make a WPM number look like it came from real audio timing even when the input duration was invalid (e.g. a client bug sending 0).
4. No field anywhere distinguished a WPM/pace/pause number that came from real WAV pause analysis versus a transcript-based estimate — every number was presented with equal, unearned confidence.

**Fix implemented:**
- `InvalidDurationError` (real exception, not a silent clamp) raised by `compute_speech_metrics()` for `duration_seconds <= 0`; the `/assessment/voice` route validates this explicitly and returns 422 before doing any processing.
- `SpeechMetrics` gains `word_count`, `duration_seconds`, `reference_range_wpm` ("130-160"), and `pace_source: "measured" | "estimated"` — `"measured"` only when real WAV pause analysis (`analyze_wav_pauses`) was available, `"estimated"` for the transcript-based pause approximation.
- Extracted `text_flow_consistency(text)` as a standalone, real (if indirect) text-based fluency signal — sentence-length variance, usable with zero audio/duration data at all.
- `run_initial_assessment()`: removed the fabricated `45.0` duration entirely. Fluency now comes from `text_flow_consistency()`; `speaking_pace` starts at an explicit, documented neutral baseline (`55.0`, matching `create_profile()`'s own default) instead of a number derived from fake timing — to be replaced by real voice-practice data on the first actual recording.
- `interview_service.answer_question()`: when `mode == "voice"` and a real positive `duration_seconds` is present, fluency comes from `compute_speech_metrics()` (`pace_consistency`) and filler count from the same detector as Module 3 (dropping the separate cruder re-implementation). Otherwise, both fall back to `text_flow_consistency()` / `detect_filler_words()`. A new `fluency_source: "speech_measured" | "text_estimated"` field on `InterviewAnswerResponse` makes this distinction visible to the caller, not just internal.
- The `session["answers"]` history entry's `duration_seconds` (used only for practice-time bookkeeping — `submit_session()`'s `total_minutes`, never for scoring) keeps an explicit `90.0`-second estimate for typed/unmeasured answers, now clearly commented as time-tracking only, never fed into any "measured" score.

**Files changed:**
- `backend/app/speech/speech_metrics.py` (`InvalidDurationError`, new `SpeechMetrics` fields, extracted `text_flow_consistency`, real validation instead of clamping)
- `backend/app/schemas/assessment.py` (`VoiceAnalysisResponse` gains `word_count`, `reference_range_wpm`, `pace_source`)
- `backend/app/services/assessment_service.py` (`analyze_voice_upload` maps the new fields through; `run_initial_assessment` fabricated-duration fix)
- `backend/app/api/routes/assessment.py` (422 validation for non-positive `duration_seconds` on `/assessment/voice`)
- `backend/app/services/interview_service.py` (`answer_question` fluency/filler rewrite, `fluency_source` computation, bookkeeping-duration comment)
- `backend/app/schemas/interview.py` (`InterviewAnswerResponse` gains `fluency_source`)
- `backend/tests/test_speech_metrics.py` (new — 12 tests)

**Known, honest, NOT fixed in this module:** `pace_source="estimated"` still assumes "one pause per sentence boundary, ~0.6s each" — a documented approximation, not a measurement, used only when real WAV pause analysis isn't available (e.g. non-WAV upload). `submit_session()`'s `total_minutes` still blends real voice-recording durations with the fixed 90s bookkeeping estimate for typed answers in the same sum — acceptable for session-length tracking (not presented as a "measured speaking pace"), but not a fully "real" duration total either; a future module could report these as two separate figures if that distinction becomes important to a caller.

**Verification — run this yourself:**
```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

**Actual output obtained (2026-09-21):**
```
54 passed, 2 warnings in 1.97s
```

**Live API proof, through the real interview session flow:**
```bash
BASE=http://127.0.0.1:8000/api/v1
curl -X POST $BASE/interview/start -H "Content-Type: application/json" -d '{"student_id":"demo-student","category_id":"behavioral","job_role":null,"resume_text":null}'
# then, text mode (no duration_seconds):
curl -X POST $BASE/interview/answer -H "Content-Type: application/json" -d '{"session_id":"<id>","question_id":"<qid>","answer_text":"...","mode":"text","duration_seconds":null}'
# → fluency_source: "text_estimated"

# voice mode with a real duration:
curl -X POST $BASE/interview/answer -H "Content-Type: application/json" -d '{"session_id":"<id>","question_id":"<qid2>","answer_text":"...","mode":"voice","duration_seconds":30}'
# → fluency_source: "speech_measured"
```
Confirmed against a live running server (port 8123, separate from the dev server): the first call returned `"fluency_source":"text_estimated"`, the second returned `"fluency_source":"speech_measured"` — the caller can now tell the difference between a real speech-timing-derived fluency number and a text-only proxy, which was impossible before this module (both were silently blended into one unlabeled `fluency_score`). `/interview/submit` on the resulting session returned a normal, non-fabricated result with no NaN/impossible values.

---

## Module 5 — Pronunciation Honesty — ✅ DONE

**Current metric (before):** `pronunciation_score` (voice assessment) and `pronunciation` (interview result), both presented as plain numeric scores with no indication of method or reliability.

**Accuracy problem found (flagged "VERY IMPORTANT" in the original audit):** No audio phoneme-analysis model exists anywhere in this project. Two call sites nonetheless produced confident-looking pronunciation numbers:
1. `assessment_service.analyze_voice_upload()` computed a heuristic from STT-recognition-success + average word length — a real, if weak, transcript-based signal, but returned as an unlabeled `pronunciation_score` indistinguishable from a genuine measurement.
2. `interview_service.submit_session()` used a flat hardcoded `78.0` for every single interview, with zero signal from the actual answers at all — exactly the "score from the LLM's imagination" the audit explicitly warns against.

**Fix implemented:**
- New `speech_metrics.pronunciation_proxy(average_word_length, stt_used)` — a single, shared, documented heuristic (STT-success + word-length proxy, scores clamped to [20, 96]) used by both call sites instead of two separate implementations (one heuristic, one fabricated constant).
- Always returns `reliable: False` — there is no code path where this project can claim a reliable pronunciation measurement, so the flag is not conditional on anything; it's a structural admission, not a computed one.
- Returns an explicit `method` string spelling out exactly what was and wasn't measured, and `signals_used` naming which weak signals contributed.
- `VoiceAnalysisResponse` gains `pronunciation_reliable` and `pronunciation_method`; `InterviewResultResponse` gains the same two fields.
- The interview's flat `78.0` is replaced with the same proxy computed from the actual joined answer transcripts' average word length (`stt_used=False`, since interview answers are text/pre-transcribed, not raw audio this service processes) — a real, if still weak, signal grounded in what the candidate actually said, not an arbitrary constant.

**Files changed:**
- `backend/app/speech/speech_metrics.py` (new `pronunciation_proxy` function)
- `backend/app/schemas/assessment.py` (`VoiceAnalysisResponse` gains `pronunciation_reliable`, `pronunciation_method`)
- `backend/app/schemas/interview.py` (`InterviewResultResponse` gains the same two fields)
- `backend/app/services/assessment_service.py` (`analyze_voice_upload` uses the shared proxy instead of its own inline heuristic)
- `backend/app/services/interview_service.py` (`submit_session` replaces the hardcoded `78.0` with the proxy computed from real answers)
- `backend/tests/test_pronunciation_proxy.py` (new — 10 tests)

**Known, honest, NOT fixed in this module:** the proxy is still just a text-based heuristic — it cannot and does not detect actual mispronunciation, accent, or articulation issues. This is the whole point of the module: rather than pretending otherwise, every caller now receives `reliable=False` and the exact method used, so nothing downstream can present this number as a real pronunciation assessment. `learner_profile`'s internal `SkillScores.pronunciation` (used for adaptive weakness detection, e.g. `create_profile()`'s neutral `55`/`75` baselines) is a separate, pre-existing internal representation shared uniformly across all 8 skill scores in the personalization loop — out of scope for this module, which targets the two response-level surfaces a user/caller directly sees.

**Verification — run this yourself:**
```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

**Actual output obtained (2026-09-21):**
```
64 passed, 2 warnings in 31.96s
```

**Live API proof, through the real interview submit flow:**
```bash
BASE=http://127.0.0.1:8124/api/v1
# start session, answer one question, then:
curl -X POST $BASE/interview/submit -H "Content-Type: application/json" -d '{"session_id":"<id>"}'
```
Result: `"pronunciation":73.8,"pronunciation_reliable":false,"pronunciation_method":"Estimated only from transcript characteristics ... this is NOT a phoneme-level audio pronunciation analysis ... Always reported as reliable=False."` — confirmed against a live running server (port 8124, separate from the dev server) that the fabricated `78.0` constant is gone and every response now honestly labels this number as unreliable.

---

## Module 6 — Answer Structure Honesty (`or True` bug) — ✅ DONE

**Current metric (before):** `structure_score` and its `introduction` component, from `text_analysis.structure_analysis()`, used directly by Text Practice and (via `structure_analyzer.evaluate_structure`) by non-behavioral interview answers.

**Accuracy problem found (a real, working bug, exactly as flagged in the original audit):**
```python
intro_present = bool(sentences) and (_has_any(_STRUCTURE_KEYWORDS["introduction"]) or True)
```
The `or True` makes `intro_present` always true for any non-empty answer, regardless of whether the opening sentence establishes anything at all. A one-word answer ("Yes.") scored the same 100.0 on "introduction" as an answer that opened with genuine framing — the component measured nothing.

**Fix implemented:**
- Replaced the hardcoded `or True` with `_looks_like_substantive_opening(sentence)`: a real, checkable signal — the first sentence must have at least 6 words and not start with a throwaway filler/acknowledgment ("yes", "um", "okay", "sure", etc.) — in addition to the existing literal-keyword check ("my name is", "let me begin", ...).
- This is deliberately not as strict as requiring a literal stock phrase (most real interview answers never say "let me begin") but is a genuine measurement rather than a pass-through: a trivial one-word or filler-opening answer no longer gets full introduction credit just because *some* text exists.
- Confirmed `evaluate_star_format()` (behavioral, Situation/Task/Action/Result) and `structure_analysis()` (non-behavioral/technical, introduction/main_point/supporting_explanation/example/conclusion) are genuinely separate evaluations already wired correctly in `interview_service.answer_question()`'s `is_behavioral` branch — the audit's "don't force STAR on every question type" requirement was already satisfied by the existing branch, and is now covered by a regression test rather than just asserted.

**Files changed:**
- `backend/app/nlp/text_analysis.py` (`structure_analysis` — real `_looks_like_substantive_opening` check replaces `or True`)
- `backend/tests/test_structure_analysis.py` (new — 9 tests)

**Known, honest, NOT fixed in this module:** `_looks_like_substantive_opening` is still a shallow heuristic (word count + non-filler first word), not true discourse-structure understanding — a 6-word non-filler sentence that's actually off-topic rambling would still pass. This replaces "always true" with "a real, if imperfect, signal," which is the honest floor achievable without a much heavier NLU model (see README §13 on scope). `example_present` and `conclusion_present` were checked and are genuine keyword/position checks already (no `or True` there) — left unchanged.

**Verification — run this yourself:**
```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

**Actual output obtained (2026-09-22):**
```
73 passed, 2 warnings in 8.37s
```

**Live API proof:**
```bash
curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{"student_id":"demo-student","question":"Tell me about a challenge you faced","answer":"Yes."}'
# → structure_score: 32.0 (introduction NOT credited — under the old `or True` bug this would have been 100 on introduction alone)

curl -X POST http://localhost:8000/api/v1/assessment/text -H "Content-Type: application/json" -d '{"student_id":"demo-student","question":"Tell me about a challenge you faced","answer":"I recently led a major project redesigning our checkout experience for mobile users. For example, we cut load time by half. As a result, conversions improved."}'
# → structure_score: 100.0
```
Confirmed against a live running server (port 8125, separate from the dev server): the exact bug named in the audit (a one-word answer getting full introduction credit) is fixed, while a genuinely well-structured answer still scores at the top.

---

## Modules 7-12 — Not yet started

See the module plan and per-module findings in the audit delivered in-conversation (answer relevance, technical correctness, interview follow-ups, scoring transparency, data validation, ground-truth benchmark). Each will get its own entry here, in this same format, as it's implemented — one module at a time, tests run and shown before moving to the next.
