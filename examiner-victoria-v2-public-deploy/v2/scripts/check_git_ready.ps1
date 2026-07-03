param()

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

Write-Host "Checking Git/GitHub readiness for Examiner Victoria V2..." -ForegroundColor Cyan
Write-Host "Project directory: $repoRoot"

$gitTop = $null
try {
    $gitTop = (& git rev-parse --show-toplevel 2>$null)
} catch {
    $gitTop = $null
}

if (-not $gitTop) {
    $gitDir = Join-Path $repoRoot ".git"
    if (Test-Path -LiteralPath $gitDir) {
        $gitChildren = Get-ChildItem -Force -LiteralPath $gitDir -ErrorAction SilentlyContinue
        if (-not $gitChildren) {
            Write-Host "A .git folder exists, but it is empty, so this directory is not a valid Git repository." -ForegroundColor Yellow
        } else {
            Write-Host "A .git folder exists, but Git does not recognize it as a valid repository." -ForegroundColor Yellow
        }
    } else {
        Write-Host "No .git folder was found here." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Before pushing V2 to GitHub, copy this project into a valid clone or initialize Git intentionally."
    Write-Host "Do not run destructive Git reset/checkout commands in this folder."
    exit 1
}

Write-Host "Git repository: $gitTop" -ForegroundColor Green

$branch = (& git branch --show-current)
if ($branch) {
    Write-Host "Current branch: $branch"
}

$remote = (& git remote -v)
if ($remote) {
    Write-Host "Remotes:"
    $remote | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "No Git remote configured." -ForegroundColor Yellow
}

$status = (& git status --short)
if ($status) {
    Write-Host ""
    Write-Host "Pending changes:" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "Working tree is clean." -ForegroundColor Green
}

$ghPath = Join-Path $repoRoot ".tools\gh\bin\gh.exe"
if (Test-Path -LiteralPath $ghPath) {
    Write-Host ""
    Write-Host "GitHub CLI found: $ghPath"
    try {
        & $ghPath auth status
    } catch {
        Write-Host "GitHub CLI auth check failed. Re-authenticate before pushing or opening PRs." -ForegroundColor Yellow
    }
} else {
    Write-Host "Bundled GitHub CLI was not found under .tools\gh\bin\gh.exe." -ForegroundColor Yellow
}

