param(
    [string]$Ports = "8010,5174"
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
$tmpRoot = Join-Path $repoRoot "tmp"
$pidFile = Join-Path $tmpRoot "v2_server_pids.txt"
$tunnelPidFile = Join-Path $tmpRoot "v2_tunnel_pid.txt"
$tunnelUrlFile = Join-Path $tmpRoot "v2_tunnel_url.txt"
$portList = $Ports -split "[,\s;]+" |
    Where-Object { $_ } |
    ForEach-Object { [int]$_ }

Write-Host "Stopping Examiner Victoria V2 local stack..." -ForegroundColor Cyan
Write-Host "Ports: $($portList -join ', ')"

function Stop-RecordedPids {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $pidLines = Get-Content -LiteralPath $Path
    $seenPids = @{}
    foreach ($line in $pidLines) {
        if ($line -match "=(\d+)$") {
            $pidValue = [int]$Matches[1]
            if ($seenPids.ContainsKey($pidValue)) {
                continue
            }
            $seenPids[$pidValue] = $true
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped recorded process $pidValue"
        }
    }
}

function Stop-ListenersOnPort {
    param([int]$Port)

    for ($attempt = 1; $attempt -le 5; $attempt++) {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if (-not $connections) {
            return
        }

        foreach ($connection in $connections) {
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped process $($connection.OwningProcess) listening on port $Port"
        }

        Start-Sleep -Milliseconds 500
    }

    $remaining = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "Port $Port is still in use. You may need to close it manually." -ForegroundColor Yellow
    }
}

Stop-RecordedPids -Path $pidFile
Stop-RecordedPids -Path $tunnelPidFile

Start-Sleep -Seconds 1

foreach ($port in $portList) {
    Stop-ListenersOnPort -Port $port
}

Remove-Item -LiteralPath $pidFile, $tunnelPidFile, $tunnelUrlFile -Force -ErrorAction SilentlyContinue
Write-Host "Local stack stop command finished." -ForegroundColor Green
