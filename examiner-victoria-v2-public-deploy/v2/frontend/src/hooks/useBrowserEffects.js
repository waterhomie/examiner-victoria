import { useEffect, useLayoutEffect, useRef } from "react";

import { sendTelemetryEvent } from "../api.js";


function isMobileViewport() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 620px)").matches;
  }
  return Number(window.innerWidth || 0) <= 620;
}


function scrollPanelToLatest(panelRef, bottomRef, behavior) {
  const anchor = bottomRef.current;
  if (anchor) {
    anchor.scrollIntoView({ behavior, block: "end", inline: "nearest" });
    return;
  }
  const panel = panelRef.current;
  panel?.scrollTo({ top: panel.scrollHeight, behavior });
}


function readScrollMetrics(panelRef, bottomRef) {
  const panel = panelRef.current;
  if (!panel) return null;
  const bottomAnchor = bottomRef.current;
  const bottomAnchorHeight = bottomAnchor?.getBoundingClientRect?.().height || 0;
  const contentBottomBeforeAnchor = bottomAnchor ? bottomAnchor.offsetTop : panel.scrollHeight;
  const visibleSafeHeight = Math.max(0, panel.clientHeight - bottomAnchorHeight);
  const distanceFromBottom = panel.scrollHeight - panel.clientHeight - panel.scrollTop;
  const shouldFollowBottom = contentBottomBeforeAnchor - panel.scrollTop > visibleSafeHeight - 8;
  const isNearBottom = distanceFromBottom <= Math.max(96, bottomAnchorHeight + 24);
  return {
    bottomAnchorHeight,
    clientHeight: panel.clientHeight,
    contentBottomBeforeAnchor,
    distanceFromBottom,
    isNearBottom,
    scrollHeight: panel.scrollHeight,
    scrollTop: panel.scrollTop,
    shouldFollowBottom,
    visibleSafeHeight,
  };
}


function shouldScrollToLatest(panelRef, bottomRef, options, previousStateRef) {
  const mobile = isMobileViewport();
  if (!mobile) return true;

  const answerCount = options.answerCount || 0;
  if (answerCount === 0) return false;

  const metrics = readScrollMetrics(panelRef, bottomRef);
  if (!metrics?.shouldFollowBottom) return false;

  const previous = previousStateRef.current;
  const messageAdded = !previous || options.messageCount > previous.messageCount;
  const answerAdded = !previous || answerCount > previous.answerCount;
  const lastMessageChanged = !previous || options.lastMessageKey !== previous.lastMessageKey;
  const ordinaryStateChange = !messageAdded && !answerAdded && !lastMessageChanged;

  if (ordinaryStateChange) return metrics.isNearBottom;
  return true;
}


export function useAutoScrollToLatest(panelRef, bottomRef, options) {
  const previousStateRef = useRef(null);

  useLayoutEffect(() => {
    const mobile = isMobileViewport();
    const behavior = mobile ? "auto" : "smooth";
    const timers = [];
    let frame = null;
    const previousState = previousStateRef.current;
    const nextState = {
      answerCount: options.answerCount || 0,
      lastMessageKey: options.lastMessageKey || "",
      messageCount: options.messageCount || 0,
    };
    previousStateRef.current = nextState;

    const runIfNeeded = (nextBehavior) => {
      if (shouldScrollToLatest(panelRef, bottomRef, options, { current: previousState })) {
        scrollPanelToLatest(panelRef, bottomRef, nextBehavior);
      }
    };

    runIfNeeded(behavior);
    if (mobile) {
      const runAgain = () => runIfNeeded("auto");
      if (typeof window.requestAnimationFrame === "function") {
        frame = window.requestAnimationFrame(runAgain);
      } else {
        timers.push(window.setTimeout(runAgain, 0));
      }
      timers.push(window.setTimeout(runAgain, 120));
      timers.push(window.setTimeout(runAgain, 360));
      timers.push(window.setTimeout(runAgain, 720));
    }

    return () => {
      if (frame !== null && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frame);
      }
      timers.forEach((timer) => window.clearTimeout(timer));
    };
    // The caller owns the trigger list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, options.triggers);
}


export function useScrollStateTelemetry(panelRef, bottomRef, sessionView) {
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
      const metrics = readScrollMetrics(panelRef, bottomRef);
      if (!metrics) return;
      sendTelemetryEvent("ui-scroll-state", {
        answerCount,
        bottomAnchorHeight: Math.round(metrics.bottomAnchorHeight || 0),
        clientHeight: Math.round(metrics.clientHeight || 0),
        contentBottomBeforeAnchor: Math.round(metrics.contentBottomBeforeAnchor || 0),
        distanceFromBottom: Math.round(metrics.distanceFromBottom || 0),
        lastMessagePhase: sessionView.lastMessagePhase || "",
        lastMessageRole: sessionView.lastMessageRole || "",
        messageCount: sessionView.messageCount || 0,
        phase: sessionView.phase || "",
        practiceType: sessionView.practiceType || "",
        scrollHeight: Math.round(metrics.scrollHeight || 0),
        scrollTop: Math.round(metrics.scrollTop || 0),
        shouldFollowBottom: Boolean(metrics.shouldFollowBottom),
        stageVisible: Boolean(sessionView.stageVisible),
        visibleSafeHeight: Math.round(metrics.visibleSafeHeight || 0),
      });
    }, 420);

    return () => window.clearTimeout(timer);
  }, [
    panelRef,
    bottomRef,
    sessionView?.answerCount,
    sessionView?.lastMessagePhase,
    sessionView?.lastMessageRole,
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
