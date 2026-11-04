export const VOICE_UNAVAILABLE_MESSAGE = "Voice is temporarily unavailable. Continue with the text shown above.";
export const INVALID_ANSWER_MESSAGE = "No clear answer was detected. Please answer in words or try recording again.";

export function transcriptionRecovery(error) {
  const message = String(error?.message || "");
  const status = error?.status;
  if (/recording is too short|too short/i.test(message)) {
    return { message: "The recording was too short to detect an answer. Tap Voice to record again, or type your answer below.", retryAudio: false };
  }
  if (/no clear speech was detected/i.test(message)) {
    return { message: "No clear English answer was detected. If you spoke, please try answering in English again, or type your answer below.", retryAudio: false };
  }
  if (status === 413 || /too large|too long/i.test(message)) {
    return { message: "This recording is too long. Record a shorter answer, or type it below.", retryAudio: false };
  }
  if (status === 429 || /too many requests/i.test(message)) {
    return { message: "Too many requests. Please wait a moment, then try again.", retryAudio: false };
  }
  if (/microphone|permission|notallowed|denied|secure HTTPS|secure context|local network HTTP/i.test(message)) {
    return { message: friendlyError(error, "Microphone access is unavailable."), retryAudio: false };
  }
  if (status >= 500 || /transcription|not reachable|timed out|network|failed to fetch|load failed|waking up/i.test(message)) {
    return { message: "Audio transcription could not connect. Retry this audio, record again, or type your answer below.", retryAudio: true };
  }
  return { message: friendlyError(error, "Recording could not be sent."), retryAudio: false };
}

export function friendlyError(err, fallback) {
  const message = err?.message || "";
  if (/secure HTTPS|secure context|local network HTTP|isSecureContext/i.test(message)) {
    return "iPhone Safari needs HTTPS before it can ask for microphone permission. This local Wi-Fi address can be used for text testing, but voice recording needs an HTTPS preview or public deployment.";
  }
  if (/microphone|permission|notallowed|denied/i.test(message)) {
    return "Microphone access was blocked. Please allow microphone permission, or switch to Text.";
  }
  if (/recording is too short|too short/i.test(message)) {
    return "That recording was too short. Type your answer below, or tap Voice to record again.";
  }
  if (/no clear speech was detected/i.test(message)) {
    return "I couldn't make out your answer. Type it below, or tap Voice to record again.";
  }
  if (/no clear answer|answer in words/i.test(message)) {
    return INVALID_ANSWER_MESSAGE;
  }
  if (/too many requests/i.test(message)) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  if (/too long|too large|session is too large|voice playback text/i.test(message)) {
    return message;
  }
  if (/transcription|audio|whisper|duration/i.test(message)) {
    return "Audio transcription is temporarily unavailable. Type your answer below, or tap Voice to record again.";
  }
  if (/tts|voice playback|voice is temporarily unavailable|voice unavailable/i.test(message)) {
    return VOICE_UNAVAILABLE_MESSAGE;
  }
  if (/not reachable|VITE_API_BASE|backend service/i.test(message)) {
    return "Victoria's server is not reachable. Please try again in a moment, or check whether the backend is running.";
  }
  if (/^5\d\d\b|bad gateway|service unavailable/i.test(message)) {
    return "Victoria's voice or AI service is temporarily unavailable. You can continue with the visible text and try again in a moment.";
  }
  if (/timed out|waking up/i.test(message)) {
    return "Victoria's server is taking too long to respond. It may be waking up, so please try again in a moment.";
  }
  if (/network|failed to fetch|load failed/i.test(message)) {
    return "Network connection is unstable. Please try again in a moment.";
  }
  return message || fallback;
}
