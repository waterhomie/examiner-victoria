# Examiner Victoria V3 运行时依赖清单

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

代码位置：`v2/backend/core/config.py`、`v2/backend/ai_provider.py`。

示例文档中出现的默认 OpenAI-compatible base URL 为 `https://api.gptsapi.net/v1`。这只是示例/默认值，不代表已经完成国内可访问性或价格核验。

## STT provider 配置名

- `API_KEY`
- `BASE_URL`
- `TRANSCRIPTION_MODEL`
- `MAX_AUDIO_UPLOAD_MB`

代码位置：`v2/backend/audio_services.py`、`v2/backend/routes/audio.py`。

STT 服务端路径使用 OpenAI-compatible client 的 audio transcriptions 能力。浏览器原生 speech recognition 只是前端加速路径，必须保留服务端转写 fallback。

## TTS 外部依赖

- 后端依赖 `gTTS`，见 `v2/backend/requirements.txt` 和 `v2/backend/audio_services.py`。
- `MAX_TTS_CHARS` 控制单次 TTS 文本长度。
- `TTS_CACHE_MAX_ITEMS` 控制内存 TTS cache 数量。
- TTS 失败时应允许用户继续查看文字内容。
- gTTS 在国内 CloudBase 出网链路中存在可达性和延迟风险；TTS 失败不得阻断已经生成的文字反馈和下一题。

## Railway 入口

当前 V2 生产示例入口记录在 README 和 V3 文档中：`https://examiner-victoria-v2-production.up.railway.app`。

部署配置文件：

- `Dockerfile`
- `railway.json`

本轮未修改 Railway 配置，也未部署。

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
