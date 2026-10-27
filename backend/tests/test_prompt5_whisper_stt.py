"""
Tests for Prompt 5:
- 16kHz mono WAV conversion with ffmpeg detection and fallbacks.
- faster-whisper speech recognition with word timestamps and filler prompts.
- STT fallback chain: Whisper -> Google -> Failed.
- Transparent reporting without silent mock fallbacks.
"""
import os
import shutil
import struct
import tempfile
import wave
from unittest.mock import MagicMock, patch

import pytest
from app.schemas.common import AnalysisSource
from app.speech import audio_utils, stt, whisper_stt


def _create_wav(channels=1, rate=16000, duration_sec=1.0) -> str:
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    with wave.open(path, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        # Write small sine/silence tone
        samples = int(rate * duration_sec * channels)
        w.writeframes(struct.pack(f"<{samples}h", *[100 for _ in range(samples)]))
    return path


class TestPrompt5AudioConversion:
    def test_already_16k_mono_wav_returns_same_path(self):
        wav_path = _create_wav(channels=1, rate=16000)
        try:
            converted = audio_utils.convert_to_wav_16k(wav_path)
            assert converted == wav_path
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

    def test_stereo_or_non_16k_wav_is_converted(self):
        wav_path = _create_wav(channels=2, rate=44100)
        try:
            converted = audio_utils.convert_to_wav_16k(wav_path)
            assert os.path.exists(converted)
            with wave.open(converted, "rb") as w:
                assert w.getnchannels() == 1
                assert w.getframerate() == 16000
                assert w.getsampwidth() == 2
            if converted != wav_path:
                os.remove(converted)
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

    def test_non_wav_file_without_ffmpeg_raises_audio_conversion_error(self, tmp_path, monkeypatch):
        fake_webm = tmp_path / "recording.webm"
        fake_webm.write_bytes(b"WEBM_FAKE_DATA_HEADER")

        monkeypatch.setattr(shutil, "which", lambda cmd: None)

        with pytest.raises(audio_utils.AudioConversionError) as exc_info:
            audio_utils.convert_to_wav_16k(str(fake_webm))
        assert "Audio conversion requires ffmpeg" in str(exc_info.value)


class TestPrompt5WhisperSTT:
    def test_whisper_disabled_via_env(self, monkeypatch):
        monkeypatch.setenv("ENABLE_WHISPER", "false")
        assert whisper_stt.is_whisper_enabled() is False
        with pytest.raises(RuntimeError, match="disabled via ENABLE_WHISPER=false"):
            whisper_stt.transcribe_whisper("any_path.wav")

    def test_transcribe_whisper_with_mock_model(self, monkeypatch):
        monkeypatch.setenv("ENABLE_WHISPER", "true")

        # Mock segment and word structure
        mock_word1 = MagicMock(word="Hello", start=0.0, end=0.4, probability=0.98)
        mock_word2 = MagicMock(word="world", start=0.5, end=0.9, probability=0.95)
        mock_seg = MagicMock(text="Hello world", words=[mock_word1, mock_word2])
        mock_info = MagicMock(duration=1.2, language="en")

        mock_model = MagicMock()
        mock_model.transcribe.return_value = ([mock_seg], mock_info)

        monkeypatch.setattr(whisper_stt, "get_whisper_model", lambda: mock_model)

        res = whisper_stt.transcribe_whisper("dummy.wav")
        assert res["text"] == "Hello world"
        assert res["engine"] == "whisper"
        assert len(res["words"]) == 2
        assert res["words"][0]["word"] == "Hello"
        assert res["words"][1]["end"] == 0.9

        # Verify initial_prompt was passed
        args, kwargs = mock_model.transcribe.call_args
        assert "initial_prompt" in kwargs
        assert "Umm, uh, like" in kwargs["initial_prompt"]


class TestPrompt5STTFallbackChain:
    def test_fallback_whisper_first_choice(self, monkeypatch):
        monkeypatch.setattr(audio_utils, "convert_to_wav_16k", lambda path: path)

        mock_res = {
            "text": "This is transcribed by Whisper.",
            "words": [{"word": "This", "start": 0.0, "end": 0.2, "probability": 0.99}],
            "engine": "whisper",
        }
        monkeypatch.setattr(whisper_stt, "is_whisper_enabled", lambda: True)
        monkeypatch.setattr(whisper_stt, "transcribe_whisper", lambda path, **kwargs: mock_res)

        text, engine, words = stt.transcribe_audio("audio.wav")
        assert engine == "whisper"
        assert text == "This is transcribed by Whisper."
        assert len(words) == 1

    def test_fallback_to_google_when_whisper_fails(self, monkeypatch):
        monkeypatch.setattr(audio_utils, "convert_to_wav_16k", lambda path: path)

        # Whisper fails
        monkeypatch.setattr(whisper_stt, "is_whisper_enabled", lambda: True)
        def _failing_whisper(*args, **kwargs):
            raise RuntimeError("Model weight missing")
        monkeypatch.setattr(whisper_stt, "transcribe_whisper", _failing_whisper)

        # Google succeeds
        monkeypatch.setattr(stt, "_recognize_google_chunks", lambda path, language="en-IN": "Recognized by Google")

        text, engine, words = stt.transcribe_audio("audio.wav")
        assert engine == "google"
        assert text == "Recognized by Google"
        assert words == []

    def test_fallback_to_failed_when_both_fail(self, monkeypatch):
        monkeypatch.setattr(audio_utils, "convert_to_wav_16k", lambda path: path)

        # Whisper fails
        monkeypatch.setattr(whisper_stt, "is_whisper_enabled", lambda: True)
        monkeypatch.setattr(whisper_stt, "transcribe_whisper", MagicMock(side_effect=RuntimeError("Whisper err")))

        # Google fails
        monkeypatch.setattr(stt, "_recognize_google_chunks", MagicMock(side_effect=Exception("No internet")))

        text, engine, words = stt.transcribe_audio("audio.wav")
        assert engine == "failed"
        assert text == ""
        assert words == []

    def test_transcribe_wav_wrapper_backward_compatible(self, monkeypatch):
        monkeypatch.setattr(
            stt,
            "transcribe_audio",
            lambda path, **kwargs: ("Hello from audio", "whisper", []),
        )
        text, source = stt.transcribe_wav("test.wav")
        assert text == "Hello from audio"
        assert source == AnalysisSource.real
