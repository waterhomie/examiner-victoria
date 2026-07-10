from __future__ import annotations

from fastapi import HTTPException

from . import config


def enforce_payload_limits(answer: str | None, message_count: int) -> None:
    if answer is not None and len(answer) > config.MAX_ANSWER_CHARS:
        raise HTTPException(
            status_code=413,
            detail="Your answer is too long for one turn. Please shorten it and try again.",
        )
    if message_count > config.MAX_SESSION_MESSAGES:
        raise HTTPException(
            status_code=413,
            detail="This session is too large. Please restart the test before continuing.",
        )
