# Accuracy Report

Generated 2026-09-23 by `scripts/generate_accuracy_report.py`, run against the ground-truth benchmark in `tests/ground_truth_data.py` — the exact same functions the live API calls, not a separate reimplementation.

**This is not a claim of real-world accuracy at scale.** It is a small, manually-curated benchmark (28 examples across 5 metrics) proving the implementation does what its own documented rules say it does, on cases a human has checked by hand. See `AUDIT.md` for the full per-module accuracy problems found and fixed, and the honestly-documented limitations of each metric — this report never claims 100% accuracy beyond what is demonstrated below.

## Overall: 29/29 (100.0%) ground-truth examples matched

## Grammar — 8/8 (100.0%)

**Known limitations:** Only the 7 hand-coded rule patterns in grammar_rules.py are checked — see AUDIT.md Module 1 for coverage limits (e.g. 'dont' without an apostrophe is not matched by the double-negative rule).

| Method | Input | Expected | Actual | Match |
|---|---|---|---|---|
| grammar_rules.analyze() | 'She goes to school every day.' (correct present-tense agreement) | False | False | ✅ |
| grammar_rules.analyze() | 'The team finished the project on time.' (correct simple past) | False | False | ✅ |
| grammar_rules.analyze() | "I don't have no time today." (double negative) | True | True | ✅ |
| grammar_rules.analyze() | 'Neither of the teams were ready.' (subject-verb agreement (neither...was)) | True | True | ✅ |
| grammar_rules.analyze() | 'The team finally finished the the project on time.' (repeated word) | True | True | ✅ |
| grammar_rules.analyze() | 'Yesterday I go to the office and finished my report.' (tense mixing (medium confidence)) | True | True | ✅ |
| grammar_rules.analyze() | 'I practiced alot this week.' (spelling issue only ('alot') — must NOT count as a grammar issue) | False | False | ✅ |
| grammar_rules.analyze() | "I'm gonna finish it by Friday." (style/formality issue only ('gonna') — must NOT count as a grammar issue) | False | False | ✅ |

## Filler Words — 8/8 (100.0%)

**Known limitations:** Context-aware for 'like'/'kind of'/'you know'/'actually' (see AUDIT.md Module 3); relies on spaCy POS tagging, which has known small-model limitations documented there.

| Method | Input | Expected | Actual | Match |
|---|---|---|---|---|
| speech_metrics.detect_filler_words() | 'Um, I think we should proceed.' (unambiguous 'um') | 1 | 1 | ✅ |
| speech_metrics.detect_filler_words() | 'Do you know the deadline?' ('you know' mid-clause in a genuine question, not filler) | 0 | 0 | ✅ |
| speech_metrics.detect_filler_words() | 'I like pizza and my friends like it too.' ('like' used as the verb 'to like', not filler) | 0 | 0 | ✅ |
| speech_metrics.detect_filler_words() | 'It was, like, really hard, you know.' ('like' filler + clause-final 'you know') | 2 | 2 | ✅ |
| speech_metrics.detect_filler_words() | 'Actually, I think this is correct.' (clause-initial 'actually') | 1 | 1 | ✅ |
| speech_metrics.detect_filler_words() | 'This is kind of hard to explain.' ('kind of' before an adjective = filler) | 1 | 1 | ✅ |
| speech_metrics.detect_filler_words() | 'This kind of problem is common in distributed systems.' ('kind of' before a noun = genuine usage, not filler) | 0 | 0 | ✅ |
| speech_metrics.detect_filler_words() | 'Uh, basically, we finished the project on time.' ('uh' + clause-initial 'basically') | 2 | 2 | ✅ |

## Speaking Pace (WPM) — 5/5 (100.0%)

**Known limitations:** WPM is computed by exact definition (words / minutes) — this category is expected to match 100% by construction, not because pace prediction is 'solved'; see AUDIT.md Module 4 for pace_source measured-vs-estimated distinction.

| Method | Input | Expected | Actual | Match |
|---|---|---|---|---|
| speech_metrics.compute_speech_metrics() | 150 words / 60.0s | 150.0 | 150.0 | ✅ |
| speech_metrics.compute_speech_metrics() | 100 words / 60.0s | 100.0 | 100.0 | ✅ |
| speech_metrics.compute_speech_metrics() | 20 words / 10.0s | 120.0 | 120.0 | ✅ |
| speech_metrics.compute_speech_metrics() | 45 words / 30.0s | 90.0 | 90.0 | ✅ |
| speech_metrics.compute_speech_metrics() | 0 words / 10.0s | 0.0 | 0.0 | ✅ |

## Answer Relevance — 4/4 (100.0%)

**Known limitations:** Keyword/lemma overlap, not semantic understanding — an answer echoing the question's own words without answering it would still score well; see AUDIT.md Module 7.

| Method | Input | Expected | Actual | Match |
|---|---|---|---|---|
| relevance_analysis.analyze_relevance() | Q: Tell me about a time you led a team thro... / A: I led a five-person team through a diffi... | True | True (score=100.0) | ✅ |
| relevance_analysis.analyze_relevance() | Q: Tell me about a time you led a team thro... / A: My favorite programming language is Pyth... | False | False (score=0.0) | ✅ |
| relevance_analysis.analyze_relevance() | Q: What is your experience with Python and ... / A: I've used Python and machine learning fo... | True | True (score=100.0) | ✅ |
| relevance_analysis.analyze_relevance() | Q: Describe a time you resolved a conflict ... / A: I really enjoy working on interesting pr... | False | False (score=0.0) | ✅ |

## Technical Correctness — 4/4 (100.0%)

**Known limitations:** Only the 5 fixed technical-interview questions have a verified concept checklist; checks for keyword presence, not contextual correctness of usage; see AUDIT.md Module 8.

| Method | Input | Expected | Actual | Match |
|---|---|---|---|---|
| technical_knowledge.evaluate_technical_correctness() | Explain how a hash map works and its average time ... | correct | correct | ✅ |
| technical_knowledge.evaluate_technical_correctness() | Explain how a hash map works and its average time ... | incorrect | incorrect | ✅ |
| technical_knowledge.evaluate_technical_correctness() | Explain the difference between processes and threa... | correct | correct | ✅ |
| technical_knowledge.evaluate_technical_correctness() | What is the difference between SQL and NoSQL datab... | insufficient | insufficient | ✅ |

---

To reproduce: `cd backend && venv\Scripts\activate && python scripts/generate_accuracy_report.py` (regenerates this file) or `pytest tests/test_ground_truth_benchmark.py -v` (asserts every row above passes).