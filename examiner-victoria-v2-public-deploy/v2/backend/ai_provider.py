from __future__ import annotations

import os
from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def load_local_env_file(path: Path) -> None:
    """Load simple KEY=VALUE pairs for local development without extra packages."""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        if name and name not in os.environ:
            os.environ[name] = value


load_local_env_file(ROOT_DIR / ".env")
load_local_env_file(ROOT_DIR / "v2" / "backend" / ".env")


def get_secret(name: str, default: str | None = None) -> str | None:
    return os.getenv(name) or os.getenv(f"STREAMLIT_{name}") or default


def get_positive_int(name: str, default: int) -> int:
    raw = get_secret(name, str(default))
    try:
        return max(1, int(str(raw).strip()))
    except (TypeError, ValueError):
        return default


API_KEY = get_secret("API_KEY")
BASE_URL = get_secret("BASE_URL", "https://api.gptsapi.net/v1")
MODEL = get_secret("MODEL", "gpt-5.4-mini")
TRANSCRIPTION_MODEL = get_secret("TRANSCRIPTION_MODEL", "whisper-1")
TTS_CACHE_MAX_ITEMS = get_positive_int("TTS_CACHE_MAX_ITEMS", 64)


def get_runtime_config_summary() -> dict[str, str | bool | None]:
    return {
        "api_key_configured": bool(API_KEY),
        "base_url": BASE_URL,
        "model": MODEL,
        "transcription_model": TRANSCRIPTION_MODEL,
        "tts_cache_max_items": TTS_CACHE_MAX_ITEMS,
    }


def get_client():
    if not API_KEY:
        raise RuntimeError("Missing API_KEY environment variable.")
    from openai import OpenAI

    return OpenAI(api_key=API_KEY, base_url=BASE_URL)


def call_model(messages: list[dict[str, str]]) -> str:
    response = get_client().chat.completions.create(model=MODEL, messages=messages)
    return response.choices[0].message.content.strip()

