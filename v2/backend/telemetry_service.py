from __future__ import annotations

import time
from collections import defaultdict, deque
from statistics import mean, median
from typing import Any

from .core import config


MAX_TELEMETRY_EVENTS = config.TELEMETRY_MAX_EVENTS
MAX_RECENT_EVENTS = 40
SENSITIVE_DETAIL_KEYS = {
    "answer",
    "api_key",
    "browser_text",
    "content",
    "key",
    "spoken_text",
    "text",
    "token",
    "transcript",
}

TELEMETRY_EVENTS: deque[dict[str, Any]] = deque(maxlen=MAX_TELEMETRY_EVENTS)


def _safe_value(value: Any) -> Any:
    if isinstance(value, bool) or value is None:
        return value
    if isinstance(value, int | float):
        return value
    if isinstance(value, str):
        return value[:180]
    return str(value)[:180]


def _safe_details(details: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in details.items():
        normalized_key = str(key).strip()
        if not normalized_key:
            continue
        if normalized_key.lower() in SENSITIVE_DETAIL_KEYS:
            continue
        safe[normalized_key[:80]] = _safe_value(value)
    return safe


def record_telemetry_event(
    event: str,
    details: dict[str, Any],
    *,
    client_host: str,
    user_agent: str,
) -> dict[str, Any]:
    stored = {
        "at": int(time.time()),
        "event": event[:80],
        "details": _safe_details(details),
        "client": client_host[:80],
        "user_agent": user_agent[:220],
    }
    TELEMETRY_EVENTS.append(stored)
    return stored


def _duration_from_event(event: dict[str, Any]) -> float | None:
    details = event.get("details") or {}
    for key in ("durationMs", "totalMs", "serverTotalMs", "serverElapsedMs", "elapsedMs"):
        value = details.get(key)
        if isinstance(value, int | float) and value >= 0:
            return float(value)
    return None


def get_telemetry_summary() -> dict[str, Any]:
    events = list(TELEMETRY_EVENTS)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        grouped[str(event.get("event") or "unknown")].append(event)

    by_event: dict[str, dict[str, Any]] = {}
    for event_name, event_items in sorted(grouped.items()):
        durations = [
            duration
            for duration in (_duration_from_event(item) for item in event_items)
            if duration is not None
        ]
        summary: dict[str, Any] = {
            "count": len(event_items),
        }
        if durations:
            sorted_durations = sorted(durations)
            p95_index = min(len(sorted_durations) - 1, int(round((len(sorted_durations) - 1) * 0.95)))
            summary.update(
                {
                    "avg_ms": round(mean(durations)),
                    "median_ms": round(median(durations)),
                    "p95_ms": round(sorted_durations[p95_index]),
                }
            )
        by_event[event_name] = summary

    return {
        "total_events": len(events),
        "max_events": MAX_TELEMETRY_EVENTS,
        "by_event": by_event,
        "recent": events[-MAX_RECENT_EVENTS:],
    }
