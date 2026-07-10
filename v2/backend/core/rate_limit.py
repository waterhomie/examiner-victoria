from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from . import config


RATE_LIMIT_WINDOW_SECONDS = 60
REQUEST_LOG: dict[str, deque[float]] = defaultdict(deque)


def enforce_rate_limit(request: Request) -> None:
    if config.RATE_LIMIT_PER_MINUTE <= 0:
        return

    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    timestamps = REQUEST_LOG[client_host]
    while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW_SECONDS:
        timestamps.popleft()

    if len(timestamps) >= config.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before trying again.",
        )

    timestamps.append(now)


def clear_rate_limit_log() -> None:
    REQUEST_LOG.clear()
