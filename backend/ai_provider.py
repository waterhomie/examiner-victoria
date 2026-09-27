from __future__ import annotations

import logging
import time

from .core.config import (
    API_KEY,
    BASE_URL,
    MODEL,
    TRANSCRIPTION_MODEL,
    TTS_CACHE_MAX_ITEMS,
    get_runtime_config_summary,
)


logger = logging.getLogger("uvicorn.error")


def get_client():
    if not API_KEY:
        raise RuntimeError("Missing API_KEY environment variable.")
    from openai import OpenAI

    return OpenAI(api_key=API_KEY, base_url=BASE_URL)


def call_model(messages: list[dict[str, str]], *, operation: str = "unspecified") -> str:
    started_at = time.perf_counter()
    try:
        response = get_client().chat.completions.create(model=MODEL, messages=messages)
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
