from __future__ import annotations

from .core.config import (
    API_KEY,
    BASE_URL,
    MODEL,
    TRANSCRIPTION_MODEL,
    TTS_CACHE_MAX_ITEMS,
    get_runtime_config_summary,
)


def get_client():
    if not API_KEY:
        raise RuntimeError("Missing API_KEY environment variable.")
    from openai import OpenAI

    return OpenAI(api_key=API_KEY, base_url=BASE_URL)


def call_model(messages: list[dict[str, str]]) -> str:
    response = get_client().chat.completions.create(model=MODEL, messages=messages)
    return response.choices[0].message.content.strip()
