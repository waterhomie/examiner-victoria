from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
import logging
from threading import BoundedSemaphore, Lock
import time

from fastapi import APIRouter, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import Response

from ..core import config
from ..audio_services import (
    TTSProviderError,
    get_safe_tts_error_log_fields,
    get_tencent_tts_public_diagnostics,
    normalize_tts_provider_name,
)
from ..core.rate_limit import enforce_rate_limit
from ..engine import synthesize_speech, transcribe_audio
from ..schemas import TTSRequest, TranscriptionResponse


logger = logging.getLogger("examiner_victoria")
router = APIRouter(prefix="/api", tags=["audio"])
TTS_EXECUTOR = ThreadPoolExecutor(
    max_workers=config.TTS_MAX_CONCURRENCY,
    thread_name_prefix="victoria-tts",
)
TTS_GLOBAL_SEMAPHORE = BoundedSemaphore(config.TTS_MAX_CONCURRENCY)
TTS_SESSION_SEMAPHORES: dict[str, BoundedSemaphore] = {}
TTS_RATE_LIMIT_LOG: defaultdict[str, deque[float]] = defaultdict(deque)
TTS_ADMISSION_LOCK = Lock()

TRANSCRIPTION_FAILURE_MESSAGE = (
    "Audio transcription is temporarily unavailable. Please switch to Text or try again."
)
TTS_USER_FALLBACK_MESSAGE = "Voice is temporarily unavailable. Continue with the text shown above."


def _log_tts_failure(error: Exception, duration_ms: int) -> None:
    error_fields = get_safe_tts_error_log_fields(error)
    tts_fields = get_tencent_tts_public_diagnostics()
    logger.warning(
        "TTS synthesis failed: error_code=%s error_message=%s request_id=%s "
        "provider=%s tts_duration_ms=%s voice_type=%s region=%s codec=%s sample_rate=%s",
        error_fields["error_code"],
        error_fields["error_message"],
        error_fields["request_id"],
        normalize_tts_provider_name(),
        duration_ms,
        tts_fields["tts_voice_type"],
        tts_fields["tts_region"],
        tts_fields["tts_codec"],
        tts_fields["tts_sample_rate"],
    )


def _reset_tts_admission_state_for_tests() -> None:
    global TTS_GLOBAL_SEMAPHORE
    with TTS_ADMISSION_LOCK:
        TTS_GLOBAL_SEMAPHORE = BoundedSemaphore(config.TTS_MAX_CONCURRENCY)
        TTS_SESSION_SEMAPHORES.clear()
        TTS_RATE_LIMIT_LOG.clear()


def _safe_tts_session_key(request_body: TTSRequest, request: Request) -> str:
    raw_session = request_body.session_id or request.headers.get("x-session-id") or ""
    safe_session = "".join(ch for ch in str(raw_session) if ch.isalnum() or ch in {"-", "_", ":"})
    if safe_session:
        return safe_session[:80]
    client_host = request.client.host if request.client else "unknown"
    safe_host = "".join(ch for ch in str(client_host) if ch.isalnum() or ch in {"-", "_", ":", "."})
    return f"client:{safe_host[:80] or 'unknown'}"


def _session_rate_limited_locked(session_key: str) -> bool:
    limit = config.TTS_RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return False
    now = time.monotonic()
    events = TTS_RATE_LIMIT_LOG[session_key]
    while events and now - events[0] >= 60:
        events.popleft()
    if len(events) >= limit:
        return True
    events.append(now)
    return False


