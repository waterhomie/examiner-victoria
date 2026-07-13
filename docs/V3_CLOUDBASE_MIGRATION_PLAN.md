# Examiner Victoria V3 CloudBase Run 国内入口迁移兼容性审计与实施计划

> **Migration record with active reference material.** Planning sections below preserve the original pre-migration reasoning, while dated updates record completed CloudBase and Tencent TTS validation. For a concise authoritative snapshot, use [V3 Current Status](V3_CURRENT_STATUS.md).

审计日期：2026-07-12
状态更新日期：2026-07-13
目标分支：`v3/domestic-public-beta`
计划分支：`docs/v3-cloudbase-migration-plan`
范围：文档审计与迁移计划；不修改业务代码、不创建腾讯云资源、不部署、不替换 LLM/STT/TTS 供应商。

## 1. 执行摘要

结论：现有 V3 的“React 静态构建 + FastAPI API + 单容器 Dockerfile”架构，具备低改动迁移到 CloudBase Run 作为国内入口的基础条件。当前仓库已经把前端构建产物通过 FastAPI 同源托管，容器以 `0.0.0.0` 监听平台端口，并提供 `/api/health` 与 `/api/diagnostics/runtime` 两个只读诊断入口；这些都与 CloudBase Run 的 HTTP 容器服务模型相匹配。

但 CloudBase Run 只能解决“国内用户能否稳定打开入口域名与容器服务”的问题，不能自动解决当前 LLM/STT/TTS 仍依赖外部服务的问题。V3 第一阶段应只迁移入口与容器运行环境，先验证首页、静态资源、健康检查、诊断接口、System check、录音权限与音频上传通道；不要同时替换 LLM、STT、TTS。

推荐路线：CloudBase Run 仍作为第一优先候选；腾讯云 Lighthouse 作为可控性更高但运维成本更高的 fallback。若 CloudBase Run 的构建、端口、请求时长、上传大小、出网能力、成本上限或默认域名访问规则任一关键项无法满足，则切换到 Lighthouse 方案。

状态更新（2026-07-13）：

- V3 已部署到腾讯云 CloudBase Run，并完成手机端连续两轮端到端验证。
- 当前 CloudBase Run 服务使用 `v3/domestic-public-beta` 构建；默认 HTTPS 地址为 `https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com`。
- 关闭 VPN 后，iPhone Wi-Fi、iPhone 4G 与微信内置浏览器访问均已通过；5G 尚无单独测试记录，不在本文中推断为已验证。
- 当前 TTS 已从 CloudBase 生产路径中的 gTTS 风险方案切换为腾讯云官方 Python SDK 3.0 `TextToVoice`。
- 腾讯云 TTS 使用低权限子用户凭证；真实 `SecretId` / `SecretKey` 仅存放在 CloudBase 版本环境变量中。
- 两轮测试中，`POST /api/transcribe`、`POST /api/answer`、`POST /api/tts` 均返回 `200 OK`。
- 此前的 TTS `502` 与 “Voice is temporarily unavailable” 已消失；文字降级仍作为异常 fallback 保留。

## 2. 已验证的 Railway 国内访问问题

来自既有文档与测试记录：

- `docs/V3_DOMESTIC_ACCESS_AUDIT.md`
- `docs/V3_BETA_ACCESS_TEST_LOG.md`

已记录结论：

- Railway V3 Beta 在国内无 VPN Wi-Fi 与移动网络访问中不稳定或不可达。
- VPN 环境可访问，说明应用自身部署与代码路径基本可用，主要问题集中在公网入口链路。
- Railway 海外版应保留为海外访问与 V2/V3 回滚基线，但不适合作为国内小规模公测的唯一入口。

## 3. 当前产品与部署架构

代码确认：

- 前端目录：`v2/frontend`
- 后端目录：`v2/backend`
- 构建与运行入口：仓库根目录 `Dockerfile`
- Railway 部署配置：`railway.json`

当前容器模型：

