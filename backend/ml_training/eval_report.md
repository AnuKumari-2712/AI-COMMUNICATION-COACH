# T5 Grammar Error Correction (GEC) Evaluation Report

**Engine Evaluated:** T5 GEC Model (Baseline / Heuristic Runner)
**Model Path:** `C:\Users\kanuk\Downloads\AI-COMMUNICATION-COACH-main (1)\AI-COMMUNICATION-COACH-main\backend\ml_training\..\models\gec-t5`

## 1. Quantitative Benchmark Results

| Metric | Result | Benchmark Target | Status |
|---|---|---|---|
| **GLEU Score (JFLEG Test)** | **81.39** | >= 50.0 | PASS |
| **% Sentences Changed** | **100.0%** | 60% - 90% | BASELINE |
| **Test Samples Evaluated** | 10 sentences | >= 10 | PASS |

## 2. Sanity Sentences Benchmark (25+ Sentences)

| # | Original Sentence | Corrected Sentence | Changed? |
|---|---|---|:---:|
| 1 | `I dont have no experience but I am gonna work alot hard.` | `I don't have any experience but I am going to work very hard.` | Yes |
| 2 | `Neither of the teams were ready.` | `Neither of the teams was ready.` | Yes |
| 3 | `she go to school yesterday` | `She goes to school yesterday` | Yes |
| 4 | `i has a book and he have two pen` | `I have a book and he has two pen` | Yes |
| 5 | `He dont know nothing about this project.` | `He don't know nothing about this project.` | Yes |
| 6 | `We was happy to see them.` | `We were happy to see them.` | Yes |
| 7 | `Every students must submit their assignment.` | `Every students must submit their assignment.` | No |
| 8 | `They has been working since three hours.` | `They has been working since three hours.` | No |
| 9 | `She is more taller than her sister.` | `She is more taller than her sister.` | No |
| 10 | `I look forward to hear from you.` | `I look forward to hear from you.` | No |
| 11 | `The informations provided was incorrect.` | `The information provided was incorrect.` | Yes |
| 12 | `Why you did not come to the meeting?` | `Why you did not come to the meeting?` | No |
| 13 | `One of my friend is coming today.` | `One of my friends is coming today.` | Yes |
| 14 | `He told to me that he was tired.` | `He told to me that he was tired.` | No |
| 15 | `I prefer coffee than tea.` | `I prefer coffee than tea.` | No |
| 16 | `Although it was raining, but we went outside.` | `Although it was raining, but we went outside.` | No |
| 17 | `She explained me the problem.` | `She explained me the problem.` | No |
| 18 | `There is many reasons for this delay.` | `There are many reasons for this delay.` | Yes |
| 19 | `I am agree with your opinion.` | `I agree with your opinion.` | Yes |
| 20 | `He did a mistake during the presentation.` | `He did a mistake during the presentation.` | No |
| 21 | `Me and my colleague solved the bug.` | `Me and my colleague solved the bug.` | No |
| 22 | `Suppose if it rains, what will we do?` | `Suppose if it rains, what will we do?` | No |
| 23 | `I have seen him yesterday at the office.` | `I have seen him yesterday at the office.` | No |
| 24 | `She is married with an engineer.` | `She is married with an engineer.` | No |
| 25 | `We discussed about the project roadmap.` | `We discussed the project roadmap.` | Yes |
| 26 | `The price of these items are very high.` | `The price of these items are very high.` | No |
| 27 | `He said that he will come tomorrow.` | `He said that he will come tomorrow.` | No |
| 28 | `Neither John nor his friends was present.` | `Neither John nor his friends were present.` | Yes |

## 3. Findings & Model Integration

- The model is configured to load lazily via `GEC_MODEL_PATH` in `backend/app/nlp/gec_model.py`.
- If model weights are not found on the local filesystem, the backend gracefully falls back to the rules engine without crashing at startup.
- Mistake annotations (wrong, correct, type, explanation) are extracted deterministically using difflib sequence matching.
- When active, the model sets `grammar_engine: 't5'` and recomputes exact mistake counts in Python.
