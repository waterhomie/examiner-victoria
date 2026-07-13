# Examiner Victoria V3｜Domestic Public Beta Kickoff Context

> **Historical snapshot.** This file records the V3 kickoff assumptions and may describe Railway or planned provider work as current. Use [V3 Current Status](V3_CURRENT_STATUS.md) for the authoritative release state; do not use this document alone for deployment decisions.

## 1. 项目定位

Examiner Victoria 是一个 IELTS Speaking AI coach。V2 已经完成 React + FastAPI 的可用产品原型，并在 Railway 上形成公网测试版。V3 的目标不是重新做一个新 App，而是在 V2 稳定基础上，进入“国内可访问、大量用户反馈、商业化前验证”的阶段。

V2 当前应被视为冻结的产品基线：

- Git tag: `v2.0.0`
- GitHub Release: `Examiner Victoria V2.0.0`
- 冻结 commit: `d592900e29c0cdcc4576d884c178991deea7013c`
- V2 production URL: `https://examiner-victoria-v2-production.up.railway.app`

V3 的核心问题是产品化和分发，不是继续无边界地堆功能。

## 2. V2 已完成能力

### 已实现

- React + FastAPI 单服务 Web App。
- FastAPI 同时服务 React production build 和 `/api`。
- Practice Mode：聊天式练习、逐轮纠错、自然表达建议。
- Mock / Exam Mode：语音优先的模考体验方向已经完成最小版本，Practice 与 Mock 的产品定位已区分。
- Part 1 / Part 2 / Part 3 全流程。
- Part 2 Cue Card、提示要点、准备倒计时。
- Part 3 混合追问策略：question-bank backbone + answer-driven follow-up + question-bank fallback。
- 用户录音与服务端转写 fallback。
- 浏览器原生语音识别优先尝试的前端加速层。
- 考官 TTS 与播放控制。
- Final report、Transcript export、Practice record export。
- 移动端布局、录音、滚动、底部 composer、语音播放等主要体验问题已修复。
- Railway Docker 单服务部署。
- 匿名用户反馈与产品决策文档。

### 已自动测试

仓库中已有以下验证入口，具体以实际运行结果为准：

- `python .\validate_question_bank.py`
- `python -m v2.backend.smoke_test`
- `powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1`
- `powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_v2.ps1 -SkipInstall`
- `cd v2/frontend; pnpm run test:smoke`
- `cd v2/frontend; pnpm run build`

`check_v2.ps1` 覆盖 Python compile、题库验证、后端 deterministic smoke test、部署配置检查、前端 smoke test、production build 和简单 secret pattern scan。它不应调用真实 LLM / STT / TTS。

### 已人工测试

- 用户已完成 V2 手机上线后的多轮移动端测试。
- 转录稳定约 1-3 秒，当前可接受。
- 移动端聊天滚动卡顿、底部遮挡、短内容位置等问题已多轮修复并确认改善。
- TTS 已达到“开头交互一次后可连续播放”的可接受状态。
- 用户反馈已整理到 `docs/USER_FEEDBACK_LOG.md`。

### 仍待更多用户验证

- Mock / Exam Mode 是否真的比 Practice Mode 更接近正式考试。
- 用户是否希望模考过程中隐藏聊天气泡、实时转写和逐轮纠错。
- Part 3 动态追问是否自然、相关、不过度具体、不重复。
- 反馈建议是否足够直接、具体、可执行。
- 语音播放和重播入口是否足够可理解。
- 国内用户能否稳定访问。
- 用户是否接受当前发音能力边界。

## 3. 当前技术架构

### 前端

- 技术栈：React 19 + Vite + pnpm。
- 入口：`v2/frontend/src/App.jsx`。
- API client：`v2/frontend/src/api.js`。
- 录音：`v2/frontend/src/recorder.js`。
- 浏览器语音识别：`v2/frontend/src/browserSpeechTranscriber.js`。
- 样式：`v2/frontend/src/styles.css` 与拆分后的移动端 / 组件 CSS。
- 状态与流程拆分在 `v2/frontend/src/hooks/`、`v2/frontend/src/state/`、`v2/frontend/src/components/`、`v2/frontend/src/utils/`。

### 后端

- 技术栈：FastAPI + Pydantic + OpenAI-compatible provider client。
- 入口：`v2/backend/app.py`。
- 部署入口：`v2.backend.app:app`。
- 核心配置：`v2/backend/core/config.py`。
- 主要服务：
  - `v2/backend/exam_flow_service.py`
  - `v2/backend/feedback_service.py`
  - `v2/backend/part3_service.py`
  - `v2/backend/audio_services.py`
  - `v2/backend/question_bank_service.py`
  - `v2/backend/report_service.py`
  - `v2/backend/telemetry_service.py`