1. Dockerfile 第一阶段使用 Node 构建 React/Vite 前端。
2. 生产构建设置 `VITE_API_BASE=""`，让前端 API 走同源路径。
3. Dockerfile 第二阶段使用 Python 运行 FastAPI。
4. `FRONTEND_DIST=/app/v2/frontend/dist`，FastAPI 托管前端静态资源。
5. `PORT=8080`，启动命令为 `python -m uvicorn v2.backend.app:app --host 0.0.0.0 --port ${PORT:-8080}`。
6. `railway.json` 健康检查路径为 `/api/health`。

当前运行时能力：

- `/`：由 FastAPI fallback 返回前端 `index.html`。
- `/assets/*`：由 FastAPI 静态文件服务返回前端构建资源。
- `/api/health`：公网最小健康响应，仅保留 `status` 和 `app`。
- `/api/diagnostics/runtime`：返回非敏感诊断布尔值与时间戳。
- `/api/transcribe`：接收浏览器上传音频，调用 STT adapter。
- `/api/answer`：调用 LLM 生成追问或反馈。
- `/api/tts`：调用 TTS 生成语音。
- `/api/report`：生成报告内容。

当前无数据库、无账号、无支付；前端 session 与练习记录主要依赖浏览器状态，本地下载由 Blob 完成。

## 4. CloudBase Run 官方能力核对

本节只引用腾讯云官方文档可确认的信息。未能从官方公开文档稳定确认的内容，统一标记为“待通过腾讯云控制台或官方客服确认”。

官方文档核对日期：2026-07-12

| 能力项 | 官方资料确认 | 对 V3 的意义 |
|---|---|---|
| 容器化应用托管 | CloudBase Run 支持任意语言和框架编写的容器化应用 | React + FastAPI 单容器架构理论上匹配 |
| HTTP 服务 | 云托管只支持 HTTP 协议服务，不支持 TCP/UDP/MQTT | V3 当前全链路为 HTTP/HTTPS API，匹配 |
| 非公网 IP 访问 | 云托管通过域名调用服务，不支持公网 IP 访问 | V3 必须以默认域名或自定义域名提供入口 |
| Dockerfile | 本地代码/代码库拉取方式需要提供 Dockerfile | V3 已有根目录 Dockerfile |
| 代码库拉取 | 支持 GitHub、GitLab、Gitee 授权后拉取代码并构建镜像 | 可用已 push 分支作为版本来源，实际授权需控制台操作 |
| 监听端口 | 版本配置有“监听端口”，默认为 80，端口需与容器暴露/监听一致 | V3 当前默认 8080，需要在 CloudBase 版本配置中设为 8080，或后续单独调整 Dockerfile |
| 默认域名 | 部署后 CloudBase Run 自动分配默认域名，可通过默认域名访问服务；服务域名可用于 HTTPS 调用 | 第一阶段可优先使用默认域名做国内 H5 闭环验证 |
| 环境变量 | 版本配置支持以 key/value 传入环境变量 | 可迁移 `API_KEY`、`BASE_URL`、`MODEL` 等变量，但不得在文档或日志输出真实值 |
| 出网能力 | 系统创建网络会自动创建微小型 NAT 网关以保证服务具备访问公网能力 | LLM/STT/TTS provider 出网可先验证；稳定性与带宽仍待实测 |
| 低成本模式 | 最小副本可为 0；无流量一段时间后缩容到 0；冷启动可能带来最长 30 秒延迟 | 适合邀请制低频公测，但首访和语音链路要容忍冷启动 |
| 高可用模式 | 最小副本大于 0，会持续产生费用 | 若冷启动影响体验，可作为后续选项，不作为第一阶段默认 |
| 流量与回滚 | 支持百分比流量、URL 参数定向流量；新建版本方式支持将流量导回旧版本回滚 | 可做灰度验证；Railway 仍保留外部回滚基线 |

官方来源：

- 腾讯云 CloudBase Run 文档首页：<https://cloud.tencent.com/document/product/1243>
- 服务开发说明：<https://cloud.tencent.com/document/product/1243/53551>
- 部署概述：<https://cloud.tencent.com/document/product/1243/49235>
- 新建服务：<https://cloud.tencent.com/document/product/1243/46126>
- 部署服务：<https://cloud.tencent.com/document/product/1243/46127>
- 更新或回滚服务：<https://cloud.tencent.com/document/product/1243/46128>
- 服务配置说明：<https://cloud.tencent.com/document/product/1243/49261>
- 版本配置说明：<https://cloud.tencent.com/document/product/1243/49177>
- 流量配置说明：<https://cloud.tencent.com/document/product/1243/49178>

