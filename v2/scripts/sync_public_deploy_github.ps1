param(
    [switch]$Push,
    [string]$Repository = "waterhomie/examiner-victoria-v2",
    [string]$Branch = "main",
    [string]$CommitMessage = "Update Examiner Victoria V2 public deploy bundle",
    [string]$ClonePath = ""
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

function Test-IsSafeChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$ParentPath,
        [Parameter(Mandatory = $true)][string]$ChildPath
    )
    $parent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd('\')
    $child = [System.IO.Path]::GetFullPath($ChildPath).TrimEnd('\')
    return $child -eq $parent -or $child.StartsWith("$parent\", [System.StringComparison]::OrdinalIgnoreCase)
}

function Resolve-V2Git {
    $bundledGit = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
    if (Test-Path -LiteralPath $bundledGit) {
        return $bundledGit
    }
    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCommand) {
        return $gitCommand.Source
    }
    throw "git was not found. Install Git or use the bundled Codex runtime."
}

function Resolve-V2Gh {
    $localGh = Join-Path (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")) ".tools\gh\bin\gh.exe"
    if (Test-Path -LiteralPath $localGh) {
        return $localGh
    }
    $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghCommand) {
        return $ghCommand.Source
    }
    throw "GitHub CLI was not found. Install gh or run .\.tools\gh\bin\gh.exe auth login first."
}

$repoRoot = Resolve-RealPath (Join-Path $PSScriptRoot "..\..")
$tmpRoot = Join-Path $repoRoot "tmp"
$stagingRoot = Join-Path $tmpRoot "examiner-victoria-v2-deploy-bundle"
$outputZip = Join-Path $tmpRoot "examiner-victoria-v2-deploy-bundle.zip"
$prepareScript = Join-Path $PSScriptRoot "prepare_public_deploy_bundle.ps1"

Write-Host "Preparing public deployment bundle..." -ForegroundColor Cyan
powershell.exe -ExecutionPolicy Bypass -File $prepareScript -OutputZip $outputZip -KeepStaging
if ($LASTEXITCODE -ne 0) {
    throw "prepare_public_deploy_bundle.ps1 failed with exit code $LASTEXITCODE."
}

if (-not (Test-Path -LiteralPath $outputZip)) {
    throw "Bundle zip was not created: $outputZip"
}
if (-not (Test-Path -LiteralPath (Join-Path $stagingRoot "Dockerfile"))) {
    throw "Bundle staging folder is missing Dockerfile."
}

$stagedFiles = Get-ChildItem -LiteralPath $stagingRoot -Recurse -File
Write-Host "Bundle ready: $outputZip" -ForegroundColor Green
Write-Host "Staged files: $($stagedFiles.Count)"

if (-not $Push) {
    Write-Host "Dry run complete. Rerun with -Push to sync GitHub repository $Repository." -ForegroundColor Yellow
    return
}

$git = Resolve-V2Git
$gh = Resolve-V2Gh

& $gh auth status
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not authenticated. Run gh auth login first."
}

if (-not $ClonePath) {
    $ClonePath = Join-Path $tmpRoot "github-sync-examiner-victoria-v2"
}
$cloneFull = [System.IO.Path]::GetFullPath($ClonePath)
if (-not (Test-IsSafeChildPath -ParentPath $tmpRoot -ChildPath $cloneFull)) {
    throw "ClonePath must be inside project tmp folder: $tmpRoot"
}

if (-not (Test-Path -LiteralPath $cloneFull)) {
    & $gh repo clone $Repository $cloneFull
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub clone failed for $Repository."
    }
}

& $git -C $cloneFull fetch origin $Branch
if ($LASTEXITCODE -ne 0) {
    throw "git fetch failed."
}
& $git -C $cloneFull checkout $Branch
if ($LASTEXITCODE -ne 0) {
    throw "git checkout failed."
}
& $git -C $cloneFull pull --ff-only origin $Branch
if ($LASTEXITCODE -ne 0) {
    throw "git pull failed."
}

$targetRoot = $cloneFull
if (-not (Test-IsSafeChildPath -ParentPath $cloneFull -ChildPath $targetRoot)) {
    throw "Refusing to sync outside cloned repository: $targetRoot"
}

Get-ChildItem -LiteralPath $targetRoot -Force |
    Where-Object { $_.Name -ne ".git" } |
    Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $stagingRoot -Force |
    Copy-Item -Destination $targetRoot -Recurse -Force

& $git -C $cloneFull status --short
if ($LASTEXITCODE -ne 0) {
    throw "git status failed."
}
$changed = & $git -C $cloneFull status --porcelain
if (-not $changed) {
    Write-Host "No GitHub sync changes to commit." -ForegroundColor Green
    return
}

& $git -C $cloneFull add .
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}
& $git -C $cloneFull commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}
& $git -C $cloneFull push origin $Branch
if ($LASTEXITCODE -ne 0) {
    throw "git push failed."
}

Write-Host "Pushed public deployment bundle to $Repository#$Branch." -ForegroundColor Green
