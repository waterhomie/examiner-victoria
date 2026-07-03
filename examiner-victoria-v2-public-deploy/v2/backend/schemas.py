from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


Role = Literal["assistant", "user", "system"]
PracticeType = Literal["full", "part1", "part2", "part3"]
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

    answer_stats: list[AnswerStats] = Field(default_factory=list)
    candidate_answers: list[CandidateAnswer] = Field(default_factory=list)


class StartSessionRequest(BaseModel):
    practice_mode: bool = True
    practice_type: PracticeType = "full"
    part1_topic: str | None = None
    cue_card_title: str | None = None
    answer_expansion_mode: bool = True
    voice_playback_enabled: bool = True


class StartSessionResponse(BaseModel):
    session: ExamSession


class AnswerRequest(BaseModel):
    session: ExamSession
    answer: str
    source: Literal["text", "audio"] = "text"
    duration: float | None = None


class AnswerResponse(BaseModel):
    session: ExamSession
    assistant_message: ChatMessage
    spoken_text: str
    start_prep_timer: bool = False


class ReportRequest(BaseModel):
    session: ExamSession


class ReportResponse(BaseModel):
    report: str


class TranscriptionResponse(BaseModel):
    text: str
    elapsed_ms: int | None = None


class TTSRequest(BaseModel):
    text: str