## 5. 现有代码兼容性审计

### 5.1 可以低改动迁移的证据

- 单容器：现有 Dockerfile 已经把前端与后端打入同一容器，不需要拆分前后端服务。
- 同源 API：生产构建 `VITE_API_BASE=""`，前端请求 `/api/*`，迁移入口域名后无需前端生产 URL 替换。
- HTTP 协议：当前无 WebSocket、无 TCP 长连接、无全双工音频。
- 平台端口：后端通过 `${PORT:-8080}` 启动，并监听 `0.0.0.0`。
- 健康检查：已有 `/api/health`，且响应已最小化，不泄露 provider、CORS、limits 或模型名。
- 诊断接口：已有 `/api/diagnostics/runtime`，用于人工验收；除非敏感状态外，还可返回 TTS region、voice type、codec、sample rate、model type 等公开配置，不返回任何密钥。
- 无本地持久状态：练习记录主要由前端维护，报告导出是请求内生成，不依赖容器磁盘持久化。

### 5.2 需要迁移配置但不需要立即改代码的项目

- CloudBase 版本监听端口应配置为 `8080`，与 Dockerfile `EXPOSE 8080` 和 uvicorn 端口一致。
- CloudBase 环境变量需要按 Railway 当前变量名重新录入，但不得复制或输出真实 `.env`。
- 如使用同源默认域名，`CORS_ORIGINS` 可先保持当前策略；如后续前后端拆域，则应单独收紧。
- `FRONTEND_DIST` 已在 Dockerfile 内设置，通常无需控制台重复设置。
- CloudBase 默认 HTTPS 域名已创建并完成国内关闭 VPN 的 iPhone Wi-Fi、4G 与微信内置浏览器访问验证；5G 尚未单独记录。

### 5.2.1 已验证的 CloudBase Tencent TTS 配置

CloudBase 版本环境变量中的非敏感值如下：

```text
TTS_PROVIDER=tencent
TENCENT_TTS_REGION=ap-shanghai
TENCENT_TTS_VOICE_TYPE=501009
TENCENT_TTS_CODEC=mp3
TENCENT_TTS_SAMPLE_RATE=16000
TENCENT_TTS_SPEED=0
TENCENT_TTS_VOLUME=0
```

请求参数与已成功的 API Explorer 配置保持一致：`PrimaryLanguage=2`、`ModelType=1`、`VoiceType=501009`、`SampleRate=16000`、`Codec=mp3`。

凭证配置边界：

- 仅使用低权限子用户的 `TENCENTCLOUD_SECRET_ID` 与 `TENCENTCLOUD_SECRET_KEY`。
- 真实值只存在于 CloudBase 控制台的版本环境变量中。
- 不写入仓库、`.env`、前端 `VITE_` 变量、构建日志、运行日志、截图或文档。
- 子用户权限遵循最小权限原则，只授予 TTS 调用所需权限；具体策略名称与范围需以腾讯云当前控制台和官方资料为准。
- 更换凭证时通过 CloudBase 新版本配置与回滚流程完成，不在代码中硬编码。

### 5.3 可能需要后续代码或配置调整的项目

以下不是第一阶段立刻修改项，只是预判：

- 如果 CloudBase 构建环境无法稳定访问 npm/pnpm/PyPI/Docker Hub，可能需要改 Dockerfile 的 registry 或镜像源策略。
- 如果 CloudBase 请求超时低于 `/api/transcribe`、`/api/answer`、`/api/tts` 的实际耗时，可能需要降低音频时长、拆分链路或调整前端提示。
- 如果 CloudBase 上传体积限制低于 `MAX_AUDIO_UPLOAD_MB=12` 的默认值，需要先通过环境变量调低限制，再评估是否改前端录音时长。
- 如果 CloudBase 低成本冷启动影响 System check 或首轮练习体验，可改用高可用最小 1 副本，但会增加费用。
- 腾讯云 TTS 已在 CloudBase 手机端连续两轮验证通过；后续重点转为长期稳定性、并发、额度、成本和凭证轮换观察。OpenAI-compatible STT/LLM 出网仍需持续监控。

