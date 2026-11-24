from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from . import config


RATE_LIMIT_WINDOW_SECONDS = 60
REQUEST_LOG: dict[str, deque[float]] = defaultdict(deque)


def client_key(request: Request) -> str:
    """Identify the caller for rate limiting.

    Behind CloudBase Run every request arrives from the gateway, so
    ``request.client.host`` is shared by all users. When TRUST_PROXY_HEADERS is
    enabled the first X-Forwarded-For hop is used instead. Disabled by default
    because the header is client-controlled when no trusted proxy is in front.
    """
    if config.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for", "")
        first_hop = forwarded.split(",")[0].strip()
        if first_hop:
            return first_hop[:64]
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip[:64]
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(request: Request) -> None:
    if config.RATE_LIMIT_PER_MINUTE <= 0:
        return

    client_host = client_key(request)
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
