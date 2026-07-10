from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..core.payload_limits import enforce_payload_limits
from ..core.rate_limit import enforce_rate_limit
from ..engine import process_answer
from ..schemas import AnswerRequest, AnswerResponse


router = APIRouter(prefix="/api", tags=["answer"])


@router.post("/answer", response_model=AnswerResponse)
def answer_question(request_body: AnswerRequest, request: Request) -> AnswerResponse:
    enforce_rate_limit(request)
    answer = request_body.answer.strip()
    enforce_payload_limits(answer, len(request_body.session.messages))
    if not answer:
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")
    session, assistant_message, spoken_text, start_prep_timer = process_answer(
        request_body.session,
        answer,
        source=request_body.source,
        duration=request_body.duration,
    )
    return AnswerResponse(
        session=session,
        assistant_message=assistant_message,
        spoken_text=spoken_text,
        start_prep_timer=start_prep_timer,
    )
