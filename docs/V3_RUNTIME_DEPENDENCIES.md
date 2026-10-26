# Examiner Victoria V3 运行时依赖清单

> **当前专项参考。** 整体版本、部署与发布状态以 [V3 Current Status](V3_CURRENT_STATUS.md) 为准。

本文基于当前仓库代码和示例配置记录运行时依赖名称，不记录真实值或 Secret。

## 前端 API 入口

- 前端 API base 由 `VITE_API_BASE` 控制。
- 为空时默认同源请求 `/api/*`。
- 本地 Vite 代理目标由 `VITE_PROXY_TARGET` 控制，示例为 `http://127.0.0.1:8010`。
- 生产 Dockerfile 设置 `VITE_API_BASE=""`，倾向于由同一 FastAPI 服务承载前端和 API。

## 后端 API 路由

核心运行时路由包括：

- `GET /api/health`
- `GET /api/diagnostics/runtime`
- `GET /api/question-bank`
- `GET /api/practice-options`
- `POST /api/sessions`
- `POST /api/answer`
- `POST /api/transcribe`
- `POST /api/tts`
- `POST /api/report`
- `POST /api/telemetry`
- `GET /api/telemetry/summary`

## LLM provider 配置名

- `API_KEY`
- `BASE_URL`
- `MODEL`

代码位置：`backend/core/config.py`、`backend/ai_provider.py`。

示例文档中出现的默认 OpenAI-compatible base URL 为 `https://api.gptsapi.net/v1`。这只是示例/默认值，不代表已经完成国内可访问性或价格核验。

## STT provider 配置名

- `API_KEY`
- `BASE_URL`
- `TRANSCRIPTION_MODEL`
- `MAX_AUDIO_UPLOAD_MB`

代码位置：`backend/audio_services.py`、`backend/routes/audio.py`。

STT 服务端路径使用 OpenAI-compatible client 的 audio transcriptions 能力。浏览器原生 speech recognition 只是前端加速路径，必须保留服务端转写 fallback。

## TTS 外部依赖

- 后端使用 TTS provider adapter；CloudBase 生产路径使用腾讯云官方 Python SDK 3.0 `TextToVoice`。
- `gTTS` 仍保留为显式本地 provider，不作为 CloudBase 默认 provider。
- `MAX_TTS_CHARS` 控制单次 TTS 文本长度。
- `TTS_CACHE_MAX_ITEMS` 控制内存 TTS cache 数量。
- TTS 失败时应允许用户继续查看文字内容。
- gTTS 在国内 CloudBase 出网链路中存在可达性和延迟风险；TTS 失败不得阻断已经生成的文字反馈和下一题。

## 部署入口定位

当前 Docker 运行入口为 `backend.app:app`，前端生产构建目录为 `frontend/dist`，当前 PowerShell 工具位于顶层 `scripts/`。题库数据由 `backend/question_bank/` package 承载，后端不再为根题库模块修改 `sys.path`；根 `validate_question_bank.py` 保留为稳定验证入口。`v2/` 只保留冻结历史证据，计划内结构迁移已完成。

当前国内 V3 Beta 入口为 CloudBase Run；原 V2 Railway 地址是冻结基线和回滚参考，V3 Railway Beta 是海外测试基线。Railway 不是当前国内 V3 主入口。

兼容部署文件仍保留：

- `Dockerfile`
- `railway.json`

本文档只记录运行依赖，不代表已修改 Railway 或 CloudBase 控制台配置。

## 外部 CDN

当前代码审计未发现前端运行时必须加载 Google Fonts、jsDelivr、GitHub CDN 或其他外部 CDN。前端资源随 Vite build 产物由 FastAPI/部署服务托管。

## 其他运行时配置名

- `CORS_ORIGINS`
- `RATE_LIMIT_PER_MINUTE`
- `MAX_ANSWER_CHARS`
- `MAX_SESSION_MESSAGES`
- `ADMIN_TOKEN`
- `TELEMETRY_MAX_EVENTS`
- `FRONTEND_DIST`
- `APP_ENV`
- `ENVIRONMENT`
- `RAILWAY_ENVIRONMENT`

## 不记录的内容

本文不记录真实 API Key、Admin Token、Cookie、provider 密钥、真实 `.env` 值、用户音频、用户回答、转写文本、报告内容或任何私人反馈数据。

