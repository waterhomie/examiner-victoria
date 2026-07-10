from __future__ import annotations

from fastapi import APIRouter

from ..core import config
from ..engine import get_practice_options, get_question_bank_summary


router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "app": "examiner-victoria-v2",
        "config": config.get_runtime_config_summary(),
        "limits": config.get_runtime_limits_summary(),
        "cors_origins": config.get_cors_origins(),
    }


@router.get("/question-bank")
def question_bank() -> dict[str, int]:
    return get_question_bank_summary()


@router.get("/practice-options")
def practice_options() -> dict[str, list]:
    return get_practice_options()
