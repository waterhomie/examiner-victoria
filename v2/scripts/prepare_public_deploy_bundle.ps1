param(
    [string]$OutputZip = "",
    [switch]$KeepStaging
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

function Test-IsSafeChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$ParentPath,
        [Parameter(Mandatory = $true)][string]$ChildPath
    )
    $parent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd('\')
    $child = [System.IO.Path]::GetFullPath($ChildPath).TrimEnd('\')
    return $child -eq $parent -or $child.StartsWith("$parent\", [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-ShouldIncludeBundlePath {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $normalized = $RelativePath -replace "/", "\"
    $topLevel = ($normalized -split "\\")[0]
    $allowedTopLevel = @(
        ".dockerignore",
        ".gitignore",
        "Dockerfile",
        "deploy",
        "railway.json",
        "render.yaml",
        "question_bank.py",
        "pdf_recall_question_bank.py",
        "validate_question_bank.py",
        "v2"
    )
    if (-not ($allowedTopLevel -contains $topLevel)) {
        return $false
    }

    $segments = $normalized -split "\\"
    foreach ($segment in $segments) {
        if ($segment -in @("node_modules", "dist", ".vite", "__pycache__")) {
            return $false
        }
    }

    $name = [System.IO.Path]::GetFileName($normalized)
    if (
        $name -eq ".env" -or
        ($name -like ".env.*" -and $name -ne ".env.example") -or
        $name -like "*.pyc" -or
        $name -like "*.log"
    ) {
        return $false
    }

    return $true
}

$repoRoot = Resolve-RealPath (Join-Path $PSScriptRoot "..\..")
$tmpRoot = Join-Path $repoRoot "tmp"
if (-not (Test-Path -LiteralPath $tmpRoot)) {
    New-Item -ItemType Directory -Path $tmpRoot | Out-Null
}

if (-not $OutputZip) {
    $OutputZip = Join-Path $tmpRoot "examiner-victoria-v2-deploy-bundle.zip"
}

$outputZipFull = if ([System.IO.Path]::IsPathRooted($OutputZip)) {
    [System.IO.Path]::GetFullPath($OutputZip)
} else {
    [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputZip))
}
if (-not (Test-IsSafeChildPath -ParentPath $repoRoot -ChildPath $outputZipFull)) {
    throw "OutputZip must be inside the project workspace: $repoRoot"
}

$stagingRoot = Join-Path $tmpRoot "examiner-victoria-v2-deploy-bundle"
$stagingFull = [System.IO.Path]::GetFullPath($stagingRoot)
$tmpFull = [System.IO.Path]::GetFullPath($tmpRoot)
if (-not (Test-IsSafeChildPath -ParentPath $tmpFull -ChildPath $stagingFull)) {
    throw "Refusing to clean staging path outside tmp: $stagingFull"
}

if (Test-Path -LiteralPath $stagingFull) {
    Remove-Item -LiteralPath $stagingFull -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingFull | Out-Null

Write-Host "Preparing Examiner Victoria V2 public deployment bundle..." -ForegroundColor Cyan
Write-Host "Project: $repoRoot"
Write-Host "Staging: $stagingFull"

$copied = 0
$repoPrefixLength = $repoRoot.Length + 1
Get-ChildItem -LiteralPath $repoRoot -Recurse -File -Force |
    ForEach-Object {
        $relativePath = $_.FullName.Substring($repoPrefixLength)
        if (-not (Test-ShouldIncludeBundlePath -RelativePath $relativePath)) {
            return
        }

        $targetPath = Join-Path $stagingFull $relativePath
        $targetDir = Split-Path -Parent $targetPath
        if (-not (Test-Path -LiteralPath $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir | Out-Null
        }
        Copy-Item -LiteralPath $_.FullName -Destination $targetPath
        $script:copied += 1
    }

$secretPattern = "sk-[A-Za-z0-9]{20,}"
$textFiles = Get-ChildItem -LiteralPath $stagingFull -Recurse -File |
    Where-Object { $_.Extension -in @(".py", ".js", ".jsx", ".md", ".ps1", ".json", ".yaml", ".yml", ".txt", ".env", ".example") }
foreach ($file in $textFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match $secretPattern) {
        throw "Possible API key found in deployment bundle staging file: $($file.FullName)"
    }
}

if (Test-Path -LiteralPath $outputZipFull) {
    Remove-Item -LiteralPath $outputZipFull -Force
}
$itemsToArchive = Get-ChildItem -LiteralPath $stagingFull -Force
Compress-Archive -LiteralPath $itemsToArchive.FullName -DestinationPath $outputZipFull -Force

Write-Host "Bundle created:" -ForegroundColor Green
Write-Host "  $outputZipFull"
Write-Host "Files copied: $copied"

if (-not $KeepStaging) {
    Remove-Item -LiteralPath $stagingFull -Recurse -Force
}
