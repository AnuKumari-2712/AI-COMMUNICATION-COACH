"""
Real, stdlib-only audio analysis for WAV/PCM input.

Browsers record via MediaRecorder as webm/opus, which needs ffmpeg to decode
— a dependency we deliberately don't require for this project. When the
uploaded file IS a readable WAV (e.g. recorded client-side as WAV, or
converted upstream), this module computes real silence/pause segments from
RMS energy using only Python's standard library (`wave` + `audioop`). When
it isn't parseable as WAV, callers fall back to a transcript-based pause
estimate — see `speech_metrics.py` — and that fallback is always reported
to the client as such.
"""
import audioop
import contextlib
import wave
from dataclasses import dataclass


@dataclass
class PauseAnalysis:
    pause_count: int
    average_pause_seconds: float
    voiced_seconds: float
    total_seconds: float


def analyze_wav_pauses(file_path: str, silence_threshold: int = 500, window_ms: int = 200) -> PauseAnalysis | None:
    """Returns None if the file cannot be read as WAV/PCM (e.g. it's webm/opus)."""
    try:
        with contextlib.closing(wave.open(file_path, "rb")) as wav_file:
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            frame_rate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            raw_audio = wav_file.readframes(n_frames)
    except (wave.Error, EOFError, OSError):
        return None

    if not raw_audio or frame_rate == 0:
        return None

    if n_channels > 1:
        raw_audio = audioop.tomono(raw_audio, sample_width, 0.5, 0.5)

    window_size = max(1, int(frame_rate * (window_ms / 1000.0))) * sample_width
    total_seconds = n_frames / float(frame_rate)

    pause_count = 0
    voiced_windows = 0
    total_windows = 0
    in_silence = False

    for i in range(0, len(raw_audio) - window_size, window_size):
        chunk = raw_audio[i : i + window_size]
        rms = audioop.rms(chunk, sample_width)
        total_windows += 1
        if rms < silence_threshold:
            if not in_silence:
                pause_count += 1
                in_silence = True
        else:
            in_silence = False
            voiced_windows += 1

    voiced_seconds = (voiced_windows / total_windows * total_seconds) if total_windows else 0.0
    silent_windows = max(0, total_windows - voiced_windows)
    average_pause_seconds = (silent_windows / max(pause_count, 1)) * (window_ms / 1000.0)

    return PauseAnalysis(
        pause_count=pause_count,
        average_pause_seconds=round(average_pause_seconds, 2),
        voiced_seconds=round(voiced_seconds, 2),
        total_seconds=round(total_seconds, 2),
    )
