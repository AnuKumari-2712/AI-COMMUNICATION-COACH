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

## Modules 4-12 — Not yet started

See the module plan and per-module findings in the audit delivered in-conversation (fluency, pace, pronunciation, confidence, answer relevance, answer structure, technical correctness, interview follow-ups, scoring transparency, data validation). Each will get its own entry here, in this same format, as it's implemented — one module at a time, tests run and shown before moving to the next.
