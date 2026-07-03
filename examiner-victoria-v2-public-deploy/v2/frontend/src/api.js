const API_BASE = import.meta.env.VITE_API_BASE || "";
const DEFAULT_TIMEOUT_MS = 30000;

function audioFilenameForBlob(blob) {
  const type = (blob?.type || "").toLowerCase();
  if (type.includes("mp4") || type.includes("aac")) return "answer.m4a";
  if (type.includes("webm")) return "answer.webm";
  if (type.includes("ogg")) return "answer.ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return "answer.mp3";
  return "answer.wav";
}

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller.signal,
      headers: {
        ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(fetchOptions.headers || {}),
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Victoria's server may be waking up; please try again.");
    }
    throw new Error("Victoria's server is not reachable. Please check the backend service and VITE_API_BASE.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (data.detail) {
        message = JSON.stringify(data.detail);
      }
    } catch (_) {
      // Some endpoints return plain text or binary.
    }
    throw new Error(message);
  }

  return response;
}

export async function healthCheck() {
  const response = await request("/api/health", { timeoutMs: 8000 });
  return response.json();
}

export async function fetchPracticeOptions() {
  const response = await request("/api/practice-options", { timeoutMs: 8000 });
  return response.json();
}

export async function startSession(settings) {
  const response = await request("/api/sessions", {
    method: "POST",
    body: JSON.stringify(settings),
  });
  return response.json();
}

export async function sendAnswer({ session, answer, source, duration }) {
  const response = await request("/api/answer", {
    method: "POST",
    body: JSON.stringify({ session, answer, source, duration }),
  });
  return response.json();
}

export async function transcribeAudio(blob) {
  const form = new FormData();
  form.append("file", blob, audioFilenameForBlob(blob));
  const response = await request("/api/transcribe", {
    method: "POST",
    body: form,
    timeoutMs: 90000,
  });
  return response.json();
}

export async function synthesizeSpeech(text) {
  const response = await request("/api/tts", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return response.blob();
}

export async function buildReport(session) {
  const response = await request("/api/report", {
    method: "POST",
    body: JSON.stringify({ session }),
  });
  return response.json();
}
