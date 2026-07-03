from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
import logging
import os
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .engine import (
    build_report,
    get_practice_options,
    get_question_bank_summary,
    get_runtime_config_summary,
    process_answer,
    start_session,
    synthesize_speech,
    transcribe_audio,
)
from .schemas import (
    AnswerRequest,
    AnswerResponse,
    ReportRequest,
    ReportResponse,
    StartSessionRequest,
    StartSessionResponse,
    TTSRequest,
    TranscriptionResponse,
)

logger = logging.getLogger("examiner_victoria")
FRONTEND_DIST = Path(
    os.getenv(
        "FRONTEND_DIST",
        Path(__file__).resolve().parents[1] / "frontend" / "dist",
    )
)


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if not raw or raw == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_max_audio_upload_bytes() -> int:
    raw = os.getenv("MAX_AUDIO_UPLOAD_MB", "12").strip()
    try:
        megabytes = float(raw)
    except ValueError:
        megabytes = 12
    return max(1, int(megabytes * 1024 * 1024))


def get_rate_limit_per_minute() -> int:
    raw = os.getenv("RATE_LIMIT_PER_MINUTE", "120").strip()
    try:
        return max(0, int(raw))
    except ValueError:
        return 120


def get_positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return default


MAX_AUDIO_UPLOAD_BYTES = get_max_audio_upload_bytes()
RATE_LIMIT_PER_MINUTE = get_rate_limit_per_minute()
RATE_LIMIT_WINDOW_SECONDS = 60
REQUEST_LOG: dict[str, deque[float]] = defaultdict(deque)
MAX_ANSWER_CHARS = get_positive_int_env("MAX_ANSWER_CHARS", 4000)
MAX_SESSION_MESSAGES = get_positive_int_env("MAX_SESSION_MESSAGES", 120)
MAX_TTS_CHARS = get_positive_int_env("MAX_TTS_CHARS", 1200)
TRANSCRIPTION_FAILURE_MESSAGE = (
    "Audio transcription is temporarily unavailable. Please switch to Text or try again."
)
TTS_FAILURE_MESSAGE = "Voice playback is temporarily unavailable. You can continue with text."


def enforce_rate_limit(request: Request) -> None:
    if RATE_LIMIT_PER_MINUTE <= 0:
        return

    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    timestamps = REQUEST_LOG[client_host]
    while timestamps and now - timestamps[0] > RATE_LIMIT_WINDOW_SECONDS:
        timestamps.popleft()

    if len(timestamps) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before trying again.",
        )

    timestamps.append(now)


def enforce_payload_limits(answer: str | None, message_count: int) -> None:
    if answer is not None and len(answer) > MAX_ANSWER_CHARS:
        raise HTTPException(
            status_code=413,
            detail="Your answer is too long for one turn. Please shorten it and try again.",
        )
    if message_count > MAX_SESSION_MESSAGES:
        raise HTTPException(
            status_code=413,
            detail="This session is too large. Please restart the test before continuing.",
        )


app = FastAPI(
    title="Examiner Victoria V2 API",
    version="0.1.0",
    description="Python API backend for the React/iOS-style IELTS speaking coach.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "app": "examiner-victoria-v2",
        "config": get_runtime_config_summary(),
        "limits": {
            "max_audio_upload_mb": round(MAX_AUDIO_UPLOAD_BYTES / 1024 / 1024, 2),
            "rate_limit_per_minute": RATE_LIMIT_PER_MINUTE,
            "max_answer_chars": MAX_ANSWER_CHARS,
            "max_session_messages": MAX_SESSION_MESSAGES,
            "max_tts_chars": MAX_TTS_CHARS,
        },
        "cors_origins": get_cors_origins(),
    }


@app.get("/api/question-bank")
def question_bank() -> dict[str, int]:
    return get_question_bank_summary()


@app.get("/api/practice-options")
def practice_options() -> dict[str, list]:
    return get_practice_options()


@app.post("/api/sessions", response_model=StartSessionResponse)
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


@app.post("/api/answer", response_model=AnswerResponse)
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


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    request: Request,
    file: UploadFile = File(...),
    content_type: str | None = Header(default=None),
) -> TranscriptionResponse:
    enforce_rate_limit(request)
    audio_bytes = await file.read()
    if len(audio_bytes) < 1024:
        raise HTTPException(
            status_code=400,
            detail="Recording is too short or empty. Please tap again and answer in a complete sentence.",
        )
    if len(audio_bytes) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                "Audio file is too large. Please record a shorter answer "
                "or lower the upload limit with MAX_AUDIO_UPLOAD_MB."
            ),
        )
    mime_type = file.content_type or content_type or "audio/wav"
    last_error: Exception | None = None
    started_at = time.perf_counter()
    for attempt in range(2):
        try:
            text = await asyncio.to_thread(transcribe_audio, audio_bytes, mime_type)
            break
        except Exception as error:
            last_error = error
            logger.exception(
                "Audio transcription failed: attempt=%s size=%s mime=%s error=%s",
                attempt + 1,
                len(audio_bytes),
                mime_type,
                error,
            )
            if attempt == 0:
                await asyncio.sleep(0.8)
    else:
        raise HTTPException(status_code=502, detail=TRANSCRIPTION_FAILURE_MESSAGE) from last_error
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    logger.info(
        "Audio transcription completed: size=%s mime=%s elapsed_ms=%s",
        len(audio_bytes),
        mime_type,
        elapsed_ms,
    )
    return TranscriptionResponse(text=text, elapsed_ms=elapsed_ms)


@app.post("/api/tts")
def tts(request_body: TTSRequest, request: Request) -> Response:
    enforce_rate_limit(request)
    text = request_body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) > MAX_TTS_CHARS:
        raise HTTPException(
            status_code=413,
            detail="Voice playback text is too long. Please continue with the visible text.",
        )
    try:
        audio = synthesize_speech(text)
    except Exception as error:
        raise HTTPException(status_code=502, detail=TTS_FAILURE_MESSAGE) from error
    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/report", response_model=ReportResponse)
def report(request_body: ReportRequest, request: Request) -> ReportResponse:
    enforce_rate_limit(request)
    enforce_payload_limits(None, len(request_body.session.messages))
    return ReportResponse(report=build_report(request_body.session))


def frontend_dist_is_available() -> bool:
    return FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists()


if frontend_dist_is_available():
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
