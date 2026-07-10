param(
    [int]$BackendPort = 8010,
    [int]$FrontendPort = 5174,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_common.ps1")

function Resolve-RealPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $item = Get-Item -LiteralPath $Path -Force
    if ($item.LinkType -eq "Junction" -and $item.Target) {
        return [string]$item.Target[0]
    }
    return $item.FullName
}

function Test-PortFree {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return -not $connection
}

function Get-LanIPv4Address {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Sort-Object -Property @{
            Expression = { if ($_.InterfaceAlias -match "Wi-Fi|WLAN|无线") { 0 } else { 1 } }
        }, InterfaceMetric

    return ($candidates | Select-Object -First 1).IPAddress
}

$repoRoot = Resolve-RealPath (Join-Path $PSScriptRoot "..\..")
$frontendRoot = Join-Path $repoRoot "v2\frontend"
$frontendDist = Join-Path $frontendRoot "dist"
$tmpRoot = Join-Path $repoRoot "tmp"
$appPort = $FrontendPort
$python = Resolve-V2Python
$pnpm = Resolve-V2Pnpm
$nodeBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$node = Join-Path $nodeBin "node.exe"
$viteCli = Join-Path $frontendRoot "node_modules\vite\bin\vite.js"

if (Test-Path -LiteralPath $nodeBin) {
    $env:PATH = "$nodeBin;$env:PATH"
}

if (-not (Test-Path -LiteralPath $node)) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw "Node.js was not found. Install Node.js or use the bundled Codex runtime."
    }
    $node = $nodeCommand.Source
}

if (-not (Test-Path -LiteralPath $tmpRoot)) {
    New-Item -ItemType Directory -Path $tmpRoot | Out-Null
}

if (-not (Test-PortFree $appPort)) {
    throw "App port $appPort is already in use. Stop that process or choose another -FrontendPort."
}

Write-Host "Examiner Victoria V2 fullstack local preview" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"
if ($BackendPort -ne $FrontendPort) {
    Write-Host "Single-process mode: frontend and API will both run on port $FrontendPort. BackendPort $BackendPort is accepted for compatibility only." -ForegroundColor Yellow
}
Write-Host "App/API:    http://127.0.0.1:$appPort"

$lanIp = Get-LanIPv4Address
if ($lanIp) {
    Write-Host "Phone URL:  http://$lanIp`:$appPort" -ForegroundColor Green
}

if (-not $SkipInstall) {
    Write-Host "Installing backend/frontend dependencies..." -ForegroundColor Cyan
    Set-Location -LiteralPath $repoRoot
    Invoke-V2Native $python -m pip install -r .\v2\backend\requirements.txt
    Set-Location -LiteralPath $frontendRoot
    Invoke-V2Native $pnpm install
}

if (-not (Test-Path -LiteralPath $viteCli)) {
    throw "Vite was not found at $viteCli. Run this script without -SkipInstall first."
}

Write-Host "Building frontend bundle..." -ForegroundColor Cyan
Set-Location -LiteralPath $frontendRoot
$env:VITE_API_BASE = ""
Invoke-V2Native $node $viteCli build

$backendOut = Join-Path $tmpRoot "v2_backend.out.log"
$backendErr = Join-Path $tmpRoot "v2_backend.err.log"
$frontendOut = Join-Path $tmpRoot "v2_frontend.out.log"
$frontendErr = Join-Path $tmpRoot "v2_frontend.err.log"
$pidFile = Join-Path $tmpRoot "v2_server_pids.txt"

Remove-Item -LiteralPath $backendOut, $backendErr, $frontendOut, $frontendErr -Force -ErrorAction SilentlyContinue

$localDeps = Join-Path $tmpRoot "v2_backend_deps"
$pythonPathParts = @($repoRoot)
if (Test-Path -LiteralPath $localDeps) {
    $pythonPathParts = @($localDeps) + $pythonPathParts
}
$pythonPath = $pythonPathParts -join ";"

$corsOrigins = "http://127.0.0.1:$appPort,http://localhost:$appPort"
if ($lanIp) {
    $corsOrigins = "$corsOrigins,http://$lanIp`:$appPort"
}

$env:PYTHONPATH = $pythonPath
$env:CORS_ORIGINS = $corsOrigins
$env:FRONTEND_DIST = $frontendDist

$appProcess = Start-Process `
    -FilePath $python `
    -ArgumentList @("-m", "uvicorn", "v2.backend.app:app", "--host", "0.0.0.0", "--port", "$appPort") `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr `
    -WindowStyle Hidden `
    -PassThru

@(
    "app=$($appProcess.Id)",
    "backend=$($appProcess.Id)",
    "frontend=$($appProcess.Id)"
) | Set-Content -LiteralPath $pidFile -Encoding UTF8

Write-Host "Started app PID $($appProcess.Id)."
Write-Host "Logs:"
Write-Host "  $backendErr"

Start-Sleep -Seconds 2

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/health" -TimeoutSec 4
    Write-Host "API health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "API did not become healthy yet. Check $backendErr" -ForegroundColor Yellow
}

try {
    $frontend = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$appPort" -TimeoutSec 4
    Write-Host "Frontend status: $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Frontend did not respond yet. Check $backendErr" -ForegroundColor Yellow
}

Write-Host "Open http://127.0.0.1:$appPort"
if ($lanIp) {
    Write-Host "Open on your phone: http://$lanIp`:$appPort" -ForegroundColor Green
    Write-Host "Voice recording on iPhone still requires HTTPS; this local HTTP URL is for layout/text testing." -ForegroundColor Yellow
}
