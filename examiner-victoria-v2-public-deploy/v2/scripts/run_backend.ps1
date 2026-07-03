param(
    [int]$Port = 8000,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_common.ps1")

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot
$python = Resolve-V2Python
Add-V2PythonPath -RepoRoot $repoRoot

Write-Host "Examiner Victoria V2 backend" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"

if (-not $env:API_KEY) {
    Write-Host ""
    Write-Host "API_KEY is not set in this terminal." -ForegroundColor Yellow
    Write-Host "Set it before running a real AI session, for example:"
    Write-Host '$env:API_KEY="sk-..."'
    Write-Host '$env:BASE_URL="https://api.gptsapi.net/v1"'
    Write-Host ""
}

if (-not $SkipInstall) {
    Invoke-V2Native $python -m pip install -r .\v2\backend\requirements.txt
}
Invoke-V2Native $python -m uvicorn v2.backend.app:app --reload --host 0.0.0.0 --port $Port
