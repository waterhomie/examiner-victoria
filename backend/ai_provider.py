from __future__ import annotations

import logging
import time

import threading

from .core.config import (
    API_KEY,
    BASE_URL,
    LLM_TIMEOUT_SECONDS,
    MODEL,
    TRANSCRIPTION_MODEL,
    TTS_CACHE_MAX_ITEMS,
    get_runtime_config_summary,
)


logger = logging.getLogger("uvicorn.error")


_CLIENT = None
_CLIENT_LOCK = threading.Lock()


def get_client():
    """Return a process-wide OpenAI-compatible client.

    V4: the client is created once and reused so HTTP connections are pooled
    (previously a new client was built for every call). Configuration, model and
    retry behaviour are unchanged.
    """
    global _CLIENT
    if not API_KEY:
        raise RuntimeError("Missing API_KEY environment variable.")
    if _CLIENT is None:
        with _CLIENT_LOCK:
            if _CLIENT is None:
                from openai import OpenAI

                _CLIENT = OpenAI(api_key=API_KEY, base_url=BASE_URL)
    return _CLIENT


def completion_options() -> dict:
    return {"timeout": LLM_TIMEOUT_SECONDS} if LLM_TIMEOUT_SECONDS > 0 else {}


def call_model(messages: list[dict[str, str]], *, operation: str = "unspecified") -> str:
    started_at = time.perf_counter()
    try:
        response = get_client().chat.completions.create(model=MODEL, messages=messages, **completion_options())
    except Exception as exc:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        logger.warning(
            "LLM call failed: operation=%s duration_ms=%s error_type=%s",
            operation,
            duration_ms,
            type(exc).__name__,
        )
        raise
    duration_ms = int((time.perf_counter() - started_at) * 1000)
    logger.info("LLM call completed: operation=%s duration_ms=%s", operation, duration_ms)
    return response.choices[0].message.content.strip()