### API

API contract 位于 `v2/API_CONTRACT.md`。当前主要端点包括：

- `/api/health`
- `/api/question-bank`
- `/api/practice-options`
- `/api/sessions`
- `/api/answer`
- `/api/transcribe`
- `/api/tts`
- `/api/report`
- `/api/telemetry`
- `/api/telemetry/summary`

### Session 与数据

当前 V2 没有正式数据库和账号系统。会话主要由前端持有并随请求发送，前端有本地恢复能力。报告、Transcript、Practice record 以导出为主。

这意味着 V3 如果要做大规模反馈和商业化，需要单独设计用户数据、反馈数据、权限和隐私策略。

### LLM / STT / TTS

- LLM provider adapter: `v2/backend/ai_provider.py`。
- Provider 配置通过环境变量注入，不在仓库保存真实值。
- STT：浏览器原生识别优先尝试，服务端转写作为 fallback。
- TTS：后端语音服务生成考官语音，前端负责播放状态和 replay 体验。

### 题库

- 根目录题库：`question_bank.py`、`pdf_recall_question_bank.py`。
- 题库验证：`validate_question_bank.py`。
- 后端题库读取：`v2/backend/question_bank_service.py`。
- Part 3 混合逻辑：`v2/backend/part3_service.py`。

### 部署

- Dockerfile 位于仓库根目录。
- Railway 配置：`railway.json`。
- Railway healthcheck: `/api/health`。
- 当前部署方式：一个 FastAPI Web Service 同时服务前端静态文件和后端 API。

### 环境变量类别

只记录变量类别，不记录真实值：

- `API_KEY`
- `BASE_URL`
- `MODEL`
- `TRANSCRIPTION_MODEL`
- `CORS_ORIGINS`
- `ADMIN_TOKEN`
- 音频、限流、session、telemetry 相关配置

## 4. V2 用户反馈与产品决策

用户反馈记录在 `docs/USER_FEEDBACK_LOG.md`。关键结论：

- 用户需要区分 Practice Mode 与 Mock / Exam Mode。
- 有 TTS 不等于有真实考试体验；模考沉浸感取决于是否隐藏聊天框、实时转写和逐轮反馈。
- Part 2 不能完全隐藏文字，仍应显示 Cue Card、提示要点和准备倒计时。
- Part 3 不应硬编码为固定 50% 题库 + 50% AI，而应采用题库主干、回答驱动追问、题库回退。
- 发音评分必须明确边界：当前文本转写分析不能替代声学层面的 pronunciation scoring。
- 用户希望更直接、更可执行的反馈建议。
- 用户有练习记录需求，但当前阶段不必立即引入账号和云端数据库。

## 5. V3 核心目标

V3 的核心目标是：

1. 让中国大陆用户可以更稳定地访问和测试。
2. 支持更大范围的真实用户反馈收集。
3. 建立匿名、可分析、可导出的反馈数据库。
4. 验证 Practice Mode 与 Mock / Exam Mode 的产品价值差异。
5. 验证 Part 3 混合追问质量。
6. 明确国内部署、备案、域名、成本、支付、小程序路线的先后顺序。
7. 为后续微信小程序商业化做技术与产品准备。

## 6. V3 非目标

V3 第一阶段不做：

- 不重写 V2。
- 不更换核心 Prompt。
- 不大规模重构题库。
- 不承诺全双工 Live Voice。
- 不宣称正式声学发音评分。
- 不立刻做微信小程序完整商业版。
- 不立刻做账号、支付、订阅和复杂后台。
- 不为了国内访问牺牲密钥安全、用户隐私和可维护性。

## 7. 国内访问链路

当前 V2 Railway 公网地址对部分国内用户不可访问或不稳定。V3 需要比较以下路线：

### 方案 A：继续海外 Web App

- 优点：维护成本低，沿用当前 Docker + FastAPI + React 架构。
- 风险：国内访问不稳定，反馈样本受限。

### 方案 B：香港 / 新加坡 VPS + 域名 + HTTPS

- 优点：比美国区 Railway 更可能改善国内访问；仍可复用当前 Web App。
- 风险：需要运维、备份、日志、安全、成本控制。

### 方案 C：中国大陆服务器 + 备案

- 优点：国内访问最好。
- 风险：备案、合规、模型 API 访问、部署复杂度更高。

### 方案 D：微信小程序

- 优点：用户触达与商业化更自然。
- 风险：小程序语音、录音、审核、后端域名、备案、支付和数据合规都需要单独设计。

