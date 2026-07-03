param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_common.ps1")

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot
$python = Resolve-V2Python
$pnpm = Resolve-V2Pnpm
Add-V2PythonPath -RepoRoot $repoRoot

Write-Host "Running Examiner Victoria V2 checks..." -ForegroundColor Cyan

if (-not $SkipInstall) {
    Invoke-V2Native $python -m pip install -r .\v2\backend\requirements.txt
    Push-Location .\v2\frontend
    Invoke-V2Native $pnpm install
    Pop-Location
}

$requiredStructureFiles = @(
    ".\v2\frontend\src\App.jsx",
    ".\v2\frontend\src\components\layout\AnswerComposer.jsx",
    ".\v2\frontend\src\components\layout\ChatPanel.jsx",
    ".\v2\frontend\src\components\layout\ExamHeader.jsx",
    ".\v2\frontend\src\components\layout\ExamStageCard.jsx",
    ".\v2\frontend\src\components\messages\MessageViews.jsx",
    ".\v2\frontend\src\hooks\useAnswerRecording.js",
    ".\v2\frontend\src\hooks\useBrowserEffects.js",
    ".\v2\frontend\src\hooks\useExamController.js",
    ".\v2\frontend\src\hooks\useSpeechPlayback.js",
    ".\v2\frontend\src\state\actions.js",
    ".\v2\frontend\src\state\appReducer.js",
    ".\v2\frontend\src\state\initialState.js",
    ".\v2\frontend\src\state\selectors.js",
    ".\v2\frontend\src\utils\sessionView.js",
    ".\v2\frontend\src\styles.css",
    ".\v2\frontend\src\styles\base.css",
    ".\v2\frontend\src\styles\header.css",
    ".\v2\frontend\src\styles\stage.css",
    ".\v2\frontend\src\styles\chat.css",
    ".\v2\frontend\src\styles\report.css",
    ".\v2\frontend\src\styles\composer.css",
    ".\v2\frontend\src\styles\mobile.css",
    ".\v2\backend\app.py",
    ".\v2\backend\core\config.py",
    ".\v2\backend\core\payload_limits.py",
    ".\v2\backend\core\rate_limit.py",
    ".\v2\backend\engine.py",
    ".\v2\backend\ai_provider.py",
    ".\v2\backend\audio_services.py",
    ".\v2\backend\exam_flow_service.py",
    ".\v2\backend\feedback_service.py",
    ".\v2\backend\part3_service.py",
    ".\v2\backend\question_bank_service.py",
    ".\v2\backend\report_service.py",
    ".\v2\backend\routes\answer.py",
    ".\v2\backend\routes\audio.py",
    ".\v2\backend\routes\health.py",
    ".\v2\backend\routes\report.py",
    ".\v2\backend\routes\sessions.py",
    ".\v2\backend\routes\telemetry.py",
    ".\v2\backend\schemas.py"
)
foreach ($structureFile in $requiredStructureFiles) {
    if (-not (Test-Path -LiteralPath $structureFile)) {
        throw "Required V2 structure file is missing: $structureFile"
    }
}

$appLineCount = (Get-Content -LiteralPath ".\v2\frontend\src\App.jsx").Count
if ($appLineCount -gt 360) {
    throw "App.jsx has grown to $appLineCount lines. Keep App.jsx as a coordinator and move UI/detail logic into components, hooks, or utils."
}

$backendAppLineCount = (Get-Content -LiteralPath ".\v2\backend\app.py").Count
if ($backendAppLineCount -gt 180) {
    throw "backend/app.py has grown to $backendAppLineCount lines. Keep it as an app factory, router mount, and static frontend shell."
}

$engineLineCount = (Get-Content -LiteralPath ".\v2\backend\engine.py").Count
if ($engineLineCount -gt 180) {
    throw "engine.py has grown to $engineLineCount lines. Keep engine.py as a coordinator and move domain logic into service modules."
}

