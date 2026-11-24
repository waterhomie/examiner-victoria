from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


Role = Literal["assistant", "user", "system"]
PracticeType = Literal["full", "part1", "part2", "part3"]
QuestionSource = Literal["bank", "dynamic", "fallback"]
FeedbackAdaptation = Literal["standard", "adaptive"]
SupportState = Literal["unknown", "guided", "balanced", "refinement"]
EvidenceState = Literal["guided", "balanced", "refinement"]
SupportReason = Literal["basic_language", "clear_language", "precise_language"]
SUPPORT_WINDOW = 5


class SupportObservation(BaseModel):
    state: EvidenceState
    reason: SupportReason
    answer_index: int = Field(ge=1, le=10000)
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")


class LearnerSupportProfile(BaseModel):
    version: Literal[1] = 1
    state: SupportState = "unknown"
    observations: list[SupportObservation] = Field(default_factory=list, max_length=SUPPORT_WINDOW)
    pending_state: EvidenceState | None = None
    pending_count: int = Field(default=0, ge=0, le=1)
    last_processed_answer_index: int = Field(default=0, ge=0, le=10000)
    notice_shown: bool = False


Phase = Literal[
    "identity",
    "part1",
    "part2_long",
    "part2_followup",
    "part3",
    "complete",
]


class ChatMessage(BaseModel):
    role: Role
    content: str
    phase: Phase | None = None
    adaptation_notice: bool = False


class AnswerStats(BaseModel):
    phase: Phase
    source: Literal["text", "audio"] = "text"
    duration: float | None = None
    word_count: int = 0
    words_per_minute: float | None = None


class CandidateAnswer(BaseModel):
    phase: Phase
    question: str
    answer: str
    source: Literal["text", "audio"] = "text"
    duration: float | None = None


class ExamSession(BaseModel):
    session_id: str
    phase: Phase = "identity"
    messages: list[ChatMessage] = Field(default_factory=list)
    current_question: str = ""
    test_active: bool = True

    practice_mode: bool = True
    practice_type: PracticeType = "full"
    answer_expansion_mode: bool = True
    voice_playback_enabled: bool = True
    speak_full_reply: bool = False
    feedback_adaptation: FeedbackAdaptation = "standard"
    learner_support_profile: LearnerSupportProfile = Field(default_factory=LearnerSupportProfile)

    part1_index: int = 0
    part1_topic: str = ""
    part1_secondary_questions: list[str] = Field(default_factory=list)
    part1_queue: list[str] = Field(default_factory=list)

    part2_words: int = 0
    part2_duration: float = 0.0
    part2_audio_used: bool = False
    part2_extension_used: bool = False
    part2_answers: list[str] = Field(default_factory=list)
    cue_card: dict[str, Any] = Field(default_factory=dict)

    part3_index: int = 0
    part3_target_count: int = 6
    part3_questions: list[str] = Field(default_factory=list)
    part3_history: list[dict[str, str]] = Field(default_factory=list)
    part3_question_sources: list[QuestionSource] = Field(default_factory=list)
    part3_consecutive_dynamic: int = 0

    answer_stats: list[AnswerStats] = Field(default_factory=list)
    candidate_answers: list[CandidateAnswer] = Field(default_factory=list)


class StartSessionRequest(BaseModel):
    practice_mode: bool = True
    practice_type: PracticeType = "full"
    part1_topic: str | None = None
    cue_card_title: str | None = None
    answer_expansion_mode: bool = True
    voice_playback_enabled: bool = True
    feedback_adaptation: FeedbackAdaptation = "standard"


class StartSessionResponse(BaseModel):
    session: ExamSession


class AnswerRequest(BaseModel):
    session: ExamSession
    answer: str
    source: Literal["text", "audio"] = "text"
    duration: float | None = None


class AnswerCorrection(BaseModel):
    sentence: str
    quote: str | None = None
    replacement: str | None = None
    quote_in_answer: bool = False


class AnswerEdit(BaseModel):
    op: Literal["equal", "delete", "insert", "replace"]
    text: str
    replacement: str | None = None


class AnswerHesitation(BaseModel):
    kind: Literal["filler", "repeat"]
    text: str
    word_index: int


class AnswerFeedback(BaseModel):
    """V4 structured view of the per-answer feedback (UI only, no new model call)."""

    mode: Literal["practice", "mock"] = "practice"
    coaching: bool = False
    available: bool = False
    kind: str | None = None
    correction: AnswerCorrection | None = None
    tip: str | None = None
    natural_version: str | None = None
    edits: list[AnswerEdit] = Field(default_factory=list)
    hesitations: list[AnswerHesitation] = Field(default_factory=list)
    hesitation_count: int = 0
    word_count: int = 0
    duration: float | None = None
    words_per_minute: float | None = None
    pace: Literal["slow", "good", "fast"] | None = None


class AnswerResponse(BaseModel):
    session: ExamSession
    assistant_message: ChatMessage
    spoken_text: str
    # V4: structured feedback for the review screen. ``assistant_message`` is
    # kept for backward compatibility and remains the canonical text.
    feedback: AnswerFeedback | None = None
    # V4: the question the candidate just answered (for review headers).
    answered_question: str | None = None
    answered_phase: str | None = None
    start_prep_timer: bool = False
    llm_duration_ms: int | None = None
    total_duration_ms: int | None = None


class ReportRequest(BaseModel):
    session: ExamSession


class ReportResponse(BaseModel):
    report: str


class TranscriptionResponse(BaseModel):
    text: str
    elapsed_ms: int | None = None
    stt_duration_ms: int | None = None


class TTSRequest(BaseModel):
    text: str
    session_id: str | None = None


class RuntimeDiagnosticsResponse(BaseModel):
    status: str
    app: str
    app_version: str
    git_sha: str
    git_sha_short: str
    build_time: str
    deploy_target: str
    source_branch: str
    environment: str
    frontend_available: bool
    llm_configured: bool
    stt_configured: bool
    provider_base_configured: bool
    transcription_model_configured: bool
    tts_enabled: bool
    tts_provider: str
    tts_configured: bool
    tts_model: str
    tts_voice: str
    tts_format: str
    tts_speed: float
    tts_region: str
    tts_voice_type: str
    tts_codec: str
    tts_sample_rate: int
    tts_model_type: int
    tts_max_concurrency: int
    tts_rate_limit_per_minute: int
    server_timestamp: str


class TelemetryEvent(BaseModel):
    event: str = Field(min_length=1, max_length=80)
    details: dict[str, Any] = Field(default_factory=dict)
