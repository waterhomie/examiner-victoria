from __future__ import annotations

from fastapi import APIRouter, Request

from ..core.payload_limits import enforce_payload_limits
from ..core.rate_limit import enforce_rate_limit
from ..engine import build_report
from ..schemas import ReportRequest, ReportResponse


router = APIRouter(prefix="/api", tags=["report"])


@router.post("/report", response_model=ReportResponse)
def report(request_body: ReportRequest, request: Request) -> ReportResponse:
    enforce_rate_limit(request)
    enforce_payload_limits(None, len(request_body.session.messages))
    return ReportResponse(report=build_report(request_body.session))