$mainJsx = Get-Content -LiteralPath ".\v2\frontend\src\main.jsx" -Raw
$stylesImportIndex = $mainJsx.IndexOf('import "./styles.css";')
$mobileStylesImportIndex = $mainJsx.IndexOf('import "./styles/mobile.css";')
if ($stylesImportIndex -lt 0 -or $mobileStylesImportIndex -lt 0 -or $stylesImportIndex -gt $mobileStylesImportIndex) {
    throw "Frontend style imports must load styles.css before styles/mobile.css."
}

$desktopStyles = Get-Content -LiteralPath ".\v2\frontend\src\styles.css" -Raw
$mobileStyles = Get-Content -LiteralPath ".\v2\frontend\src\styles\mobile.css" -Raw
$requiredStyleImports = @(
    '@import "./styles/base.css";',
    '@import "./styles/header.css";',
    '@import "./styles/stage.css";',
    '@import "./styles/chat.css";',
    '@import "./styles/report.css";',
    '@import "./styles/composer.css";'
)
foreach ($styleImport in $requiredStyleImports) {
    if (-not $desktopStyles.Contains($styleImport)) {
        throw "styles.css must remain a shared CSS entrypoint and import: $styleImport"
    }
}
$nonMobileStyleFiles = Get-ChildItem -LiteralPath ".\v2\frontend\src\styles" -Filter "*.css" -File |
    Where-Object { $_.Name -ne "mobile.css" }
foreach ($styleFile in $nonMobileStyleFiles) {
    $styleText = Get-Content -LiteralPath $styleFile.FullName -Raw
    if ($styleText -match "@media\s*\(max-width:\s*620px\)") {
        throw "Phone breakpoint rules should live in v2/frontend/src/styles/mobile.css, not $($styleFile.Name)."
    }
}
if ($mobileStyles -notmatch "@media\s*\(max-width:\s*620px\)") {
    throw "styles/mobile.css should contain the phone breakpoint rules."
}
if ($mobileStyles -match "\.(assistant-row|user-row|assistant-bubble|user-bubble)\b") {
    throw "styles/mobile.css references old message selectors. Use .message-row.assistant/.message-row.user and their .bubble children."
}
if ($mobileStyles -notmatch "\.message-row\.assistant" -or $mobileStyles -notmatch "\.message-row\.user") {
    throw "styles/mobile.css must target the real mobile message row selectors."
}
if ($mobileStyles -notmatch "-webkit-overflow-scrolling:\s*touch" -or $mobileStyles -notmatch "touch-action:\s*pan-y") {
    throw "styles/mobile.css must keep iOS chat-panel touch scrolling enabled."
}

$frontendSourceFiles = Get-ChildItem -LiteralPath ".\v2\frontend\src" -Recurse -File |
    Where-Object { $_.Extension -in @(".js", ".jsx") -and $_.Name -ne "api.js" }
foreach ($frontendFile in $frontendSourceFiles) {
    $frontendText = Get-Content -LiteralPath $frontendFile.FullName -Raw
    if ($frontendText -match "\bfetch\s*\(") {
        throw "Frontend API calls must go through v2/frontend/src/api.js, but fetch() appears in $($frontendFile.FullName)."
    }
}

$backendServiceFiles = Get-ChildItem -LiteralPath ".\v2\backend" -Filter "*_service.py" -File
foreach ($serviceFile in $backendServiceFiles) {
    $serviceText = Get-Content -LiteralPath $serviceFile.FullName -Raw
    if ($serviceText -match "from\s+fastapi|import\s+fastapi") {
        throw "Backend service modules must not depend on FastAPI: $($serviceFile.Name)"
    }
}

