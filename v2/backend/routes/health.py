from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from ..core import config
from ..engine import get_practice_options, get_question_bank_summary


router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "app": "examiner-victoria-v2",
    }



@router.get("/diagnostics/runtime")
def runtime_diagnostics() -> dict[str, object]:
    return {
        "status": "ok",
        "app": "examiner-victoria-v2",
        "app_version": "0.1.0",
        "environment": config.get_public_environment_name(),
        "frontend_available": config.frontend_dist_is_available(),
        "llm_configured": bool(config.API_KEY and config.MODEL),
        "stt_configured": bool(config.API_KEY and config.TRANSCRIPTION_MODEL),
        "provider_base_configured": bool(config.BASE_URL),
        "transcription_model_configured": bool(config.TRANSCRIPTION_MODEL),
        "tts_enabled": True,
        "server_timestamp": datetime.now(timezone.utc).isoformat(),
    }
@router.get("/question-bank")
def question_bank() -> dict[str, int]:
    return get_question_bank_summary()


@router.get("/practice-options")
def practice_options() -> dict[str, list]:
    return get_practice_options()
