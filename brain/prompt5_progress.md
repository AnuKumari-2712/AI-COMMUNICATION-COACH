# Prompt 5: Voice Transcript Fix (Whisper + ffmpeg + Google Web Speech Fallback)

## Overview
Implemented speech recognition pipeline featuring:
1. **16kHz Mono WAV Normalization**:
   - `audio_utils.convert_to_wav_16k(input_path)` automatically verifies sample rate and channel format.
   - Detects `ffmpeg` via `shutil.which("ffmpeg")` for decoding compressed audio formats (`.webm`, `.ogg`, `.mp4`).
   - Uses Python stdlib `wave` + `audioop` for WAV resampling/downmixing without external dependencies.
   - If ffmpeg is absent on non-WAV inputs, raises `AudioConversionError` with clear installation guidance rather than crashing.
2. **Faster-Whisper Integration** (`backend/app/speech/whisper_stt.py`):
   - Configurable model size via `WHISPER_MODEL` (default: `"base"`).
   - Flag `ENABLE_WHISPER` (default: `"true"`).
   - CPU int8 quantization for lightweight fast inference.
   - Word-level timestamps (`word_timestamps=True`).
   - Initial filler prompt passed to avoid erasing natural conversational hesitations: `"Umm, uh, like, you know, so, basically, actually, I mean"`.
3. **STT Fallback Chain** (`backend/app/speech/stt.py`):
   - Chain order: **Whisper** → **Google Web Speech** → **Failure**.
   - Transparent response tagging: `transcript_engine: "whisper" | "google" | "browser" | "failed"`.
   - **Never returns canned mock transcripts for real user recordings**. On recognition failure, explicitly informs the user: `"(Could not understand the audio, please try again)"`.
4. **Frontend UI Updates**:
   - `src/components/shared/VoiceAnalysisResults.tsx` renders STT engine badges (`Faster-Whisper AI`, `Google Web Speech`, `Browser Speech API`, `Recognition Failed`).
   - Honest user guidance when recognition fails.

---

## Tests & Verification
- **Targeted Unit Tests**:
  - `backend/tests/test_prompt5_whisper_stt.py`: **9 passed** (16k WAV passthrough, stereo resampling, ffmpeg absence error, whisper config and mock model transcription with filler prompt, whisper-to-google fallback, complete failure handling, backward-compatible `transcribe_wav`).
  - `backend/tests/test_client_transcript.py`: **5 passed**.
- **Backend Full Suite**:
  - `pytest tests/ -q`: **341 passed**, 0 failed.
- **Frontend Build**:
  - `npm run build`: **Exit code 0** (clean compilation, 0 TypeScript errors).
