import { useEffect, useRef, useState } from "react";

import { sendTelemetryEvent } from "../api.js";

// V4: chat autoscroll and scroll telemetry were removed with the chat layout.


export function useMediaQuery(query) {
  const get = () => (typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}


export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}


// Desktop: hold Space to talk, release to send. Ignored while typing.
export function useHoldToTalk({ enabled, onPress, onRelease }) {
  const handlers = useRef({ onPress, onRelease });
  useEffect(() => {
    handlers.current = { onPress, onRelease };
  }, [onPress, onRelease]);
  useEffect(() => {
    if (!enabled) return undefined;
    let held = false;
    const typing = (event) => /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target?.tagName || "") || event.target?.isContentEditable;
    const down = (event) => {
      if (event.code !== "Space" || event.repeat || typing(event)) return;
      event.preventDefault();
      held = true;
      handlers.current.onPress?.();
    };
    const up = (event) => {
      if (event.code !== "Space" || !held) return;
      event.preventDefault();
      held = false;
      handlers.current.onRelease?.();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);
}


export function useRecordingTimer(recording, startedAtRef, setElapsed) {
  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    }, 120);
    return () => window.clearInterval(timer);
  }, [recording, setElapsed, startedAtRef]);
}


export function usePrepCountdown(prepEndsAt, setPrepEndsAt, setClockTick) {
  useEffect(() => {
    if (!prepEndsAt) return undefined;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClockTick(now);
      if (prepEndsAt <= now) {
        setPrepEndsAt(null);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [prepEndsAt, setClockTick, setPrepEndsAt]);
}


export function usePagehideCleanup(cleanup) {
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    function handlePagehide() {
      cleanupRef.current?.();
    }

    window.addEventListener("pagehide", handlePagehide);
    return () => window.removeEventListener("pagehide", handlePagehide);
  }, []);
}


export function useFrontendErrorTelemetry() {
  useEffect(() => {
    function handleWindowError(event) {
      sendTelemetryEvent("frontend-error", {
        message: event.message || "window error",
        source: event.filename || "",
        line: event.lineno || 0,
        column: event.colno || 0,
      });
    }

    function handleUnhandledRejection(event) {
      sendTelemetryEvent("frontend-error", {
        message: String(event.reason?.message || event.reason || "unhandled rejection"),
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
