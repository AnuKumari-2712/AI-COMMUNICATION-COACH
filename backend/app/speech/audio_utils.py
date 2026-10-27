"""
Real, stdlib-only audio analysis for WAV/PCM input.

The frontend now converts the browser's webm/opus recording to 16 kHz mono WAV
before uploading (src/lib/audioToWav.ts), so this analyzer receives real WAV in
the normal flow — no ffmpeg needed on the server. When the file still isn't
parseable as WAV, callers fall back to a transcript-based pause estimate (see
`speech_metrics.py`), and that fallback is always reported to the client as
"estimated".

Pause definition (documented so the numbers can be verified by hand):
- The audio is cut into `window_ms` windows and each window's RMS energy is
  compared with a silence threshold.
- The threshold is ADAPTIVE by default: it is derived from this recording's own
  noise floor and speech level (capped at half the speech level so continuous
  speech is never misread as silence), because a fixed number marks a quiet-microphone
  recording as "all silence" and a noisy room as "no silence at all".
- A pause is a run of silent windows lasting at least `min_pause_ms` that sits
  BETWEEN speech. Silence before the first word and after the last word is not a
  pause in speech and is excluded.
- A "long pause" is one lasting at least `long_pause_ms` (hesitation-length).
"""
try:
    import audioop
except ImportError:
    audioop = None
import contextlib
import logging
import os
import shutil
import subprocess
import tempfile
import wave
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class AudioConversionError(RuntimeError):
    """Raised when audio conversion fails or required tools are missing."""
    pass


@dataclass
class PauseAnalysis:
    pause_count: int
    average_pause_seconds: float
    voiced_seconds: float
    total_seconds: float
    long_pause_count: int = 0
    silence_threshold_used: float = 0.0


