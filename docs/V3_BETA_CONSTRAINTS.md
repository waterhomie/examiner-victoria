# Examiner Victoria V3 Beta constraints

> Active scope boundary. Current release facts are maintained in [V3 Current Status](V3_CURRENT_STATUS.md).

## Beta stage

The first small invitation round is complete:

- five anonymous testers: T001–T005
- feedback records: F001–F016
- original 3–5 person target reached

The next stage is targeted follow-up validation of fixes, mobile behavior, latency, reliability, and cost. V3 Beta is not yet a broad public launch and the current evidence must not be described as market validation.

## Deployment boundary

The domestic H5 path is already deployed on Tencent CloudBase Run in Shanghai. Basic access and the main voice chain have been verified on iPhone Wi-Fi, iPhone 4G, Safari, and the WeChat embedded browser with VPN disabled.

Current work should focus on stability, feedback, and controlled follow-up testing rather than reopening the domestic-entry architecture decision. CloudBase settings, deployment versions, and source branches remain human-controlled.

Do not generalize the completed checks to all Android devices, all carriers, 5G, or high concurrency.

## Provider boundary

- LLM and STT remain on the existing provider paths
- CloudBase TTS uses Tencent Cloud TextToVoice through the provider adapter
- gTTS is local/legacy only
- written feedback and the next question remain available when TTS is disabled or fails
- provider migration must be incremental and separately validated

Do not replace multiple providers in one task. Do not record credentials in the repository.

## Cost boundary

The working beta budget remains **no more than RMB 100 per month** unless the user explicitly approves a change. Track actual CloudBase and provider consumption during invitation testing.

Do not invent vendor prices. Pricing, quotas, free allowances, filing rules, and platform policies must be verified against current official sources before a purchasing or architecture decision.

Expansion beyond the current test group depends on feedback quality, reliability, privacy review, and observed cost.

## Product non-goals

Do not add these features as incidental V3 Beta work:

- accounts or cross-device identity
- a persistent application database
- payments
- a WeChat Mini Program rewrite
- full-duplex real-time voice
- acoustic pronunciation scoring
- long-term learner profiles
- persistent personal experiences
- a personalized full-answer flow

Any of these requires an explicit product decision, separate design, and separate privacy/cost review.

## Safety and privacy

- collect the minimum anonymous feedback needed for beta decisions
- do not store or document user recordings, full answers, transcripts, or personal identifiers
- keep API keys, tokens, credentials, cookies, and real environment values out of code and documentation
- keep runtime diagnostics non-sensitive
- do not let TTS failure clear transcript, feedback, next question, or session state
