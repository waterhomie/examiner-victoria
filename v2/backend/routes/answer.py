from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException, Request

from ..core.payload_limits import enforce_payload_limits
from ..core.rate_limit import enforce_rate_limit
from ..engine import process_answer
from ..schemas import AnswerRequest, AnswerResponse


router = APIRouter(prefix="/api", tags=["answer"])
logger = logging.getLogger("examiner_victoria")


@router.post("/answer", response_model=AnswerResponse)
def answer_question(request_body: AnswerRequest, request: Request) -> AnswerResponse:
    enforce_rate_limit(request)
    answer = request_body.answer.strip()
    enforce_payload_limits(answer, len(request_body.session.messages))
    if not answer:
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")
    started_at = time.perf_counter()
    session, assistant_message, spoken_text, start_prep_timer = process_answer(
        request_body.session,
        answer,
        source=request_body.source,
        duration=request_body.duration,
    )
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    logger.info(
        "Answer processed: phase=%s source=%s llm_duration_ms=%s total_duration_ms=%s messages=%s",
        request_body.session.phase,
        request_body.source,
        elapsed_ms,
        elapsed_ms,
        len(session.messages),
    )
    return AnswerResponse(
        session=session,
        assistant_message=assistant_message,
        spoken_text=spoken_text,
        start_prep_timer=start_prep_timer,
        llm_duration_ms=elapsed_ms,
        total_duration_ms=elapsed_ms,
    )
