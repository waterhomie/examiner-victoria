import { useEffect, useRef } from "react";

import { sendTelemetryEvent } from "../api.js";


function isMobileViewport() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 620px)").matches;
  }
  return Number(window.innerWidth || 0) <= 620;
}


function scrollPanelToLatest(panelRef, bottomRef, behavior) {
  const panel = panelRef.current;
  if (panel) {
    panel.scrollTo({ top: panel.scrollHeight, behavior });
    return;
  }
  bottomRef.current?.scrollIntoView({ behavior, block: "end" });
}


export function useAutoScrollToLatest(panelRef, bottomRef, triggers) {
  useEffect(() => {
    const mobile = isMobileViewport();
    const behavior = mobile ? "auto" : "smooth";
    const timers = [];
    let frame = null;

    scrollPanelToLatest(panelRef, bottomRef, behavior);
    if (mobile) {
      const runAgain = () => scrollPanelToLatest(panelRef, bottomRef, "auto");
      if (typeof window.requestAnimationFrame === "function") {
        frame = window.requestAnimationFrame(runAgain);
      } else {
        timers.push(window.setTimeout(runAgain, 0));
      }
      timers.push(window.setTimeout(runAgain, 140));
      timers.push(window.setTimeout(runAgain, 360));
    }

    return () => {
      if (frame !== null && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frame);
      }
      timers.forEach((timer) => window.clearTimeout(timer));
    };
    // The caller owns the trigger list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, triggers);
}


export function useScrollStateTelemetry(panelRef, sessionView) {
  const lastAnswerCountRef = useRef(null);

  useEffect(() => {
    const answerCount = sessionView?.answerCount || 0;
    if (lastAnswerCountRef.current === null) {
      lastAnswerCountRef.current = answerCount;
      return undefined;
    }
    if (answerCount <= lastAnswerCountRef.current) return undefined;
    lastAnswerCountRef.current = answerCount;
    if (!isMobileViewport()) return undefined;

    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      sendTelemetryEvent("ui-scroll-state", {
        answerCount,
        clientHeight: Math.round(panel.clientHeight || 0),
        messageCount: sessionView.messageCount || 0,
        phase: sessionView.phase || "",
        practiceType: sessionView.practiceType || "",
        scrollHeight: Math.round(panel.scrollHeight || 0),
        scrollTop: Math.round(panel.scrollTop || 0),
        stageVisible: Boolean(sessionView.stageVisible),
      });
    }, 420);

    return () => window.clearTimeout(timer);
  }, [
    panelRef,
    sessionView?.answerCount,
    sessionView?.messageCount,
    sessionView?.phase,
    sessionView?.practiceType,
    sessionView?.stageVisible,
  ]);
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
