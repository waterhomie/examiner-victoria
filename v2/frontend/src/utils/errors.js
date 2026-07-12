export const VOICE_UNAVAILABLE_MESSAGE = "Voice is temporarily unavailable. Continue with the text shown above.";

export function friendlyError(err, fallback) {
  const message = err?.message || "";
  if (/secure HTTPS|secure context|local network HTTP|isSecureContext/i.test(message)) {
    return "iPhone Safari needs HTTPS before it can ask for microphone permission. This local Wi-Fi address can be used for text testing, but voice recording needs an HTTPS preview or public deployment.";
  }
  if (/microphone|permission|notallowed|denied/i.test(message)) {
    return "Microphone access was blocked. Please allow microphone permission, or switch to Text.";
  }
  if (/recording is too short|too short/i.test(message)) {
    return "That recording was too short. Tap again and answer in a complete sentence.";
  }
  if (/too many requests/i.test(message)) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  if (/too long|too large|session is too large|voice playback text/i.test(message)) {
    return message;
  }
  if (/transcription|audio|whisper|duration/i.test(message)) {
    return "Audio transcription is temporarily unavailable. You can switch to Text and type your answer.";
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
