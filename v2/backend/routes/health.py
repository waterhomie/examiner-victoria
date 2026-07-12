from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from ..core import config
from ..audio_services import (
    get_tencent_tts_public_diagnostics,
    normalize_tts_provider_name,
    tts_provider_is_configured,
)
from ..engine import get_practice_options, get_question_bank_summary
from ..schemas import RuntimeDiagnosticsResponse


router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "app": "examiner-victoria-v2",
    }



@router.get("/diagnostics/runtime", response_model=RuntimeDiagnosticsResponse)
def runtime_diagnostics() -> RuntimeDiagnosticsResponse:
    payload = {
        "status": "ok",
        "app": "examiner-victoria-v2",
        "environment": config.get_public_environment_name(),
        "frontend_available": config.frontend_dist_is_available(),
        "llm_configured": bool(config.API_KEY and config.MODEL),
        "stt_configured": bool(config.API_KEY and config.TRANSCRIPTION_MODEL),
        "provider_base_configured": bool(config.BASE_URL),
        "transcription_model_configured": bool(config.TRANSCRIPTION_MODEL),
        "tts_enabled": tts_provider_is_configured(),
        "tts_provider": normalize_tts_provider_name(),
        "tts_configured": tts_provider_is_configured(),
        **get_tencent_tts_public_diagnostics(),
        "tts_max_concurrency": config.TTS_MAX_CONCURRENCY,
        "tts_rate_limit_per_minute": config.TTS_RATE_LIMIT_PER_MINUTE,
        "server_timestamp": datetime.now(timezone.utc).isoformat(),
    }
    payload.update(config.get_build_version_summary())
    return RuntimeDiagnosticsResponse(**payload)


@router.get("/question-bank")
def question_bank() -> dict[str, int]:
    return get_question_bank_summary()


@router.get("/practice-options")
def practice_options() -> dict[str, list]:
    return get_practice_options()
