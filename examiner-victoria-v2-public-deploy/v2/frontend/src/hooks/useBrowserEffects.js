import { useEffect, useRef } from "react";


export function useAutoScrollToLatest(panelRef, bottomRef, triggers) {
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) {
      panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    // The caller owns the trigger list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, triggers);
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