Invoke-V2Native $python -m py_compile `
    .\v2\backend\ai_provider.py `
    .\v2\backend\core\config.py `
    .\v2\backend\core\payload_limits.py `
    .\v2\backend\core\rate_limit.py `
    .\v2\backend\audio_services.py `
    .\v2\backend\exam_flow_service.py `
    .\v2\backend\feedback_service.py `
    .\v2\backend\part3_service.py `
    .\v2\backend\question_bank_service.py `
    .\v2\backend\report_service.py `
    .\v2\backend\schemas.py `
    .\v2\backend\engine.py `
    .\v2\backend\routes\answer.py `
    .\v2\backend\routes\audio.py `
    .\v2\backend\routes\health.py `
    .\v2\backend\routes\report.py `
    .\v2\backend\routes\sessions.py `
    .\v2\backend\routes\telemetry.py `
    .\v2\backend\app.py `
    .\v2\backend\smoke_test.py `
    .\question_bank.py `
    .\pdf_recall_question_bank.py `
    .\validate_question_bank.py

$scriptFiles = @(
    ".\v2\scripts\_common.ps1",
    ".\v2\scripts\check_v2.ps1",
    ".\v2\scripts\run_backend.ps1",
    ".\v2\scripts\run_frontend.ps1",
    ".\v2\scripts\run_local_stack.ps1",
    ".\v2\scripts\start_https_tunnel.ps1",
    ".\v2\scripts\check_local_preview.ps1",
    ".\v2\scripts\check_mobile_qa_result.ps1",
    ".\v2\scripts\check_git_ready.ps1",
    ".\v2\scripts\stop_local_stack.ps1",
    ".\v2\scripts\check_deployed_v2.ps1",
    ".\v2\scripts\check_deploy_config.ps1",
    ".\v2\scripts\prepare_public_deploy_bundle.ps1",
    ".\v2\scripts\generate_admin_token.ps1",
    ".\v2\scripts\sync_public_deploy_github.ps1"
)
foreach ($scriptFile in $scriptFiles) {
    $tokens = $null
    $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path -LiteralPath $scriptFile),
        [ref]$tokens,
        [ref]$parseErrors
    ) | Out-Null
    if ($parseErrors.Count -gt 0) {
        throw "PowerShell parse failed for ${scriptFile}: $($parseErrors[0].Message)"
    }
}

Invoke-V2Native $python .\validate_question_bank.py
Invoke-V2Native $python -m v2.backend.smoke_test
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1

Push-Location .\v2\frontend
Invoke-V2Native $pnpm run test:smoke
Invoke-V2Native $pnpm run build
Pop-Location

$distIndex = Join-Path $repoRoot "v2\frontend\dist\index.html"
if (-not (Test-Path -LiteralPath $distIndex)) {
    throw "Frontend build did not create v2\frontend\dist\index.html"
}
$distHtml = Get-Content -LiteralPath $distIndex -Raw
if ($distHtml -match "@vite/client" -or $distHtml -match "/src/main.jsx") {
    throw "Frontend dist still references Vite dev files instead of production assets."
}
if ($distHtml -notmatch "/assets/index-.*\.js" -or $distHtml -notmatch "/assets/index-.*\.css") {
    throw "Frontend dist does not reference expected production JS/CSS assets."
}

$distJsFiles = Get-ChildItem -LiteralPath (Join-Path $repoRoot "v2\frontend\dist\assets") -Filter "index-*.js" -File
if (-not $distJsFiles) {
    throw "Frontend build did not create a production JS bundle."
}
$distJsText = ($distJsFiles | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"
$requiredTestIds = @(
    "exam-header",
    "training-mode-select",
    "practice-type-select",
    "answer-composer",
    "composer-mode-toggle",
    "record-button",
    "chat-panel",
    "message-user",
    "message-assistant"
)
foreach ($testId in $requiredTestIds) {
    if (-not $distJsText.Contains($testId)) {
        throw "Frontend production bundle is missing required data-testid: $testId"
    }
}

$sourceFiles = Get-ChildItem -LiteralPath $repoRoot -Recurse -File |
    Where-Object {
        $_.FullName -notmatch "\\\.git\\" -and
        $_.FullName -notmatch "\\tmp\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.Name -notmatch "^\.env" -and
        $_.Extension -in @(".py", ".js", ".jsx", ".md", ".ps1", ".yml", ".yaml", ".txt")
    }
$secretPattern = "sk-[A-Za-z0-9]{20,}"
foreach ($file in $sourceFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match $secretPattern) {
        throw "Possible API key found in source file: $($file.FullName)"
    }
}

Write-Host "All V2 checks passed." -ForegroundColor Green
