from __future__ import annotations

from fastapi import APIRouter, Request

from ..core.rate_limit import enforce_rate_limit
from ..engine import start_session
from ..schemas import StartSessionRequest, StartSessionResponse


router = APIRouter(prefix="/api", tags=["sessions"])


@router.post("/sessions", response_model=StartSessionResponse)
def create_session(request_body: StartSessionRequest, request: Request) -> StartSessionResponse:
    enforce_rate_limit(request)
    session = start_session(
        practice_mode=request_body.practice_mode,
        practice_type=request_body.practice_type,
        part1_topic=request_body.part1_topic,
        cue_card_title=request_body.cue_card_title,
        answer_expansion_mode=request_body.answer_expansion_mode,
        voice_playback_enabled=request_body.voice_playback_enabled,
    )
    return StartSessionResponse(session=session)
