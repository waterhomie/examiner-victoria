// Amplitude is not voice activity detection. Only reject near-digital silence.
// Anything uncertain, including unsupported decoding, must reach transcription.
export function isClearlySilentAudio(audioBuffer) {
  if (!audioBuffer?.numberOfChannels || !audioBuffer?.length) return false;
  let sampleCount = 0;
  let squaredSum = 0;
  let peak = 0;
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const samples = audioBuffer.getChannelData(channel);
    const stride = Math.max(1, Math.floor(samples.length / 160000));
    for (let index = 0; index < samples.length; index += stride) {
      const amplitude = Math.abs(samples[index]);
      if (!Number.isFinite(amplitude)) return false;
      peak = Math.max(peak, amplitude);
      squaredSum += amplitude * amplitude;
      sampleCount += 1;
    }
  }
  if (!sampleCount) return false;
  return peak < 0.003 && Math.sqrt(squaredSum / sampleCount) < 0.0003;
}

export async function recordingIsClearlySilent(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || !blob?.arrayBuffer) return false;
  let context;
  try {
    context = new AudioContextClass();
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    return isClearlySilentAudio(decoded);
  } catch (_) {
    return false;
  } finally {
    if (context && context.state !== "closed") {
      try { await context.close(); } catch (_) { /* Decoding remains best-effort. */ }
    }
  }
}