## 6. 阻断点

### 6.1 硬阻断

当前未发现会直接阻断“先迁移入口到 CloudBase Run”的代码级硬阻断。

### 6.2 条件性阻断

必须在腾讯云控制台或官方渠道确认：

1. CloudBase Run 是否能以仓库根目录 Dockerfile 从 `v3/domestic-public-beta` 或测试分支稳定构建。
2. CloudBase Run 版本监听端口是否可设置为 `8080`，并与容器内 `PORT=8080` 对齐。
3. 默认域名是否可用于国内公网 HTTPS H5 公测，是否存在未备案、访问频率或分享限制。
4. 单请求超时、请求体大小、响应体大小、并发、日志和构建时间限制。
5. 系统创建 NAT 网关对当前 LLM/STT/TTS 出网域名的实际可达性与稳定性。
6. 低成本模式冷启动是否可被 System check 与人工验收接受。
7. 成本是否可通过预算告警、用量上限或副本配置控制在目标范围。

## 7. 必须变更项

第一阶段真正需要变更的不是业务代码，而是部署环境：

- 新建 CloudBase Run 环境与服务。
- 创建一个只读/手动部署用版本，来源指向已 push 的 V3 分支或镜像。
- 将版本监听端口设为 `8080`。
- 配置与 Railway 对应的必要环境变量，只在控制台录入，不写入仓库。
- 将 CloudBase 默认域名加入人工验收清单。
- 记录 CloudBase 默认域名、版本号、流量策略、回滚版本。

若后续要把 CloudBase 部署配置固化进仓库，应另起任务，并仅新增 CloudBase 专用文档或配置文件；不要在本任务中修改。

## 8. 推荐变更项

- 对全新的独立 CloudBase 测试服务，第一版使用低成本模式、小规格、最小副本 0、最大副本 1，控制 Phase 1 成本。
- 首个版本部署完成后，为这个独立 CloudBase 测试服务开启 100% 流量；该 100% 只属于 CloudBase 测试服务，不影响 Railway V2 Production 或 Railway V3 Beta。
- 默认域名进行正常 HTTP 验收时，目标版本必须实际获得流量；第一次访问可能出现冷启动延迟，应在验收记录中单独标注。
- 未来同一个 CloudBase 服务已经存在稳定旧版本时，才采用“新版本保持 0% 流量 → 定向测试 → 人工切换流量”的灰度策略。
- 保留 Railway V3 Beta 与 V2 Production，不删除、不覆盖、不改生产环境。
- 在 CloudBase 控制台开启日志，但避免打印请求正文、用户回答、音频内容或 secrets。
- 人工验收先测 `/api/health`、`/api/diagnostics/runtime`、System check、本地录音与本地音频播放，再决定是否做真实 provider 测试。

## 9. 可以保持不变的项目

- React/Vite 前端结构。
- FastAPI 后端结构。
- Prompt。
- 题库。
- Practice / Mock 流程。
- LLM adapter。
- STT adapter。
- TTS adapter。
- Session 管理模型。
- 报告导出实现。
- Railway 配置与 Railway 现有部署。
- V2 Production。

## 10. 完整访问链路迁移审计

