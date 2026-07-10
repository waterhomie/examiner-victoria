from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .core import config
from .core.payload_limits import enforce_payload_limits
from .core.rate_limit import REQUEST_LOG, enforce_rate_limit
from .routes import answer, audio, health, report, sessions, telemetry


FRONTEND_DIST = config.FRONTEND_DIST
MAX_AUDIO_UPLOAD_BYTES = config.MAX_AUDIO_UPLOAD_BYTES
RATE_LIMIT_PER_MINUTE = config.RATE_LIMIT_PER_MINUTE
MAX_ANSWER_CHARS = config.MAX_ANSWER_CHARS
MAX_SESSION_MESSAGES = config.MAX_SESSION_MESSAGES
MAX_TTS_CHARS = config.MAX_TTS_CHARS
get_cors_origins = config.get_cors_origins


def frontend_dist_is_available() -> bool:
    return FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists()


def configure_frontend(app: FastAPI) -> None:
    if not frontend_dist_is_available():
        return

    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found.")
        requested_path = (FRONTEND_DIST / full_path).resolve()
        dist_root = FRONTEND_DIST.resolve()
        if requested_path.is_file() and dist_root in requested_path.parents:
            return FileResponse(requested_path)
        return FileResponse(FRONTEND_DIST / "index.html")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Examiner Victoria V2 API",
        version="0.1.0",
        description="Python API backend for the React/iOS-style IELTS speaking coach.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.get_cors_origins(),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(sessions.router)
    app.include_router(answer.router)
    app.include_router(audio.router)
    app.include_router(report.router)
    app.include_router(telemetry.router)
    configure_frontend(app)
    return app


app = create_app()
