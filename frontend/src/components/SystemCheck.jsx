import { useEffect, useMemo, useState } from "react";
import { fetchRuntimeDiagnostics } from "../api.js";
import {
  buildDiagnosticCopyText,
  checkLocalStorage,
  getDownloadSupport,
  getPageEnvironment,
  getRecordingSupport,
} from "../utils/runtimeDiagnostics.js";
import { Icon } from "./ui.jsx";

// V4 "System check" (was RuntimeDiagnosticsPanel). Same checks, English copy.
// The copied text never includes cookies, tokens, recordings or answers.

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function Row({ label, ok, detail }) {
  return (
    <li className={`sys-row ${ok === true ? "is-ok" : ok === false ? "is-bad" : ""}`}>
      <span>{label}</span>
      <b>{detail}</b>
    </li>
  );
}

export function SystemCheck({ onBack }) {
  const [api, setApi] = useState({ status: "checking", elapsedMs: null });
  const [mic, setMic] = useState("Not tested");
  const [playback, setPlayback] = useState("Not tested");
  const [copyStatus, setCopyStatus] = useState("");
  const environment = useMemo(() => getPageEnvironment(), []);
  const recording = useMemo(() => getRecordingSupport(), []);
  const storage = useMemo(() => checkLocalStorage(), []);
  const download = useMemo(() => getDownloadSupport(), []);

  useEffect(() => {
    const startedAt = performance.now();
    fetchRuntimeDiagnostics()
      .then((payload) => setApi({ status: payload?.status === "ok" ? "reachable" : "unexpected", elapsedMs: Math.round(performance.now() - startedAt) }))
      .catch(() => setApi({ status: "failed", elapsedMs: Math.round(performance.now() - startedAt) }));
  }, []);

  async function testMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic("Not supported");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMic("Works");
    } catch (_) {
      setMic("Blocked");
    } finally {
      stream?.getTracks?.().forEach((track) => track.stop());
    }
  }

  async function testSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setPlayback("Not supported");
      return;
    }
    try {
      const context = new AudioContextClass();
      if (context.state === "suspended") await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.14);
      setPlayback("Played a beep");
      window.setTimeout(() => context.close().catch(() => {}), 220);
    } catch (_) {
      setPlayback("Blocked");
    }
  }

  async function copyAll() {
    const text = buildDiagnosticCopyText({
      time: new Date().toISOString(),
      environment,
      recording,
      api,
      playback: { status: playback },
      storage,
    });
    try {
      await copyText(text);
      setCopyStatus("Copied. It has no answers, recordings or passwords.");
    } catch (_) {
      setCopyStatus("Couldn't copy. Please take a screenshot instead.");
    }
  }

  return (
    <div className="system-check" data-testid="system-check">
      <button className="settings-link back" type="button" onClick={onBack}>
        <Icon name="back" size={16} /> Settings
      </button>
      {environment.isWeChat ? (
        <p className="notice">You're in WeChat. If voice doesn't work, open this page in Safari or Chrome.</p>
      ) : null}
      <ul className="sys-list">
        <Row label="Server" ok={api.status === "reachable" ? true : api.status === "checking" ? null : false} detail={api.status === "reachable" ? `OK · ${api.elapsedMs} ms` : api.status === "checking" ? "Checking…" : "Can't reach"} />
        <Row label="Secure page (HTTPS)" ok={environment.https} detail={environment.https ? "Yes" : "No"} />
        <Row label="Recording" ok={recording.getUserMedia} detail={recording.getUserMedia ? (recording.mediaRecorder ? "Supported" : "WAV fallback") : "Not supported"} />
        <Row label="Saving on device" ok={storage.available} detail={storage.available ? "Works" : "Blocked"} />
        <Row label="Downloads" ok={download.blob && download.objectUrl} detail={download.blob && download.objectUrl ? "Works" : "Limited"} />
        <Row label="Microphone" ok={mic === "Works" ? true : mic === "Not tested" ? null : false} detail={mic} />
        <Row label="Sound" ok={playback === "Played a beep" ? true : playback === "Not tested" ? null : false} detail={playback} />
      </ul>
      <div className="sys-actions">
        <button className="btn small ghost" type="button" onClick={testMic}>Test mic</button>
        <button className="btn small ghost" type="button" onClick={testSound}>Test sound</button>
        <button className="btn small main" type="button" onClick={copyAll}>Copy results</button>
      </div>
      {copyStatus ? <p className="hint">{copyStatus}</p> : null}
    </div>
  );
}