| 环节 | 当前实现 | CloudBase 后预期 | 主要风险 | 第一阶段处理 |
|---|---|---|---|---|
| 页面加载 | Railway 域名返回 FastAPI 托管的 `index.html` | CloudBase 默认域名返回同一容器页面 | 默认域名国内可达性、冷启动 | 只读访问 `/`，记录首包时间 |
| 静态资源 | `/assets/*` 同源加载 | 同源加载 | 构建产物路径、缓存 | 验证 JS/CSS 200 |
| API 请求 | `/api/*` 同源 | `/api/*` 同源 | 超时、冷启动 | 先测 health/diagnostics |
| 录音权限 | 浏览器 `getUserMedia` | 不变 | 微信/iOS 权限限制 | 仍由 System check 提示 |
| 音频上传 | `multipart/form-data` 到 `/api/transcribe` | 不变 | 请求体限制、超时 | 不先调用真实 STT；先确认上传限制 |
| STT | OpenAI-compatible adapter | 不变 | CloudBase 出网到 provider | 第二阶段单独验证 |
| LLM | OpenAI-compatible chat | 不变 | CloudBase 出网到 provider、成本 | 第二阶段单独验证 |
| TTS | Tencent Cloud SDK 3.0 `TextToVoice` 返回 MP3 | CloudBase 已验证 | 权限、额度、延迟、并发与成本 | 手机端连续两轮 `/api/tts` 200；继续监控 |
| 音频播放 | 浏览器播放音频 Blob/URL | 不变 | iOS 自动播放限制 | 继续人工验收 |
| 报告 | `/api/report` + 前端展示 | 不变 | 请求超时较低 | 短会话验证 |
| 下载 | 浏览器 Blob 下载 | 不变 | 微信内置浏览器下载限制 | System check/人工记录 |

## 11. 成本测算框架

不能在本文件中直接给出固定价格结论。CloudBase Run 价格、免费额度、NAT、公网流量、日志、构建、镜像仓库、预算告警规则必须以腾讯云控制台或官方最新资料为准。

建议按以下公式测算：

```text
月成本 =
  CloudBase Run CPU 用量
+ CloudBase Run 内存用量
+ 公网出流量
+ NAT/网络相关费用
+ 构建/镜像/日志相关费用
+ LLM token 成本
+ STT 音频分钟成本
+ TTS 字符或请求成本
+ 预留缓冲
```

最小公测假设：

| 场景 | 用户数 | 使用模型 | 成本判断 |
|---|---:|---|---|
| 邀请制轻量验证 | 5-10 | 每人少量练习，低成本副本 | ¥100/月可能可行，但需官方单价确认 |
| 小规模 Beta | 20-50 | 每周多次练习 | ¥100/月风险升高，provider 成本可能超过平台成本 |
| 公开传播 | 不限 | 无登录/无支付 | 不建议；存在滥用与不可控成本风险 |

当前判断：¥100/月“可能可行”的前提是邀请制、低频、限流、保留文字降级、不做公开传播，并且 CloudBase 与 provider 单价经官方资料确认。

## 12. CloudBase Run vs 腾讯云 Lighthouse

| 维度 | CloudBase Run | Tencent Lighthouse |
|---|---|---|
| 与现有单容器兼容性 | 高，前提是端口/构建通过 | 高，可直接 Docker 或 systemd |
| 国内访问入口 | 国内云产品默认域名/自定义域名 | 国内 CVM IP/域名 |
| 运维复杂度 | 低，平台托管扩缩容 | 中，需要系统、反代、证书、进程管理 |
| 成本弹性 | 低成本模式可缩容到 0 | 通常固定月费 |
| 冷启动 | 低成本模式有冷启动 | 常驻，无冷启动 |
| 长请求可控性 | 受平台限制，需确认 | 可控性更高 |
| 请求体/超时限制 | 待官方确认 | 可通过 Nginx/Uvicorn 调整 |
| 回滚 | 版本流量回滚 | 镜像/快照/反向代理切换 |
| Codex 协作难度 | 中，偏控制台流程 | 中高，涉及服务器运维 |
| 适合第一阶段 | 是 | 作为 fallback |

Lighthouse 触发条件：

- CloudBase 默认域名无法满足国内访问或分享测试。
- CloudBase 请求超时/上传限制不满足音频链路。
- CloudBase 构建与镜像源问题持续阻塞。
- CloudBase 成本不可预测或预算控制不足。
- 需要更强的 Nginx、证书、日志、进程或网络出站控制。

## 13. 推荐路线

推荐路线：保留 React + FastAPI 单容器，优先在 CloudBase Run 建立国内 H5 最小闭环。

实施原则：

