# Prompt 4: Multi-Engine Grammar Checker (Claude, T5 Hook, Rules)

## Overview
Replaced single rule-based grammar system with a multi-engine fallback architecture configurable via `GRAMMAR_ENGINE_ORDER` (default: `"claude,t5,rules"`). Added sentence-by-sentence breakdown, engine identification badges, and copy buttons on the frontend.

---

## 1. Backend Implementation

### `backend/app/nlp/llm_grammar.py`
- **`check_grammar_claude(text)`**:
  - Uses Anthropic Claude (`claude-3-5-sonnet-20241022` or `ANTHROPIC_MODEL`).
  - Sets `extra_body={"temperature": 0}` with strict JSON schema instructions.
  - Strips markdown code blocks (` ```json ` / ` ``` `) safely.
  - Recomputes `total_mistakes` in Python by summing mistake objects across sentences to guarantee mathematical honesty.
  - Tags output with `grammar_engine: "claude"`.
- **`check_grammar_t5(text)`**:
  - Plugs into Prompt 8 fine-tuned local T5 pipeline (`backend/models/gec-t5/`).
  - Gracefully raises if model is not yet loaded, allowing the fallback chain to proceed.
- **`check_grammar_rules(text)`**:
  - Rule-based analysis using `grammar_rules.analyze(text)`.
  - Tags output with `grammar_engine: "rules"`.
- **`check_grammar(text)`**:
  - Main fallback dispatcher. Parses `GRAMMAR_ENGINE_ORDER` (e.g., `"claude,t5,rules"`).
  - Logs active engine attempts and warnings on fallbacks.
  - Returns `grammar_engine` tag (`"claude" | "t5" | "rules"`).

### `backend/app/nlp/grammar_rules.py`
- Enhanced pattern coverage:
  - `_DOUBLE_NEGATIVE` (expanded to catch `dont have no`, `cannot find no`).
  - `_WORK_ALOT_HARD` ("work very hard" vs "work alot hard").
  - `_sentences` splitting refined to honor punctuation boundaries without mid-clause breaking.

### `backend/app/schemas/assessment.py`
- Added `grammar_engine: Literal["claude", "t5", "rules"] = "rules"` to `TextAnalysisResponse`.

### `backend/app/services/assessment_service.py`
- `analyze_text()` updated to invoke `llm_grammar.check_grammar(answer)`.
- Replaced arbitrary hardcoded scoring with dynamic mistake-rate formula:
  $$\text{mistakes\_per\_sentence} = \frac{\text{total\_mistakes}}{\max(\text{sentence\_count}, 1)}$$
  $$\text{grammar\_score} = \max(0.0, \min(100.0, 100.0 - (\text{mistakes\_per\_sentence} \times 25.0)))$$

---

## 2. Frontend Implementation

### `src/services/practiceService.ts`
- Added `grammarEngine?: 'claude' | 't5' | 'rules'` to `TextAnalysisResult` and `BackendTextAnalysisResponse`.

### `src/pages/practice/TextPracticePage.tsx`
- **Engine Badge**:
  - `claude`: Purple badge with Sparkles icon ("Claude AI Engine").
  - `t5`: Emerald badge with Cpu icon ("T5 Local Model").
  - `rules`: Slate badge with CheckCircle icon ("Rule-Based Engine").
- **Sentence-by-Sentence Breakdown**:
  - Side-by-side view of Original vs Corrected per sentence.
  - Green tick with "Grammatically correct - great phrasing!" when a sentence has 0 mistakes.
  - Copy buttons at the top ("Copy Full Corrected") and per-sentence.

---

## 3. Test Coverage & Verification

- **Targeted Unit Tests**:
  - `backend/tests/test_prompt4_grammar_engine.py` (7 tests: fallback when no key, full detection of 6 mistakes with Claude mock, independent Python recomputation of mistake counts, engine priority ordering, T5 fallback, assessment service score computation, and API endpoint integration).
  - `backend/tests/test_llm_grammar.py` (7 tests for clean JSON, mock client, and service degradation).
- **Backend Full Suite**:
  - `pytest tests/ -q`: **332 passed**, 0 failed.
- **Frontend Build**:
  - `npm run build`: **Exit code 0** (clean build, 0 TypeScript errors).
