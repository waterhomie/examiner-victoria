from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, Response

from ..core import config
from ..schemas import TelemetryEvent
from ..telemetry_service import get_telemetry_summary, record_telemetry_event


router = APIRouter(prefix="/api", tags=["telemetry"])


def require_admin_token(
    x_admin_token: str | None = Header(default=None),
    token: str | None = None,
) -> None:
    if not config.ADMIN_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Telemetry summary is disabled until ADMIN_TOKEN is configured.",
        )
    supplied_token = x_admin_token or token
    if supplied_token != config.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token.")


@router.post("/telemetry", status_code=204)
def telemetry(request_body: TelemetryEvent, request: Request) -> Response:
    record_telemetry_event(
        request_body.event,
        request_body.details,
        client_host=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", ""),
    )
    return Response(status_code=204)


@router.get("/telemetry/summary")
def telemetry_summary(
    token: str | None = None,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, object]:
    require_admin_token(x_admin_token=x_admin_token, token=token)
    return get_telemetry_summary()