1. 先迁移入口，不迁移供应商。
2. 先验证无付费 provider 链路，再验证真实 STT/LLM/TTS。
3. 不同时替换前端、后端、LLM、STT、TTS。
4. 每次只迁移一个关键环节。
5. Railway V3 Beta 与 V2 Production 均保留。
6. 不立即做账号、支付、复杂数据库或微信小程序重构。

## 14. 分阶段迁移计划

### Phase 0：控制台前置确认

- 确认腾讯云账号实名状态。
- 确认 CloudBase Run 可用地域。
- 确认默认域名、HTTPS、备案要求。
- 确认端口 8080、请求超时、上传大小、并发、构建时长限制。
- 确认价格与预算告警。

### Phase 1：无 provider 的入口闭环

- 创建 CloudBase Run 测试环境和服务。
- 部署当前 V3 分支对应镜像或代码库版本。
- 使用低成本模式，最小副本 0，最大副本 1。
- 首个版本部署完成后，在这个独立 CloudBase 测试服务内开启 100% 流量。
- 确认该 100% 流量不涉及 Railway V2 Production 或 Railway V3 Beta，不改变任何 Railway 入口。
- 预期第一次访问可能触发冷启动；如果首访较慢，应记录冷启动耗时，而不是直接判定部署失败。
- 使用默认域名访问 `/`。
- 验证 `/api/health`。
- 验证 `/api/diagnostics/runtime`。
- 验证 System check 页面和浏览器能力检测。
- 不提交录音，不调用真实 LLM/STT/TTS。

### Phase 2：音频上传与 provider 出网验证

已完成验证（2026-07-13）：

- 手机端连续完成两轮真实流程。
- 两轮中的 `POST /api/transcribe`、`POST /api/answer`、`POST /api/tts` 均为 `200 OK`。
- 腾讯云 TTS 成功返回音频，原 `502` 和 “Voice is temporarily unavailable” 未再出现。
- 日志与 diagnostics 仅保留非敏感配置和安全错误元数据，不记录凭证、用户完整文本或 Audio Base64。
- 仍需继续观察更长时间窗口、更多设备、并发、额度与成本；本次结果不代表压力测试结论。

- 已使用手机端短音频验证 `/api/transcribe` 返回 `200 OK`。
- 已使用手机端短回答验证 `/api/answer` 返回 `200 OK`。
- 已使用手机端短句验证 `/api/tts` 返回 `200 OK` 并获得音频。
- 持续记录耗时、错误率、成本与日志脱敏状态。
- 如任一 provider 不稳定，单独开供应商迁移评估。

### Phase 3：小规模人工 Beta

- 邀请 5-10 名用户。
- 使用默认域名或已备案域名。
- 每日检查成本、错误日志与访问成功率。
- 维持 Railway 可回滚。

## 15. 测试矩阵

| 类别 | 测试项 | 通过标准 |
|---|---|---|
| 入口 | `/` | 200，返回有效 HTML |
| 静态资源 | JS/CSS | 200，无构建加载错误 |
| 后端 | `/api/health` | 200，仅 `status` 与 `app` |
| 诊断 | `/api/diagnostics/runtime` | 200，非敏感字段 |
| 安全 | Secret scan | 不出现 key/token/cookie/secret |
| System check | 手机端 Safari/Chrome/微信 | 从 `More → System check` 可打开，可复制脱敏诊断 |
| 移动端 | iPhone Safari | 麦克风提示明确，录音权限流程可理解 |
| 移动端 | Android Chrome | 录音与播放基本可用 |
| 微信 | 微信内置浏览器 | 明确提示风险或降级 |
| 上传 | 短音频 | 不超过平台限制 |
| Provider | STT/LLM/TTS | 手机端连续两轮均返回 200；继续做长期稳定性、更多设备与成本观察 |
| 回滚 | CloudBase 版本 | 可将流量导回旧版本 |
| 外部回滚 | Railway | Railway V3/V2 URL 未被覆盖 |

## 16. 回滚方案

CloudBase 内部回滚：

