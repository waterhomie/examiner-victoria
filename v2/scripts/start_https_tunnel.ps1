param(
    [int]$Port = 5174,
    [string]$CloudflaredPath = "",
    [ValidateSet("auto", "quic", "http2")]
    [string]$Protocol = "http2",
    [switch]$Restart
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

function Resolve-Cloudflared {
    param(
        [string]$ExplicitPath,
        [string]$RepoRoot
    )

    if ($ExplicitPath) {
        if (-not (Test-Path -LiteralPath $ExplicitPath)) {
            throw "CloudflaredPath does not exist: $ExplicitPath"
        }
        return (Resolve-Path -LiteralPath $ExplicitPath).Path
    }

    $bundled = Join-Path $RepoRoot ".tools\cloudflared\cloudflared.exe"
    if (Test-Path -LiteralPath $bundled) {
        return $bundled
    }

    $command = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "cloudflared was not found. Expected .tools\cloudflared\cloudflared.exe or cloudflared on PATH."
}

function Stop-RecordedTunnel {
    param([string]$PidFile)

    if (-not (Test-Path -LiteralPath $PidFile)) {
        return
    }

    $pidText = Get-Content -LiteralPath $PidFile -Raw -ErrorAction SilentlyContinue
    if ($pidText -match "(\d+)") {
        $pidValue = [int]$Matches[1]
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped previous tunnel process $pidValue"
    }

    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

$repoRoot = Resolve-RealPath (Join-Path $PSScriptRoot "..\..")
$tmpRoot = Join-Path $repoRoot "tmp"
if (-not (Test-Path -LiteralPath $tmpRoot)) {
    New-Item -ItemType Directory -Path $tmpRoot | Out-Null
}

$pidFile = Join-Path $tmpRoot "v2_tunnel_pid.txt"
$urlFile = Join-Path $tmpRoot "v2_tunnel_url.txt"
$outLog = Join-Path $tmpRoot "v2_cloudflared.out.log"
$errLog = Join-Path $tmpRoot "v2_cloudflared.err.log"
$appUrl = "http://127.0.0.1:$Port"
$healthUrl = "$appUrl/api/health"

if ($Restart) {
    Stop-RecordedTunnel -PidFile $pidFile
    Remove-Item -LiteralPath $urlFile -Force -ErrorAction SilentlyContinue
}

if (Test-Path -LiteralPath $pidFile) {
    $pidText = Get-Content -LiteralPath $pidFile -Raw -ErrorAction SilentlyContinue
    if ($pidText -match "(\d+)") {
        $pidValue = [int]$Matches[1]
        $existing = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "An HTTPS tunnel is already running with PID $pidValue." -ForegroundColor Yellow
            Write-Host "Use -Restart to replace it."
            if (Test-Path -LiteralPath $urlFile) {
                $savedUrl = Get-Content -LiteralPath $urlFile -Raw -ErrorAction SilentlyContinue
                if ($savedUrl) {
                    Write-Host "HTTPS phone URL:" -ForegroundColor Green
                    Write-Output $savedUrl.Trim()
                }
            }
            Write-Host "Logs:"
            Write-Host "  $errLog"
            exit 0
        }
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

try {
    Invoke-RestMethod -Uri $healthUrl -TimeoutSec 4 | Out-Null
} catch {
    throw "Local V2 app is not responding at $healthUrl. Start it first with .\v2\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall"
}

$cloudflared = Resolve-Cloudflared -ExplicitPath $CloudflaredPath -RepoRoot $repoRoot
Remove-Item -LiteralPath $outLog, $errLog -Force -ErrorAction SilentlyContinue

Write-Host "Starting HTTPS tunnel for Examiner Victoria V2..." -ForegroundColor Cyan
Write-Host "Local app: $appUrl"
Write-Host "cloudflared: $cloudflared"
Write-Host "Protocol: $Protocol"

$process = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @("tunnel", "--url", $appUrl, "--no-autoupdate", "--protocol", $Protocol) `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden `
    -PassThru

"tunnel=$($process.Id)" | Set-Content -LiteralPath $pidFile -Encoding UTF8

$publicUrl = $null
for ($attempt = 1; $attempt -le 25; $attempt++) {
    Start-Sleep -Seconds 1

    if ($process.HasExited) {
        $logText = ""
        if (Test-Path -LiteralPath $errLog) {
            $logText = Get-Content -LiteralPath $errLog -Raw -ErrorAction SilentlyContinue
        }
        throw "cloudflared exited before creating a tunnel. Check $errLog. $logText"
    }

    $combinedLogs = ""
    if (Test-Path -LiteralPath $outLog) {
        $combinedLogs += Get-Content -LiteralPath $outLog -Raw -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $errLog) {
        $combinedLogs += "`n"
        $combinedLogs += Get-Content -LiteralPath $errLog -Raw -ErrorAction SilentlyContinue
    }

    $match = [regex]::Match($combinedLogs, "https://[A-Za-z0-9-]+\.trycloudflare\.com")
    if ($match.Success) {
        $publicUrl = $match.Value
        break
    }
}

if (-not $publicUrl) {
    Write-Host "Tunnel process started, but the public URL was not found yet." -ForegroundColor Yellow
    Write-Host "Check logs:"
    Write-Host "  $errLog"
    exit 0
}

$publicUrl | Set-Content -LiteralPath $urlFile -Encoding UTF8

Write-Host "HTTPS phone URL:" -ForegroundColor Green
Write-Output $publicUrl
Write-Host ""
Write-Host "Use this on iPhone Safari or WeChat for microphone testing."
Write-Host "Stop it with: .\v2\scripts\stop_local_stack.ps1"