def _percentile(sorted_values: list[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    idx = min(len(sorted_values) - 1, max(0, int(round((pct / 100.0) * (len(sorted_values) - 1)))))
    return sorted_values[idx]


def adaptive_silence_threshold(window_rms: list[float]) -> float:
    """max(2 x noise floor (10th pct), 15% of speech level (90th pct), 30),
    but never above 50% of the speech level.

    The cap matters for continuous speech with no pauses: there the 10th
    percentile IS speech, so 2 x noise floor would exceed the speech level and
    the whole recording would be misread as silence. If even the loud windows
    are below 30 the file is treated as silent (no cap).
    """
    ordered = sorted(window_rms)
    noise_floor = _percentile(ordered, 10)
    speech_level = _percentile(ordered, 90)
    threshold = max(noise_floor * 2.0, speech_level * 0.15, 30.0)
    if speech_level >= 30.0:
        threshold = min(threshold, speech_level * 0.5)
    return threshold


def analyze_wav_pauses(
    file_path: str,
    silence_threshold: float | None = None,
    window_ms: int = 100,
    min_pause_ms: int = 300,
    long_pause_ms: int = 700,
) -> PauseAnalysis | None:
    """Returns None if the file cannot be read as WAV/PCM."""
    try:
        with contextlib.closing(wave.open(file_path, "rb")) as wav_file:
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            frame_rate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            raw_audio = wav_file.readframes(n_frames)
    except (wave.Error, EOFError, OSError):
        return None

    if not raw_audio or frame_rate == 0 or audioop is None:
        return None

    if n_channels > 1:
        raw_audio = audioop.tomono(raw_audio, sample_width, 0.5, 0.5)

    window_frames = max(1, int(frame_rate * (window_ms / 1000.0)))
    window_bytes = window_frames * sample_width
    total_seconds = n_frames / float(frame_rate)

    window_rms: list[float] = []
    for i in range(0, len(raw_audio) - window_bytes + 1, window_bytes):
        window_rms.append(float(audioop.rms(raw_audio[i : i + window_bytes], sample_width)))
    if not window_rms:
        return None

    threshold = silence_threshold if silence_threshold is not None else adaptive_silence_threshold(window_rms)
    is_voiced = [rms >= threshold for rms in window_rms]
    voiced_windows = sum(is_voiced)

    # Only silence BETWEEN the first and last voiced window can be a pause.
    pause_runs: list[int] = []
    if voiced_windows:
        first = is_voiced.index(True)
        last = len(is_voiced) - 1 - is_voiced[::-1].index(True)
        run = 0
        for voiced in is_voiced[first : last + 1]:
            if voiced:
                if run:
                    pause_runs.append(run)
                run = 0
            else:
                run += 1

    window_s = window_ms / 1000.0
    min_windows = max(1, round(min_pause_ms / window_ms))
    long_windows = max(1, round(long_pause_ms / window_ms))
    pauses = [r for r in pause_runs if r >= min_windows]
    average_pause_seconds = (sum(pauses) / len(pauses) * window_s) if pauses else 0.0
    voiced_seconds = voiced_windows / len(window_rms) * total_seconds

    return PauseAnalysis(
        pause_count=len(pauses),
        average_pause_seconds=round(average_pause_seconds, 2),
        voiced_seconds=round(voiced_seconds, 2),
        total_seconds=round(total_seconds, 2),
        long_pause_count=sum(1 for r in pauses if r >= long_windows),
        silence_threshold_used=round(threshold, 1),
    )


def convert_to_wav_16k(input_path: str, output_path: str | None = None) -> str:
    """
    Ensures input audio file is in 16kHz mono 16-bit PCM WAV format.
    - Returns input_path if already 16kHz mono WAV.
    - If ffmpeg is in PATH, runs ffmpeg to convert webm/ogg/mp4/etc.
    - If ffmpeg is missing:
      - Uses stdlib wave/audioop for WAV files of different formats.
      - Uses PyAV (av) if installed for compressed containers.
      - Raises AudioConversionError with clear instructions to install ffmpeg.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Audio file does not exist: {input_path}")

    # Check if already 16kHz mono 16-bit WAV
    try:
        with contextlib.closing(wave.open(input_path, "rb")) as w:
            if w.getnchannels() == 1 and w.getframerate() == 16000 and w.getsampwidth() == 2:
                return input_path
    except (wave.Error, EOFError, OSError):
        pass

    target_path = output_path
    if not target_path:
        fd, target_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

    # 1. Try ffmpeg if available in PATH
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        try:
            cmd = [
                ffmpeg_bin,
                "-y",
                "-i", input_path,
                "-ar", "16000",
                "-ac", "1",
                "-c:a", "pcm_s16le",
                target_path,
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if os.path.exists(target_path) and os.path.getsize(target_path) > 44:
                return target_path
        except (subprocess.CalledProcessError, OSError) as e:
            logger.warning("ffmpeg conversion attempt failed: %s", e)

    # 2. Try stdlib wave/audioop if it's already a WAV of different sample rate or channels
    try:
        with contextlib.closing(wave.open(input_path, "rb")) as w:
            n_ch = w.getnchannels()
            s_width = w.getsampwidth()
            f_rate = w.getframerate()
            frames = w.readframes(w.getnframes())

        if audioop is not None and frames:
            if s_width != 2:
                frames = audioop.lin2lin(frames, s_width, 2)
                s_width = 2
            if n_ch > 1:
                frames = audioop.tomono(frames, s_width, 0.5, 0.5)
                n_ch = 1
            if f_rate != 16000:
                frames, _ = audioop.ratecv(frames, s_width, 1, f_rate, 16000, None)
                f_rate = 16000

            with contextlib.closing(wave.open(target_path, "wb")) as out_w:
                out_w.setnchannels(1)
                out_w.setsampwidth(2)
                out_w.setframerate(16000)
                out_w.writeframes(frames)
            return target_path
    except Exception:
        pass

    # 3. Try PyAV (av) if installed
    try:
        import av
        container = av.open(input_path)
        stream = next((s for s in container.streams if s.type == "audio"), None)
        if stream is not None:
            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            with contextlib.closing(wave.open(target_path, "wb")) as out_w:
                out_w.setnchannels(1)
                out_w.setsampwidth(2)
                out_w.setframerate(16000)
                for packet in container.demux(stream):
                    for frame in packet.decode():
                        resampled = resampler.resample(frame)
                        for r_frame in (resampled if isinstance(resampled, list) else [resampled]):
                            if r_frame is not None:
                                out_w.writeframes(r_frame.to_ndarray().tobytes())
            if os.path.exists(target_path) and os.path.getsize(target_path) > 44:
                return target_path
    except Exception as exc:
        logger.debug("PyAV audio decoding fallback failed: %s", exc)

    raise AudioConversionError(
        "Audio conversion requires ffmpeg (or av package). "
        "Please install ffmpeg on your server/system or upload audio in WAV format."
    )