- 使用“新建版本”方式部署。
- 对全新的独立 CloudBase 测试服务，首个版本需要开启 100% 流量，才能通过默认域名完成正常 HTTP 验收。
- 这个 100% 流量只作用于 CloudBase 测试服务内部，不会覆盖或影响 Railway V2 Production、Railway V3 Beta。
- 如果首个版本失败，停止继续测试，删除或停用该 CloudBase 测试服务版本，并回到 Railway 外部基线。
- 未来同一个 CloudBase 服务已有稳定旧版本时，再采用“新版本保持 0% 流量 → 定向测试 → 人工切换流量”的灰度与回滚策略。
- 若新版本失败，将 CloudBase 服务流量切回旧版本或删除新版本。
- 若使用重新部署方式，依赖版本历史快照回滚，但该方式不支持灰度，优先级较低。

外部回滚：

- 保留 Railway V3 Beta URL。
- 保留 V2 Production URL。
- 不修改 DNS 到 CloudBase，直到默认域名测试稳定。
- 不删除任何 Railway 环境。

## 17. 备案与合规待核对项

待通过腾讯云控制台或官方客服确认：

- CloudBase 默认域名是否可直接用于国内公开 Beta。
- 默认域名是否涉及备案主体要求。
- 自定义域名接入 CloudBase Run 是否必须先完成 ICP 备案。
- 个人主体与项目用途是否适合备案。
- 腾讯云实名、域名购买、接入备案、公安备案的具体流程与周期。
- 用户音频、转写文本、反馈内容在腾讯云与当前 provider 之间传输时的隐私告知要求。
- 是否需要用户同意条款、隐私政策、数据删除机制。

第一阶段建议：不接自定义域名，不做公开传播，只用默认域名进行邀请制人工验证。

## 18. 手动控制台操作清单

本任务不创建资源。若后续执行，建议用户在控制台手动完成：

1. 创建 CloudBase 环境。
2. 创建 CloudBase Run 服务。
3. 选择代码库拉取或镜像拉取。
4. 选择 V3 分支或指定镜像。
5. 确认 Dockerfile 位于仓库根目录。
6. 设置监听端口为 `8080`。
7. 配置环境变量，不复制到仓库。
8. 选择低成本模式与小规格。
9. 设置最小副本为 0，最大副本为 1。
10. 首个版本部署完成后，为这个独立 CloudBase 测试服务开启 100% 流量。
11. 记录默认域名、版本号、流量策略和首次冷启动耗时。
12. 验证 health、diagnostics、System check。
13. 仅当同一个 CloudBase 服务未来已经存在稳定旧版本时，才对新版本使用 0% 流量定向测试策略。

## 19. 下一次最小开发任务建议

建议下一次只做“CloudBase Phase 1 只读上线验收准备”，仍不替换供应商：

- 新建 `docs/V3_CLOUDBASE_PHASE1_CHECKLIST.md` 或更新现有手工验收清单。
- 明确 CloudBase 控制台字段填写值。
- 明确只读验收命令。
- 明确不调用真实 LLM/STT/TTS 的测试顺序。
- 明确失败时回滚到 Railway 的判断标准。

如果 CloudBase 控制台要求仓库内存在特定配置文件，另开一个很小的配置 PR，只新增 CloudBase 专用配置，不改业务逻辑。

## 20. Go / No-Go 标准

Go：

- CloudBase 默认域名国内网络可访问。
- `/`、静态资源、`/api/health`、`/api/diagnostics/runtime` 全部通过。
- System check 能正确加载并不泄露敏感信息。
- Phase 1 独立 CloudBase 测试服务使用低成本模式、最小副本 0、最大副本 1，首个版本获得 100% 流量。
- 默认域名验收请求实际命中目标版本；首访冷启动延迟已记录且可接受。
- 平台请求体、超时、成本规则已确认。
- Railway V3/V2 回滚入口保持可用。

No-Go：

- CloudBase 默认域名无法稳定访问。
- 端口/构建/镜像源问题无法在不改业务代码的前提下解决。
- 请求超时或上传限制明显不适合音频链路。
- 价格和预算不可控。
- 默认域名或备案规则不适合当前阶段使用。

## 21. 本轮不变更声明

本计划文档不改变：

- 业务代码
- Prompt
- 题库
- Practice / Mock 流程
- LLM / STT / TTS provider
- Railway 配置
- `.env` 或任何 Secret
- 腾讯云资源
