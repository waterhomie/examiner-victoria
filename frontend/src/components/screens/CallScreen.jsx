import { useEffect, useState } from "react";
import { PRACTICE_TYPES } from "../../config/appConfig.js";
import { Icon, Monogram } from "../ui.jsx";

function useMicPermission() {
  const [status, setStatus] = useState("unknown");
  useEffect(() => {
    let cancelled = false;
    let permission = null;
    const supported = typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia;
    if (!supported) {
      setStatus("unsupported");
      return undefined;
    }
    navigator.permissions?.query?.({ name: "microphone" })
      .then((result) => {
        if (cancelled) return;
        permission = result;
        setStatus(result.state);
        result.onchange = () => setStatus(result.state);
      })
      .catch(() => setStatus("unknown"));
    return () => {
      cancelled = true;
      if (permission) permission.onchange = null;
    };
  }, []);
  return status;
}

function Check({ state, title, detail }) {
  return (
    <li className={`check check-${state}`}>
      <span className="check-mark" aria-hidden="true">
        {state === "ok" ? <Icon name="check" size={14} strokeWidth={3} /> : state === "bad" ? "!" : "·"}
      </span>
      <span>
        <b>{title}</b>
        {detail ? <small>{detail}</small> : null}
      </span>
    </li>
  );
}

export function CallScreen({ state, onCall, onBack }) {
  const mic = useMicPermission();
  const health = state.health;
  const type = PRACTICE_TYPES.find((item) => item.value === state.practiceType);
  const starting = state.busy === "starting";
  const micState = mic === "granted" ? "ok" : mic === "denied" || mic === "unsupported" ? "bad" : "wait";
  const micDetail = {
    granted: "",
    denied: "Allow it in your browser settings",
    unsupported: "This browser can't record. You can still type",
  }[mic] ?? "We'll ask when you first answer";
  const netState = !health ? "wait" : health.status === "ok" ? "ok" : "bad";

  return (
    <main className="screen ink call" data-testid="call-screen">
      <header className="bar">
        <button className="icon-btn" type="button" onClick={onBack} aria-label="Back" disabled={starting}>
          <Icon name="back" />
        </button>
        <span className="pill">{state.trainingMode === "mock" ? "Mock" : "Practice"} · {type?.title}</span>
        <span className="icon-btn-spacer" />
      </header>

      <div className="call-body">
        <Monogram size="lg" speaking={starting} />
        <h1 className="serif call-name">Victoria</h1>
        <p className="call-sub">Your IELTS speaking examiner</p>

        <ul className="checks">
          <Check state={micState} title={mic === "granted" ? "Microphone ready" : "Microphone"} detail={micDetail} />
          <Check
            state={netState}
            title={netState === "ok" ? "Connection OK" : netState === "bad" ? "Can't reach Victoria" : "Checking connection"}
          />
          <Check state="tip" title="Turn your volume up" detail="Victoria asks every question out loud" />
        </ul>

        {state.error ? <p className="call-error" role="alert">{state.error.message}</p> : null}
      </div>

      <footer className="cta">
        <button className="btn call-btn" type="button" onClick={onCall} disabled={starting} data-testid="call-button">
          <Icon name="phone" />
          {starting ? "Calling…" : "Call Victoria"}
        </button>
      </footer>
    </main>
  );
}
