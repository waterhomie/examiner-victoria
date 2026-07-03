param(
    [int]$Port = 5174,
    [string]$TunnelUrl = "",
    [switch]$UseSavedTunnel,
    [switch]$CoreApiFlow
)

$ErrorActionPreference = "Stop"

function Resolve-RealPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $item = Get-Item -LiteralPath $Path -Force
    if ($item.LinkType -eq "Junction" -and $item.Target) {
        return [string]$item.Target[0]
    }
    return $item.FullName
}

function Normalize-Url {
    param([string]$Url)
    return $Url.Trim().TrimEnd("/")
}

function Check-Frontend {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$BaseUrl
    )

    $response = Invoke-WebRequest -UseBasicParsing -Uri $BaseUrl -TimeoutSec 20
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
        throw "$Name frontend returned HTTP $($response.StatusCode)"
    }
    if ($response.Content -notmatch '<div id="root"></div>') {
        throw "$Name frontend HTML does not contain the React root."
    }
    if ($response.Content -notmatch "/assets/index-.*\.js") {
        throw "$Name frontend HTML does not reference the production JS bundle."
    }
    Write-Host "$Name frontend: HTTP $($response.StatusCode)" -ForegroundColor Green
}

function Check-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$BaseUrl
    )

    $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 20
    if ($health.status -ne "ok") {
        throw "$Name API health returned unexpected status: $($health | ConvertTo-Json -Compress)"
    }
    Write-Host "$Name API health: ok" -ForegroundColor Green
    if ($null -ne $health.config) {
        Write-Host "$Name model: $($health.config.model), transcription: $($health.config.transcription_model), API key configured: $($health.config.api_key_configured)" -ForegroundColor Green
    }

    $bank = Invoke-RestMethod -Uri "$BaseUrl/api/question-bank" -TimeoutSec 20
    if ($bank.part2_total_cards -ne 73) {
        throw "$Name unexpected Part 2 card count: $($bank.part2_total_cards)"
    }
    if ($bank.part3_reference_questions -lt 300) {
        throw "$Name unexpected Part 3 reference question count: $($bank.part3_reference_questions)"
    }
    Write-Host "$Name question bank: $($bank.part1_total_questions) Part 1, $($bank.part2_total_cards) Part 2, $($bank.part3_reference_questions) Part 3" -ForegroundColor Green
}

function Check-CoreApiFlow {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$BaseUrl
    )

    $sessionResponse = Invoke-RestMethod `
        -Method Post `
        -Uri "$BaseUrl/api/sessions" `
        -ContentType "application/json" `
        -Body '{"practice_mode":true,"answer_expansion_mode":true,"voice_playback_enabled":false}' `
        -TimeoutSec 30
    if ($sessionResponse.session.phase -ne "identity") {
        throw "$Name session did not start in identity phase."
    }

    $answerBody = @{
        session = $sessionResponse.session
        answer = "You can call me Alex."
        source = "text"
        duration = $null
    } | ConvertTo-Json -Depth 30 -Compress

    $answerResponse = Invoke-RestMethod `
        -Method Post `
        -Uri "$BaseUrl/api/answer" `
        -ContentType "application/json" `
        -Body $answerBody `
        -TimeoutSec 60
    if ($answerResponse.session.phase -ne "part1") {
        throw "$Name answer flow did not advance to Part 1."
    }
    Write-Host "$Name core API flow: session -> identity answer -> Part 1" -ForegroundColor Green
}

$repoRoot = Resolve-RealPath (Join-Path $PSScriptRoot "..\..")
$tmpRoot = Join-Path $repoRoot "tmp"
$savedTunnelFile = Join-Path $tmpRoot "v2_tunnel_url.txt"

$localUrl = Normalize-Url "http://127.0.0.1:$Port"
$targets = @(
    [pscustomobject]@{ Name = "Local"; Url = $localUrl }
)

if ($UseSavedTunnel) {
    if (-not (Test-Path -LiteralPath $savedTunnelFile)) {
        throw "No saved tunnel URL found at $savedTunnelFile. Run start_https_tunnel.ps1 first."
    }
    $TunnelUrl = Get-Content -LiteralPath $savedTunnelFile -Raw
}

if ($TunnelUrl) {
    $targets += [pscustomobject]@{ Name = "HTTPS tunnel"; Url = Normalize-Url $TunnelUrl }
}

Write-Host "Checking Examiner Victoria V2 local preview..." -ForegroundColor Cyan
foreach ($target in $targets) {
    Write-Host ""
    Write-Host "$($target.Name): $($target.Url)" -ForegroundColor Cyan
    Check-Frontend -Name $target.Name -BaseUrl $target.Url
    Check-Api -Name $target.Name -BaseUrl $target.Url
    if ($CoreApiFlow) {
        Check-CoreApiFlow -Name $target.Name -BaseUrl $target.Url
    }
}

Write-Host ""
Write-Host "Local preview check passed." -ForegroundColor Green

