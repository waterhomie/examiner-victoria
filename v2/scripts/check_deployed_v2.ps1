param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,
    [Parameter(Mandatory = $true)]
    [string]$FrontendUrl,
    [string]$AdminToken = ""
)

$ErrorActionPreference = "Stop"

function Normalize-Url {
    param([string]$Url)
    return $Url.Trim().TrimEnd("/")
}

$backend = Normalize-Url $BackendUrl
$frontend = Normalize-Url $FrontendUrl

Write-Host "Checking Examiner Victoria V2 deployment..." -ForegroundColor Cyan
Write-Host "Backend:  $backend"
Write-Host "Frontend: $frontend"

$health = Invoke-RestMethod -Uri "$backend/api/health" -TimeoutSec 20
if ($health.status -ne "ok") {
    throw "Backend health check returned unexpected status: $($health | ConvertTo-Json -Compress)"
}
Write-Host "Backend health: ok" -ForegroundColor Green
if ($null -ne $health.config) {
    if (-not $health.config.api_key_configured) {
        throw "Backend API_KEY is not configured. Set API_KEY before public testing."
    }
    if (-not $health.config.admin_token_configured) {
        throw "Backend ADMIN_TOKEN is not configured. Set ADMIN_TOKEN before public telemetry testing."
    }
    Write-Host "Backend model: $($health.config.model), transcription: $($health.config.transcription_model)" -ForegroundColor Green
}
if ($null -ne $health.limits) {
    Write-Host "Backend limits: audio $($health.limits.max_audio_upload_mb) MB, rate $($health.limits.rate_limit_per_minute)/min" -ForegroundColor Green
}

$corsHeaders = @{
    Origin = $frontend
    "Access-Control-Request-Method" = "POST"
}
$corsResponse = Invoke-WebRequest `
    -UseBasicParsing `
    -Method Options `
    -Uri "$backend/api/sessions" `
    -Headers $corsHeaders `
    -TimeoutSec 20
$allowedOrigin = $corsResponse.Headers["Access-Control-Allow-Origin"]
if (-not $allowedOrigin) {
    throw "Backend CORS preflight did not return Access-Control-Allow-Origin."
}
if (($allowedOrigin -ne "*") -and ($allowedOrigin -ne $frontend)) {
    throw "Backend CORS allows '$allowedOrigin', expected '$frontend' or '*'."
}
if ($allowedOrigin -eq "*") {
    Write-Host "CORS preflight: wildcard '*' (acceptable for smoke test, restrict before public launch)" -ForegroundColor Yellow
} else {
    Write-Host "CORS preflight: $allowedOrigin" -ForegroundColor Green
}

$bank = Invoke-RestMethod -Uri "$backend/api/question-bank" -TimeoutSec 20
if ($bank.part2_total_cards -ne 73) {
    throw "Unexpected Part 2 card count: $($bank.part2_total_cards)"
}
if ($bank.part3_reference_questions -lt 300) {
    throw "Unexpected Part 3 reference question count: $($bank.part3_reference_questions)"
}
Write-Host "Question bank: $($bank.part1_total_questions) Part 1 questions, $($bank.part2_total_cards) Part 2 cards, $($bank.part3_reference_questions) Part 3 references" -ForegroundColor Green

$options = Invoke-RestMethod -Uri "$backend/api/practice-options" -TimeoutSec 20
if ($options.part1_topics.Count -lt 30) {
    throw "Unexpected Part 1 option count: $($options.part1_topics.Count)"
}
if ($options.cue_cards.Count -ne 73) {
    throw "Unexpected cue-card option count: $($options.cue_cards.Count)"
}
Write-Host "Practice options: $($options.part1_topics.Count) Part 1 topics, $($options.cue_cards.Count) cue cards" -ForegroundColor Green

Invoke-RestMethod `
    -Method Post `
    -Uri "$backend/api/telemetry" `
    -ContentType "application/json" `
    -Body '{"event":"deployment-check","details":{"durationMs":1,"text":"must not be stored"}}' `
    -TimeoutSec 20 | Out-Null

$blockedTelemetryStatus = $null
try {
    Invoke-WebRequest -UseBasicParsing -Uri "$backend/api/telemetry/summary" -TimeoutSec 20 | Out-Null
    throw "Telemetry summary unexpectedly allowed access without ADMIN_TOKEN."
} catch {
    if ($_.Exception.Response) {
        $blockedTelemetryStatus = [int]$_.Exception.Response.StatusCode
    } else {
        throw
    }
}
if ($blockedTelemetryStatus -ne 403) {
    throw "Telemetry summary should return 403 without token, got HTTP $blockedTelemetryStatus."
}
Write-Host "Telemetry summary: protected without token" -ForegroundColor Green

if ($AdminToken) {
    $telemetrySummary = Invoke-RestMethod `
        -Uri "$backend/api/telemetry/summary" `
        -Headers @{ "X-Admin-Token" = $AdminToken } `
        -TimeoutSec 20
    if ($telemetrySummary.total_events -lt 1) {
        throw "Telemetry summary did not include the deployment-check event."
    }
    Write-Host "Telemetry summary: accessible with admin token, total events $($telemetrySummary.total_events)" -ForegroundColor Green
} else {
    Write-Host "Telemetry summary token check skipped. Pass -AdminToken to verify the protected summary payload." -ForegroundColor Yellow
}

$sessionResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$backend/api/sessions" `
    -ContentType "application/json" `
    -Body '{"practice_mode":true,"answer_expansion_mode":true,"voice_playback_enabled":false}' `
    -TimeoutSec 20
if ($sessionResponse.session.phase -ne "identity") {
    throw "Session smoke test did not start in identity phase."
}

$answerBody = @{
    session = $sessionResponse.session
    answer = "You can call me Alex."
    source = "text"
    duration = $null
} | ConvertTo-Json -Depth 30 -Compress
$answerResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$backend/api/answer" `
    -ContentType "application/json" `
    -Body $answerBody `
    -TimeoutSec 20
if ($answerResponse.session.phase -ne "part1") {
    throw "Answer smoke test did not advance to Part 1."
}
Write-Host "Core API flow: session start -> identity answer -> Part 1" -ForegroundColor Green

$frontendResponse = Invoke-WebRequest -UseBasicParsing -Uri $frontend -TimeoutSec 20
if ($frontendResponse.StatusCode -lt 200 -or $frontendResponse.StatusCode -ge 400) {
    throw "Frontend returned HTTP $($frontendResponse.StatusCode)"
}
if ($frontendResponse.Content -notmatch "Examiner Victoria") {
    throw "Frontend HTML does not look like Examiner Victoria."
}
Write-Host "Frontend status: HTTP $($frontendResponse.StatusCode)" -ForegroundColor Green

Write-Host "Deployment smoke check passed." -ForegroundColor Green
