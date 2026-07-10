param(
    [string]$ResultPath = ".\v2\MOBILE_QA_RESULT.md",
    [switch]$AllowPartial
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

$repoRoot = Resolve-RealPath (Join-Path $PSScriptRoot "..\..")
Set-Location -LiteralPath $repoRoot

Write-Host "Checking Examiner Victoria V2 mobile QA result..." -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $ResultPath)) {
    throw "Mobile QA result is missing. Copy v2\MOBILE_QA_RESULT.template.md to v2\MOBILE_QA_RESULT.md after real-device testing, then fill it in."
}

$content = Get-Content -LiteralPath $ResultPath -Raw

$decisionPatterns = @{
    Pass = "- \[[xX]\] Pass: V2 mobile loop is acceptable for private beta\."
    Partial = "- \[[xX]\] Partial pass: text loop is acceptable, voice loop needs more work\."
    Fail = "- \[[xX]\] Fail: do not share V2 yet\."
}

$checked = @()
foreach ($decision in $decisionPatterns.Keys) {
    if ($content -match $decisionPatterns[$decision]) {
        $checked += $decision
    }
}

if ($checked.Count -eq 0) {
    throw "Mobile QA result has no final decision checked. Mark exactly one Final decision item."
}

if ($checked.Count -gt 1) {
    throw "Mobile QA result has multiple final decisions checked: $($checked -join ', '). Mark exactly one."
}

$finalDecision = $checked[0]
Write-Host "Mobile QA final decision: $finalDecision"

if ($finalDecision -eq "Fail") {
    throw "Mobile QA failed. Do not share or replace the Streamlit fallback with V2 yet."
}

if ($finalDecision -eq "Partial" -and -not $AllowPartial) {
    throw "Mobile QA is partial. Re-run with -AllowPartial only when intentionally accepting text-only/private testing."
}

$requiredCheckedItems = @(
    "HTTPS URL opens on phone",
    "Tap Text",
    "Send answer",
    "User answer appears",
    "Victoria asks the next question",
    "Composer is ready for the next turn"
)

foreach ($item in $requiredCheckedItems) {
    $escaped = [regex]::Escape($item)
    if ($content -notmatch "- \[[xX]\] $escaped") {
        throw "Mobile QA result is missing required checked item: $item"
    }
}

if ($finalDecision -eq "Pass") {
    $voiceItems = @(
        "Tap once to start recording",
        "Tap again to stop and send",
        "Transcription appears as user answer",
        "Victoria voice plays after user gesture"
    )
    foreach ($item in $voiceItems) {
        $escaped = [regex]::Escape($item)
        if ($content -notmatch "- \[[xX]\] $escaped") {
            throw "Mobile QA Pass requires checked voice item: $item"
        }
    }
}

Write-Host "Mobile QA result check passed." -ForegroundColor Green

