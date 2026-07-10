param(
    [switch]$BuildDockerImage,
    [string]$ImageTag = "examiner-victoria-v2:local-check"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

Write-Host "Checking Examiner Victoria V2 deployment config..." -ForegroundColor Cyan

$requiredFiles = @(
    ".\Dockerfile",
    ".\.dockerignore",
    ".\railway.json",
    ".\render.yaml",
    ".\deploy\vps\Caddyfile",
    ".\deploy\vps\docker-compose.yml",
    ".\deploy\vps\.env.example",
    ".\deploy\vps\README.md",
    ".\v2\scripts\prepare_public_deploy_bundle.ps1",
    ".\v2\scripts\generate_admin_token.ps1",
    ".\v2\scripts\sync_public_deploy_github.ps1",
    ".\v2\backend\.env.example",
    ".\v2\backend\requirements.txt",
    ".\v2\frontend\package.json",
    ".\v2\frontend\pnpm-lock.yaml"
)
foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file)) {
        throw "Required deployment file is missing: $file"
    }
}

$dockerfile = Get-Content -LiteralPath ".\Dockerfile" -Raw
$requiredDockerMarkers = @(
    "FROM node:",
    "pnpm install --frozen-lockfile",
    "pnpm run build",
    "FROM python:",
    "FRONTEND_DIST=/app/v2/frontend/dist",
    "question_bank.py",
    "uvicorn v2.backend.app:app"
)
foreach ($marker in $requiredDockerMarkers) {
    if (-not $dockerfile.Contains($marker)) {
        throw "Dockerfile is missing expected marker: $marker"
    }
}

$railway = Get-Content -LiteralPath ".\railway.json" -Raw | ConvertFrom-Json
if ($railway.build.builder -ne "DOCKERFILE") {
    throw "railway.json must use the Dockerfile builder."
}
if ($railway.deploy.healthcheckPath -ne "/api/health") {
    throw "railway.json should health-check /api/health."
}

$renderYaml = Get-Content -LiteralPath ".\render.yaml" -Raw
foreach ($marker in @("env: docker", "dockerfilePath: ./Dockerfile", "healthCheckPath: /api/health", "API_KEY", "ADMIN_TOKEN", "TELEMETRY_MAX_EVENTS")) {
    if (-not $renderYaml.Contains($marker)) {
        throw "render.yaml is missing expected marker: $marker"
    }
}

$dockerignore = Get-Content -LiteralPath ".\.dockerignore" -Raw
foreach ($marker in @(".env", "node_modules", "v2/frontend/dist", "tmp")) {
    if (-not $dockerignore.Contains($marker)) {
        throw ".dockerignore is missing expected marker: $marker"
    }
}

$bundleScript = Get-Content -LiteralPath ".\v2\scripts\prepare_public_deploy_bundle.ps1" -Raw
foreach ($marker in @("examiner-victoria-v2-deploy-bundle.zip", "Test-ShouldIncludeBundlePath", "Dockerfile", "deploy", "railway.json", "render.yaml", "secretPattern")) {
    if (-not $bundleScript.Contains($marker)) {
        throw "prepare_public_deploy_bundle.ps1 is missing expected marker: $marker"
    }
}

$syncScript = Get-Content -LiteralPath ".\v2\scripts\sync_public_deploy_github.ps1" -Raw
foreach ($marker in @("param(", "-Push", "Dry run complete", "gh auth status", "git push", "add .")) {
    if (-not $syncScript.Contains($marker)) {
        throw "sync_public_deploy_github.ps1 is missing expected marker: $marker"
    }
}

$compose = Get-Content -LiteralPath ".\deploy\vps\docker-compose.yml" -Raw
foreach ($marker in @("services:", "app:", "caddy:", "dockerfile: Dockerfile", "80:80", "443:443", "caddy_data")) {
    if (-not $compose.Contains($marker)) {
        throw "deploy/vps/docker-compose.yml is missing expected marker: $marker"
    }
}

$caddyfile = Get-Content -LiteralPath ".\deploy\vps\Caddyfile" -Raw
foreach ($marker in @('email {$ACME_EMAIL}', '{$DOMAIN}', "reverse_proxy app:8080")) {
    if (-not $caddyfile.Contains($marker)) {
        throw "deploy/vps/Caddyfile is missing expected marker: $marker"
    }
}

$backendEnvExample = Get-Content -LiteralPath ".\v2\backend\.env.example" -Raw
foreach ($marker in @("API_KEY=", "BASE_URL=", "MODEL=", "TRANSCRIPTION_MODEL=", "ADMIN_TOKEN=", "TELEMETRY_MAX_EVENTS=")) {
    if (-not $backendEnvExample.Contains($marker)) {
        throw "v2/backend/.env.example is missing expected marker: $marker"
    }
}

$vpsEnvExample = Get-Content -LiteralPath ".\deploy\vps\.env.example" -Raw
foreach ($marker in @("DOMAIN=", "ACME_EMAIL=", "API_KEY=", "CORS_ORIGINS=https://", "ADMIN_TOKEN=", "TELEMETRY_MAX_EVENTS=")) {
    if (-not $vpsEnvExample.Contains($marker)) {
        throw "deploy/vps/.env.example is missing expected marker: $marker"
    }
}

if ($BuildDockerImage) {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $docker) {
        throw "Docker was not found. Install Docker Desktop or rerun without -BuildDockerImage."
    }
    & $docker.Source build -t $ImageTag .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed with exit code $LASTEXITCODE."
    }
}

Write-Host "Deployment config check passed." -ForegroundColor Green
