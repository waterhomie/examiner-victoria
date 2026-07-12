from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]
FRONTEND_DIST = Path(
    os.getenv(
        "FRONTEND_DIST",
        Path(__file__).resolve().parents[2] / "frontend" / "dist",
    )
)


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


def get_int(name: str, default: int) -> int:
    raw = get_secret(name, str(default))
    try:
        return int(str(raw).strip())
    except (TypeError, ValueError):
        return default


def get_rate_limit_per_minute() -> int:
    raw = get_secret("RATE_LIMIT_PER_MINUTE", "120")
    try:
        return max(0, int(str(raw).strip()))
    except (TypeError, ValueError):
        return 120


def get_max_audio_upload_bytes() -> int:
    raw = get_secret("MAX_AUDIO_UPLOAD_MB", "12")
    try:
        megabytes = float(str(raw).strip())
    except (TypeError, ValueError):
        megabytes = 12
    return max(1, int(megabytes * 1024 * 1024))


def get_cors_origins() -> list[str]:
    raw = (get_secret("CORS_ORIGINS", "*") or "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


API_KEY = get_secret("API_KEY")
BASE_URL = get_secret("BASE_URL", "https://api.gptsapi.net/v1")
MODEL = get_secret("MODEL", "gpt-5.4-mini")
TRANSCRIPTION_MODEL = get_secret("TRANSCRIPTION_MODEL", "whisper-1")
TTS_CACHE_MAX_ITEMS = get_positive_int("TTS_CACHE_MAX_ITEMS", 64)
TTS_PROVIDER = (get_secret("TTS_PROVIDER", "disabled") or "disabled").strip().lower()
TENCENTCLOUD_SECRET_ID = (get_secret("TENCENTCLOUD_SECRET_ID", "") or "").strip()
TENCENTCLOUD_SECRET_KEY = (get_secret("TENCENTCLOUD_SECRET_KEY", "") or "").strip()
TENCENT_TTS_REGION = (get_secret("TENCENT_TTS_REGION", "ap-shanghai") or "").strip()
TENCENT_TTS_VOICE_TYPE = (get_secret("TENCENT_TTS_VOICE_TYPE", "") or "").strip()
TENCENT_TTS_CODEC = (get_secret("TENCENT_TTS_CODEC", "mp3") or "mp3").strip().lower()
TENCENT_TTS_SAMPLE_RATE = get_positive_int("TENCENT_TTS_SAMPLE_RATE", 16000)
TENCENT_TTS_SPEED = get_int("TENCENT_TTS_SPEED", 0)
TENCENT_TTS_VOLUME = get_int("TENCENT_TTS_VOLUME", 0)
TTS_MAX_TEXT_CHARS = get_positive_int("TTS_MAX_TEXT_CHARS", 300)
TENCENT_TTS_MAX_TEXT_CHARS = get_positive_int("TENCENT_TTS_MAX_TEXT_CHARS", TTS_MAX_TEXT_CHARS)
TTS_MAX_CONCURRENCY = get_positive_int("TTS_MAX_CONCURRENCY", 3)
TTS_MAX_CONCURRENCY_PER_SESSION = get_positive_int("TTS_MAX_CONCURRENCY_PER_SESSION", 1)
TTS_RATE_LIMIT_PER_MINUTE = get_positive_int("TTS_RATE_LIMIT_PER_MINUTE", 3)
TTS_QUEUE_TIMEOUT_SECONDS = get_positive_int("TTS_QUEUE_TIMEOUT_SECONDS", 3)
MAX_AUDIO_UPLOAD_BYTES = get_max_audio_upload_bytes()
RATE_LIMIT_PER_MINUTE = get_rate_limit_per_minute()
MAX_ANSWER_CHARS = get_positive_int("MAX_ANSWER_CHARS", 4000)
MAX_SESSION_MESSAGES = get_positive_int("MAX_SESSION_MESSAGES", 120)
MAX_TTS_CHARS = get_positive_int("MAX_TTS_CHARS", TTS_MAX_TEXT_CHARS)
TTS_TIMEOUT_SECONDS = get_positive_int("TTS_TIMEOUT_SECONDS", 10)
TELEMETRY_MAX_EVENTS = get_positive_int("TELEMETRY_MAX_EVENTS", 500)
ADMIN_TOKEN = get_secret("ADMIN_TOKEN", "")

def get_public_environment_name() -> str:
    raw = get_secret("APP_ENV") or get_secret("ENVIRONMENT") or get_secret("RAILWAY_ENVIRONMENT") or "development"
    value = str(raw).strip() or "development"
    safe = "".join(ch for ch in value if ch.isalnum() or ch in {"-", "_"})
    return safe[:40] or "development"


def get_public_build_metadata_value(name: str, default: str = "unknown") -> str:
    """Return one explicitly public build value without exposing arbitrary environment data."""
    raw = os.getenv(name)
    if raw is None:
        return default
    value = str(raw).strip()
    if not value:
        return default
    safe_characters = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:/+")
    if len(value) > 120 or any(character not in safe_characters for character in value):
        return default
    return value


def get_build_version_summary() -> dict[str, str]:
    git_sha = get_public_build_metadata_value("APP_GIT_SHA")
    return {
        "git_sha": git_sha,
        "git_sha_short": git_sha[:7] if git_sha != "unknown" else "unknown",
        "build_time": get_public_build_metadata_value("APP_BUILD_TIME"),
        "deploy_target": get_public_build_metadata_value("APP_DEPLOY_TARGET"),
        "app_version": get_public_build_metadata_value("APP_VERSION"),
        "source_branch": get_public_build_metadata_value("APP_SOURCE_BRANCH"),
    }


def frontend_dist_is_available() -> bool:
    return FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists()


def get_runtime_config_summary() -> dict[str, str | bool | None | int]:
    return {
        "api_key_configured": bool(API_KEY),
        "base_url": BASE_URL,
        "model": MODEL,
        "transcription_model": TRANSCRIPTION_MODEL,
        "tts_cache_max_items": TTS_CACHE_MAX_ITEMS,
        "admin_token_configured": bool(ADMIN_TOKEN),
        "telemetry_max_events": TELEMETRY_MAX_EVENTS,
    }


def get_runtime_limits_summary() -> dict[str, int | float]:
    return {
        "max_audio_upload_mb": round(MAX_AUDIO_UPLOAD_BYTES / 1024 / 1024, 2),
        "rate_limit_per_minute": RATE_LIMIT_PER_MINUTE,
        "max_answer_chars": MAX_ANSWER_CHARS,
        "max_session_messages": MAX_SESSION_MESSAGES,
        "max_tts_chars": TTS_MAX_TEXT_CHARS,
    }
