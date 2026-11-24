// Error classification and copy. V4 copy: short B1 English, one action each.
// The matching rules are unchanged from V3; only the wording changed.

export const VOICE_UNAVAILABLE_MESSAGE = "Victoria can't speak right now. The question is shown as text.";
export const INVALID_ANSWER_MESSAGE = "We couldn't find any words. Try again, or type your answer.";

// Error kinds map to the four V2.2 error cards (plus a generic one).
export const ERROR_KINDS = {
  MIC: "mic",
  SILENT: "silent",
  VOICE: "voice",
  OFFLINE: "offline",
  GENERIC: "generic",
};

export function isNetworkError(error) {
  const message = String(error?.message || error || "");
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /not reachable|network|failed to fetch|load failed|timed out|waking up/i.test(message);
}

export function transcriptionRecovery(error) {
  const message = String(error?.message || "");
  const status = error?.status;
  if (/clearly silent recording/i.test(message)) {
    return { kind: ERROR_KINDS.SILENT, message: "We couldn't hear anything.", retryAudio: false };
  }
  if (/recording is too short|too short/i.test(message)) {
    return { kind: ERROR_KINDS.SILENT, message: "That was too short to hear.", retryAudio: false };
  }
  if (/no clear speech was detected/i.test(message)) {
    return { kind: ERROR_KINDS.SILENT, message: "We couldn't hear clear English.", retryAudio: false };
  }
  if (status === 413 || /too large|too long/i.test(message)) {
    return { kind: ERROR_KINDS.GENERIC, message: "This recording is too long. Please keep it shorter.", retryAudio: false };
  }
  if (status === 429 || /too many requests/i.test(message)) {
    return { kind: ERROR_KINDS.GENERIC, message: "Too many tries. Please wait a moment.", retryAudio: false };
  }
  if (/microphone|permission|notallowed|denied|secure HTTPS|secure context|local network HTTP/i.test(message)) {
    return { kind: ERROR_KINDS.MIC, message: friendlyError(error, "Microphone access needed."), retryAudio: false };
  }
  if (status >= 500 || /transcription|not reachable|timed out|network|failed to fetch|load failed|waking up/i.test(message)) {
    return {
      kind: isNetworkError(error) ? ERROR_KINDS.OFFLINE : ERROR_KINDS.GENERIC,
      message: "We couldn't send your recording. Your audio is still here.",
      retryAudio: true,
    };
  }
  return { kind: ERROR_KINDS.GENERIC, message: friendlyError(error, "Recording could not be sent."), retryAudio: false };
}

export function friendlyError(err, fallback) {
  const message = err?.message || "";
  if (/secure HTTPS|secure context|local network HTTP|isSecureContext/i.test(message)) {
    return "Voice needs a secure (HTTPS) page. You can still type.";
  }
  if (/microphone|permission|notallowed|denied/i.test(message)) {
    return "Microphone access needed.";
  }
  if (/recording is too short|too short/i.test(message)) {
    return "That was too short to hear.";
  }
  if (/no clear speech was detected/i.test(message)) {
    return "We couldn't hear clear English.";
  }
  if (/no clear answer|answer in words/i.test(message)) {
    return INVALID_ANSWER_MESSAGE;
  }
  if (/too many requests/i.test(message)) {
    return "Too many tries. Please wait a moment.";
  }
  if (/too long|too large|session is too large|voice playback text/i.test(message)) {
    return message;
  }
  if (/transcription|audio|whisper|duration/i.test(message)) {
    return "We couldn't turn your audio into text. Try again, or type.";
  }
  if (/tts|voice playback|voice is temporarily unavailable|voice unavailable/i.test(message)) {
    return VOICE_UNAVAILABLE_MESSAGE;
  }
  if (/not reachable|VITE_API_BASE|backend service/i.test(message)) {
    return "We can't reach Victoria. Check your connection.";
  }
  if (/^5\d\d\b|bad gateway|service unavailable/i.test(message)) {
    return "Victoria is busy right now. Please try again soon.";
  }
  if (/timed out|waking up/i.test(message)) {
    return "Victoria is taking too long. Please try again.";
  }
  if (/network|failed to fetch|load failed/i.test(message)) {
    return "Your connection is unstable. Please try again.";
  }
  return message || fallback;
}
