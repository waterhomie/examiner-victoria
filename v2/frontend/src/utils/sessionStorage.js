export function loadSavedSession(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    clearSavedSession(storageKey);
    return null;
  }
}


export function saveSessionSnapshot(storageKey, snapshot) {
  try {
    if (!snapshot?.session) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        ...snapshot,
      }),
    );
  } catch (_) {
    // Storage can be blocked in private mode or embedded mobile WebViews.
    // The app should still work; it will just skip refresh recovery.
  }
}


export function clearSavedSession(storageKey) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch (_) {
    // Ignore storage failures in restricted/private browsing contexts.
  }
}

