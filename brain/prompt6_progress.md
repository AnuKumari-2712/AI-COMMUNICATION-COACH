# Prompt 6: Real Voice Feedback (Pauses, Pace, Multi-Engine Grammar, Pronunciation)

## Overview
Replaced estimated/placeholder voice feedback with real metrics derived from audio and speech recognition signals:
1. **Pauses**:
   - `speech_metrics.compute_pauses_from_words`: Computes pause duration between consecutive Whisper word timestamps. Gaps $\ge 0.7s$ counted as pauses; gaps $\ge 1.5s$ counted as long pauses.
   - Falls back to audio RMS-energy pause analysis on WAV, or clearly labels fallback as "estimated".
2. **Pace**:
   - Real WPM calculated strictly from duration and recognized word count: $\text{WPM} = \frac{\text{word\_count} \times 60.0}{\text{duration\_seconds}}$.
   - Filler word count extracted from transcript.
3. **Multi-Engine Grammar on Voice Practice**:
   - Spoken transcript runs through the Prompt 4 multi-engine fallback chain (`llm_grammar.check_grammar`).
   - UI presents sentence-by-sentence original vs corrected cards with error badges and engine source (`Claude AI Engine`, `T5 Model`, `Rule Engine`).
4. **Pronunciation**:
   - Derived from Whisper per-word acoustic confidence probabilities (`speech_metrics.analyze_pronunciation_confidence`).
   - Words with confidence $< 60\%$ are flagged as "Possibly Unclear Pronunciation" with word timestamp and confidence percentage.
   - When per-word acoustic probabilities are unavailable, pronunciation is displayed as `N/A` with an explicit explanation rather than showing a fake placeholder number.

---

## Tests & Verification
- **Targeted Unit Tests**:
  - `backend/tests/test_prompt6_voice_metrics.py`: **4 passed** (exact pause mathematical calculations, unclear words detection $<60\%$, pronunciation unavailable handling, multi-engine grammar integration in `analyze_voice_upload`).
- **Backend Full Suite**:
  - `pytest tests/ -q`: **345 passed**, 0 failed.
- **Frontend Build**:
  - `npm run build`: **Exit code 0** (clean compilation, 0 errors).
