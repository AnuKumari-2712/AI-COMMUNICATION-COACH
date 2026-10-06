/**
 * Browsers record with MediaRecorder as webm/opus (Chrome, Firefox) or mp4/aac
 * (Safari). The backend's speech-to-text and pause analysis read WAV only, and
 * deliberately doesn't depend on ffmpeg. Before this converter existed every
 * browser upload failed to parse on the server, which silently swapped in a
 * canned mock transcript — so audio feedback described words the user never said.
 *
 * This decodes the recording with the Web Audio API and re-encodes it as
 * 16 kHz, mono, 16-bit PCM WAV (the format speech recognition works best with,
 * and ~1.9 MB per minute).
 */
const TARGET_SAMPLE_RATE = 16000;

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Decodes any browser-recorded audio blob and returns a 16 kHz mono WAV blob. Throws if the browser can't decode it. */
export async function blobToWav(blob: Blob, targetSampleRate = TARGET_SAMPLE_RATE): Promise<Blob> {
  const AudioContextCtor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor || typeof OfflineAudioContext === 'undefined') {
    throw new Error('Web Audio API is not available in this browser.');
  }

  const context = new AudioContextCtor();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    // Rendering through an OfflineAudioContext with 1 channel resamples to the
    // target rate and downmixes stereo to mono in one step.
    const frameCount = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
    const offline = new OfflineAudioContext(1, frameCount, targetSampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), targetSampleRate);
  } finally {
    void context.close();
  }
}

/** File name for the upload that matches the blob's real format. */
export function audioFileName(blob: Blob, baseName: string): string {
  return `${baseName}.${blob.type.includes('wav') ? 'wav' : 'webm'}`;
}