V3 第一阶段建议先验证 Web 版国内可访问和反馈收集，不立即把小程序作为第一步开发目标。

## 8. V3 第一阶段

建议第一阶段只做以下工作：

1. 选择国内反馈版部署路线。
2. 建立匿名用户反馈数据模型。
3. 建立管理员可查看的反馈汇总方式。
4. 为测试者设计最小测试任务：Part 1 自选主题、Part 2 到 Part 3、Practice vs Mock 对比、导出记录。
5. 记录设备、浏览器、地区、访问成功率、转录速度、卡顿点、退出点。
6. 明确哪些数据不采集：真实姓名、联系方式、完整录音、敏感身份信息。
7. 完成 3-5 人小样本验证后再扩大到 20-50 人。

## 9. 待比较方案

V3 开始前至少比较：

- Railway 继续托管 vs VPS。
- 香港 VPS vs 新加坡 VPS。
- 单 Web App vs Web App + 反馈表。
- 本地导出记录 vs 云端练习记录。
- 匿名反馈 vs 登录账号。
- 先做 Web 国内反馈版 vs 直接做微信小程序。
- 使用现有 OpenAI-compatible provider vs 国内可用模型 / 转写 / TTS provider。

比较维度：

- 国内访问稳定性。
- 延迟。
- 成本。
- 维护难度。
- 隐私风险。
- 小程序迁移难度。
- 用户反馈质量。

## 10. Git 与 SSH 工作流

### V2 canonical

- 路径：`D:\Software\Codex\Projects\examiner-victoria-v2-canonical`
- 分支：`main`
- remote：`git@github-443:waterhomie/examiner-victoria-v2.git`
- tag：`v2.0.0`

### V3 worktree

- 路径：`D:\Software\Codex\Projects\examiner-victoria-v3`
- 分支：`v3/domestic-public-beta`
- remote：`git@github-443:waterhomie/examiner-victoria-v2.git`

### 规则

- V2 冻结后，不在 `main` 上继续做 V3 探索性修改。
- V3 工作只在 `v3/domestic-public-beta` 或其 feature branches 上进行。
- 不使用旧的 `tmp/github-sync-*` 手工复制流程。
- 不使用 HTTPS remote 输入密码流程。
- 不 force push。
- 不提交 `.env`、日志、缓存、用户隐私数据。

## 11. 测试命令

V3 每次改动前后应根据范围选择运行：

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_v2.ps1 -SkipInstall
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1
python .\validate_question_bank.py
python -m v2.backend.smoke_test
cd v2/frontend
pnpm run test:smoke
pnpm run build
```

当前仓库未发现独立 Markdown link check 脚本。若 V3 文档继续增加，建议后续补充只读 Markdown link check。

Secret scan 当前由 `check_v2.ps1` 中的简单 pattern scan 覆盖。V3 如果引入反馈数据库、部署密钥或新 provider，应补充更严格的 secret scan。

## 12. 当前已知风险

- 国内访问不稳定是 V3 最大分发风险。
- 真实用户反馈规模仍很小。
- 当前没有正式用户数据库，不适合直接承诺跨设备历史记录。
- 语音链路依赖浏览器、设备、网络和第三方 provider，国内环境需要重新验证。
- 发音评分边界必须继续明确，不能用转写文本冒充 pronunciation scoring。
- 如果进入小程序路线，将涉及备案、域名、录音权限、审核、支付和数据合规。
- 反馈数据库一旦上线，需要最小化采集、匿名化和访问控制。

## 13. V3 开始前必须回答的问题

1. 第一批测试用户在哪里获得？预计多少人？
2. 国内访问优先选择 VPS、国内服务器、还是继续海外托管？
3. 是否需要备案？如果需要，时间和主体如何安排？
4. 反馈数据库采集哪些字段？哪些字段明确不采集？
5. 是否需要管理员后台，还是先用导出文件 / 简单表格？
6. 是否继续使用当前 AI provider？国内访问是否稳定？
7. STT 和 TTS 是否需要换国内更稳定方案？
8. 小程序是 V3 第一阶段目标，还是 V3 后的商业化阶段目标？
9. Practice Mode 与 Mock / Exam Mode 哪个作为国内反馈版默认入口？
10. 用户记录是先本地保存，还是开始设计云端账号？

## 14. 决策原则

- 先验证访问和反馈，再谈商业化。
- 先小样本闭环，再扩大测试。
- 先保留 V2 稳定能力，再做 V3 增量。
- 产品边界必须诚实，尤其是发音评分。
- 用户隐私优先于数据完整性。
- 不为短期整洁牺牲可运行性。
- 每次改动都要能回滚。