async def _acquire_tts_admission(session_key: str) -> tuple[BoundedSemaphore | None, BoundedSemaphore | None, str]:
    with TTS_ADMISSION_LOCK:
        if _session_rate_limited_locked(session_key):
            return None, None, "rate_limited"
        session_semaphore = TTS_SESSION_SEMAPHORES.get(session_key)
        if session_semaphore is None:
            session_semaphore = BoundedSemaphore(config.TTS_MAX_CONCURRENCY_PER_SESSION)
            TTS_SESSION_SEMAPHORES[session_key] = session_semaphore
        if not session_semaphore.acquire(blocking=False):
            return None, None, "session_busy"
        global_semaphore = TTS_GLOBAL_SEMAPHORE

    global_acquired = await asyncio.to_thread(
        global_semaphore.acquire,
        True,
        config.TTS_QUEUE_TIMEOUT_SECONDS,
    )
    if not global_acquired:
        session_semaphore.release()
        return None, None, "queue_timeout"
    return global_semaphore, session_semaphore, ""


def _run_tts_with_admission_release(
    text: str,
    global_semaphore: BoundedSemaphore,
    session_semaphore: BoundedSemaphore,
):
    try:
        return synthesize_speech(text)
    finally:
        try:
            global_semaphore.release()
        except ValueError:
            logger.warning("TTS global semaphore release skipped: already released")
        try:
            session_semaphore.release()
        except ValueError:
            logger.warning("TTS session semaphore release skipped: already released")


@router.post("/transcribe", response_model=TranscriptionResponse)
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
    if len(audio_bytes) > config.MAX_AUDIO_UPLOAD_BYTES:
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
        "Audio transcription completed: size=%s mime=%s stt_duration_ms=%s",
        len(audio_bytes),
        mime_type,
        elapsed_ms,
    )
    return TranscriptionResponse(text=text, elapsed_ms=elapsed_ms, stt_duration_ms=elapsed_ms)


@router.post("/tts")
async def tts(request_body: TTSRequest, request: Request) -> Response:
    enforce_rate_limit(request)
    text = request_body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) > config.TTS_MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=413,
            detail="Voice playback text is too long. Please continue with the visible text.",
        )

    started_at = time.perf_counter()
    session_key = _safe_tts_session_key(request_body, request)
    global_semaphore, session_semaphore, admission_reason = await _acquire_tts_admission(session_key)
    if session_semaphore is None or global_semaphore is None:
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        admission_error = TTSProviderError(
            "TTS admission rejected",
            error_code=f"TTS_ADMISSION_{admission_reason.upper()}",
        )
        _log_tts_failure(admission_error, elapsed_ms)
        status_code = 429 if admission_reason in {"rate_limited", "session_busy"} else 503
        raise HTTPException(status_code=status_code, detail=TTS_USER_FALLBACK_MESSAGE)

    try:
        loop = asyncio.get_running_loop()
        future = loop.run_in_executor(
            TTS_EXECUTOR,
            _run_tts_with_admission_release,
            text,
            global_semaphore,
            session_semaphore,
        )
        result = await asyncio.wait_for(future, timeout=config.TTS_TIMEOUT_SECONDS)
    except TimeoutError as error:
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        timeout_error = TTSProviderError(
            "TTS request timed out",
            error_code="TTS_TIMEOUT",
        )
        _log_tts_failure(timeout_error, elapsed_ms)
        raise HTTPException(status_code=504, detail=TTS_USER_FALLBACK_MESSAGE) from error
    except Exception as error:
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        _log_tts_failure(error, elapsed_ms)
        raise HTTPException(status_code=502, detail=TTS_USER_FALLBACK_MESSAGE) from error
    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    tts_fields = get_tencent_tts_public_diagnostics()
    logger.info(
        "TTS synthesis completed: provider=%s tts_duration_ms=%s request_id=%s "
        "voice_type=%s region=%s codec=%s sample_rate=%s",
        result.provider,
        elapsed_ms,
        result.request_id or "",
        tts_fields["tts_voice_type"],
        tts_fields["tts_region"],
        tts_fields["tts_codec"],
        tts_fields["tts_sample_rate"],
    )
    return Response(
        content=result.audio,
        media_type=result.content_type,
        headers={"X-TTS-Duration-Ms": str(elapsed_ms)},
    )
