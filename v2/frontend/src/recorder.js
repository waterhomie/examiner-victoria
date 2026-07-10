const MICROPHONE_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

const COMPRESSED_AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function ensureMicrophoneApi() {
  if (!window.isSecureContext) {
    throw new Error(
      "Microphone recording requires a secure HTTPS page on mobile Safari. Local network HTTP cannot request microphone permission.",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone recording.");
  }
}

async function requestMicrophoneStream() {
  ensureMicrophoneApi();
  return navigator.mediaDevices.getUserMedia(MICROPHONE_CONSTRAINTS);
}

function getMediaRecorderClass() {
  if (typeof window === "undefined") return null;
  return window.MediaRecorder || null;
}

function isLikelyIOSRecordingDevice() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function chooseCompressedAudioMimeType() {
  const MediaRecorderClass = getMediaRecorderClass();
  if (!MediaRecorderClass) return "";
  if (typeof MediaRecorderClass.isTypeSupported !== "function") return "";
  return COMPRESSED_AUDIO_MIME_TYPES.find((type) => MediaRecorderClass.isTypeSupported(type)) || "";
}

export function compressedAudioRecorderIsSupported() {
  const MediaRecorderClass = getMediaRecorderClass();
  if (!MediaRecorderClass) return false;
  if (typeof MediaRecorderClass.isTypeSupported !== "function") return true;
  return Boolean(chooseCompressedAudioMimeType());
}

export function createAnswerRecorder({ targetSampleRate = 16000 } = {}) {
  if (isLikelyIOSRecordingDevice()) {
    return new WavRecorder({ targetSampleRate });
  }
  if (compressedAudioRecorderIsSupported()) {
    return new MediaRecorderAudioRecorder({ mimeType: chooseCompressedAudioMimeType() });
  }
  return new WavRecorder({ targetSampleRate });
}

class MediaRecorderAudioRecorder {
  constructor({ mimeType = "" } = {}) {
    this.kind = "media";
    this.mimeType = mimeType;
    this.actualMimeType = "";
    this.recording = false;
    this.startedAt = 0;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }

  async start() {
    if (this.recording) return;
    const MediaRecorderClass = getMediaRecorderClass();
    if (!MediaRecorderClass) {
      throw new Error("This browser does not support compressed audio recording.");
    }

    this.mediaStream = await requestMicrophoneStream();
    try {
      this.mediaRecorder = new MediaRecorderClass(
        this.mediaStream,
        this.mimeType ? { mimeType: this.mimeType } : undefined,
      );
    } catch (_) {
      this.cleanup();
      throw new Error("This browser could not start compressed audio recording.");
    }

    this.actualMimeType = this.mediaRecorder.mimeType || this.mimeType || "";
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data?.size) {
        this.chunks.push(event.data);
      }
    };

    try {
      this.mediaRecorder.start(1000);
    } catch (_) {
      this.cleanup();
      throw new Error("This browser could not start compressed audio recording.");
    }

    this.startedAt = Date.now();
    this.recording = true;
  }

  stop() {
    if (!this.recording || !this.mediaRecorder) return Promise.resolve(null);
    const mediaRecorder = this.mediaRecorder;
    const duration = Math.max(0.1, (Date.now() - this.startedAt) / 1000);
    this.recording = false;

    return new Promise((resolve, reject) => {
      let recorderError = null;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        const blobType = this.actualMimeType || this.chunks[0]?.type || "audio/webm";
        const blob = new Blob(this.chunks, { type: blobType });
        this.cleanupAfterStop();

        if (recorderError) {
          reject(recorderError);
          return;
        }
        if (duration < 0.5 || blob.size < 512) {
          reject(new Error("Recording is too short."));
          return;
        }
        resolve({
          blob,
          duration,
          recorderType: "media",
          mimeType: blob.type,
          size: blob.size,
        });
      };

      mediaRecorder.onerror = (event) => {
        recorderError = event.error || new Error("Recording failed.");
      };
      mediaRecorder.onstop = finish;

      try {
        mediaRecorder.requestData?.();
        if (mediaRecorder.state === "inactive") {
          finish();
        } else {
          mediaRecorder.stop();
        }
      } catch (error) {
        this.cleanupAfterStop();
        reject(error);
      }
    });
  }

  cleanupAfterStop() {
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.actualMimeType = "";
  }

  cleanup() {
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;
      if (this.mediaRecorder.state !== "inactive") {
        try {
          this.mediaRecorder.stop();
        } catch (_) {
          // Ignore cleanup errors.
        }
      }
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.actualMimeType = "";
    this.recording = false;
  }
}

export class WavRecorder {
  constructor({ targetSampleRate = 16000 } = {}) {
    this.kind = "wav";
    this.targetSampleRate = targetSampleRate;
    this.recording = false;
    this.startedAt = 0;
    this.mediaStream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.silentGain = null;
    this.chunks = [];
    this.recordedLength = 0;
    this.captureSampleRate = 44100;
  }

  async start() {
    if (this.recording) return;
    this.mediaStream = await requestMicrophoneStream();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      this.cleanup();
      throw new Error("This browser does not support Web Audio recording.");
    }

    this.audioContext = new AudioContextClass();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.captureSampleRate = this.audioContext.sampleRate || 44100;
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.silentGain = this.audioContext.createGain();
    this.silentGain.gain.value = 0;
    this.chunks = [];
    this.recordedLength = 0;

    this.processorNode.onaudioprocess = (event) => {
      if (!this.recording) return;
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.chunks.push(copy);
      this.recordedLength += copy.length;
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.silentGain);
    this.silentGain.connect(this.audioContext.destination);
    this.startedAt = Date.now();
    this.recording = true;
  }

  async stop() {
    if (!this.recording) return null;
    this.recording = false;
    const duration = Math.max(0.1, (Date.now() - this.startedAt) / 1000);
    const chunks = this.chunks.slice();
    const length = this.recordedLength;
    const sampleRate = this.captureSampleRate;
    this.cleanup();

    if (duration < 0.5 || length < sampleRate * 0.3) {
      throw new Error("Recording is too short.");
    }

    const samples = mergeAudioChunks(chunks, length);
    const compactSamples = downsampleBuffer(samples, sampleRate, this.targetSampleRate);
    const blob = encodeWav(compactSamples, this.targetSampleRate);
    return {
      blob,
      duration,
      recorderType: "wav",
      mimeType: blob.type,
      size: blob.size,
    };
  }

  cleanup() {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
    }
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.silentGain) this.silentGain.disconnect();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }
    this.mediaStream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.silentGain = null;
    this.chunks = [];
    this.recordedLength = 0;
  }
}

function mergeAudioChunks(chunks, totalLength) {
  const result = new Float32Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (!inputSampleRate || outputSampleRate >= inputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accumulator = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accumulator += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? accumulator / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPcm(view, 44, samples);
  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPcm(view, offset, samples) {
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
}
