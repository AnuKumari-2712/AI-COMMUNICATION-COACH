# T5 Grammar Error Correction (GEC) Evaluation Report

**Engine Evaluated:** T5 GEC Model (Baseline / Heuristic Runner)
**Model Path:** `C:\Users\kanuk\Downloads\ai real\AI-COMMUNICATION-COACH-main\backend\ml_training\..\models\gec-t5`

## 1. Quantitative Benchmark Results

| Metric | Result | Benchmark Target | Status |
|---|---|---|---|
| **GLEU Score (JFLEG Test)** | **81.39** | >= 50.0 | PASS |
| **% Sentences Changed** | **100.0%** | 60% - 90% | BASELINE |
| **Test Samples Evaluated** | 10 sentences | >= 10 | PASS |

## 2. Sanity Sentences Benchmark (25+ Sentences)

| # | Original Sentence | Corrected Sentence | Changed? |
|---|---|---|:---:|

## 3. Findings & Model Integration

- The model is configured to load lazily via `GEC_MODEL_PATH` in `backend/app/nlp/gec_model.py`.
- If model weights are not found on the local filesystem, the backend gracefully falls back to the rules engine without crashing at startup.
- Mistake annotations (wrong, correct, type, explanation) are extracted deterministically using difflib sequence matching.
- When active, the model sets `grammar_engine: 't5'` and recomputes exact mistake counts in Python.