## V3 TTS Provider 配置

- OpenAI-compatible 路径复用现有 `API_KEY` 与 `BASE_URL`：`TTS_PROVIDER=openai_compatible`。
- 腾讯云 TTS 继续保留为回滚路径：`TTS_PROVIDER=tencent`。
- gTTS 仅作为显式本地 provider：`TTS_PROVIDER=gtts`。
- 未配置 `TTS_PROVIDER` 时后端默认为 `disabled`，并保留文字降级；CloudBase 不得默认回退到 gTTS。
- gTTS 在国内 CloudBase 出网链路中存在可达性和延迟风险。
- TTS 失败不得影响已完成的 STT、LLM、文字反馈、下一题或 session state。
- TTS admission 具备全局并发、单 session 并发、单 session 限流和有界排队超时，不自动重试。
- Tencent Cloud TTS 使用官方 Python SDK 3.0 `TextToVoice` API；自动化测试仍只使用 mock。
- OpenAI-compatible TTS 使用 Audio Speech API；自动化测试使用二进制 mock，不产生真实调用费用。
- `VoiceType` 应先通过腾讯云控制台或 API Explorer 验证，再录入 CloudBase 环境变量。

Runtime variable names:

- `TTS_PROVIDER`
- `TTS_MODEL`
- `TTS_VOICE`
- `TTS_RESPONSE_FORMAT`
- `TTS_SPEED`
- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`
- `TENCENT_TTS_REGION`
- `TENCENT_TTS_VOICE_TYPE`
- `TENCENT_TTS_CODEC`
- `TENCENT_TTS_SAMPLE_RATE`
- `TENCENT_TTS_SPEED`
- `TENCENT_TTS_VOLUME`
- `TENCENT_TTS_MAX_TEXT_CHARS`
- `TTS_MAX_TEXT_CHARS`
- `TTS_MAX_CONCURRENCY`
- `TTS_MAX_CONCURRENCY_PER_SESSION`
- `TTS_RATE_LIMIT_PER_MINUTE`
- `TTS_QUEUE_TIMEOUT_SECONDS`
- `TTS_TIMEOUT_SECONDS`

Do not place Tencent Cloud credentials in GitHub, frontend `VITE_` variables, README, logs, or screenshots.

OpenAI-compatible example (non-secret values only):

```text
TTS_PROVIDER=openai_compatible
TTS_MODEL=tts-1
TTS_VOICE=nova
TTS_RESPONSE_FORMAT=mp3
TTS_SPEED=1.0
```

This provider uses the existing server-side `API_KEY` and `BASE_URL`. Never add either value to frontend variables, logs, screenshots, or committed files. Provider model visibility does not by itself prove successful synthesis; perform one explicitly authorized minimal real call before switching production traffic.

## CloudBase 已验证配置与结果（2026-07-13）

以下仅记录非敏感值和凭证变量名称：

```text
TTS_PROVIDER=tencent
TENCENT_TTS_REGION=ap-shanghai
TENCENT_TTS_VOICE_TYPE=501009
TENCENT_TTS_CODEC=mp3
TENCENT_TTS_SAMPLE_RATE=16000
TENCENT_TTS_SPEED=0
TENCENT_TTS_VOLUME=0
```

`TextToVoice` 请求使用 `PrimaryLanguage=2`、`ModelType=1`、`VoiceType=501009`、`SampleRate=16000`、`Codec=mp3`，与已成功的 API Explorer 参数一致。

凭证使用腾讯云低权限子用户的 `TENCENTCLOUD_SECRET_ID` 与 `TENCENTCLOUD_SECRET_KEY`。真实值只录入 CloudBase 版本环境变量，不进入 Git、前端变量、日志、截图或文档。子用户遵循最小权限原则，只授予 TTS 调用所需权限；具体策略名称和范围以腾讯云控制台当前配置及官方资料为准。

手机端连续完成两轮 CloudBase 真实流程；两轮中的 `POST /api/transcribe`、`POST /api/answer`、`POST /api/tts` 均返回 `200 OK`。此前的 `/api/tts` `502` 与 “Voice is temporarily unavailable” 已不再出现。原有文字降级仍保留，用于未来超时、额度、权限或网络异常。

本结果证明当前配置在本次手机端连续两轮测试中可用，不等同于高并发、长期稳定性、全部浏览器或成本上限验证。
