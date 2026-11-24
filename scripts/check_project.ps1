param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_common.ps1")

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot
$python = Resolve-ProjectPython
$pnpm = Resolve-ProjectPnpm
Add-ProjectPythonPath -RepoRoot $repoRoot

Write-Host "Running Examiner Victoria checks..." -ForegroundColor Cyan

if (-not $SkipInstall) {
    Invoke-ProjectNative $python -m pip install -r .\backend\requirements.txt
    Push-Location .\frontend
    Invoke-ProjectNative $pnpm install
    Pop-Location
}

$requiredStructureFiles = @(
    ".\frontend\src\App.jsx",
    ".\frontend\src\components\ui.jsx",
    ".\frontend\src\components\ErrorCard.jsx",
    ".\frontend\src\components\Sheets.jsx",
    ".\frontend\src\components\SystemCheck.jsx",
    ".\frontend\src\components\TranscriptSheet.jsx",
    ".\frontend\src\components\screens\HomeScreen.jsx",
    ".\frontend\src\components\screens\CallScreen.jsx",
    ".\frontend\src\components\screens\ExamScreen.jsx",
    ".\frontend\src\components\screens\MarkingScreen.jsx",
    ".\frontend\src\components\screens\ReviewScreen.jsx",
    ".\frontend\src\components\screens\RetakeScreen.jsx",
    ".\frontend\src\components\screens\RecapScreen.jsx",
    ".\frontend\src\hooks\useAnswerRecording.js",
    ".\frontend\src\hooks\useBrowserEffects.js",
    ".\frontend\src\hooks\useExamController.js",
    ".\frontend\src\hooks\useSpeechPlayback.js",
    ".\frontend\src\state\actions.js",
    ".\frontend\src\state\appReducer.js",
    ".\frontend\src\state\initialState.js",
    ".\frontend\src\utils\sessionView.js",
    ".\frontend\src\utils\feedbackView.js",
    ".\frontend\src\utils\reportView.js",
    ".\frontend\src\styles\tokens.css",
    ".\frontend\src\styles\app.css",
    ".\backend\answer_feedback_service.py",
    ".\backend\app.py",
    ".\backend\core\config.py",
    ".\backend\core\payload_limits.py",
    ".\backend\core\rate_limit.py",
    ".\backend\engine.py",
    ".\backend\ai_provider.py",
    ".\backend\audio_services.py",
    ".\backend\exam_flow_service.py",
    ".\backend\feedback_service.py",
    ".\backend\part3_service.py",
    ".\backend\question_bank_service.py",
    ".\backend\question_bank\__init__.py",
    ".\backend\question_bank\catalog.py",
    ".\backend\question_bank\pdf_recall.py",
    ".\backend\report_service.py",
    ".\backend\routes\answer.py",
    ".\backend\routes\audio.py",
    ".\backend\routes\health.py",
    ".\backend\routes\report.py",
    ".\backend\routes\sessions.py",
    ".\backend\routes\telemetry.py",
    ".\backend\schemas.py"
)
foreach ($structureFile in $requiredStructureFiles) {
    if (-not (Test-Path -LiteralPath $structureFile)) {
        throw "Required structure file is missing: $structureFile"
    }
}

$legacyQuestionBankFile = Join-Path $repoRoot "question_bank.py"
$legacyPdfRecallFile = Join-Path $repoRoot "pdf_recall_question_bank.py"
if ((Test-Path -LiteralPath $legacyQuestionBankFile) -or (Test-Path -LiteralPath $legacyPdfRecallFile)) {
    throw "Legacy root question-bank modules must not exist."
}
$questionBankServiceSource = Get-Content -LiteralPath ".\backend\question_bank_service.py" -Raw
if ($questionBankServiceSource -match "sys\.path" -or $questionBankServiceSource -match "from\s+question_bank" -or $questionBankServiceSource -match "import\s+question_bank") {
    throw "backend/question_bank_service.py must use the backend package without sys.path injection or root imports."
}
$activeQuestionBankPythonFiles = @(
    (Get-ChildItem -LiteralPath ".\backend" -Filter "*.py" -File -Recurse),
    (Get-Item -LiteralPath ".\validate_question_bank.py")
)
foreach ($activeQuestionBankPythonFile in $activeQuestionBankPythonFiles) {
    $activeQuestionBankSource = Get-Content -LiteralPath $activeQuestionBankPythonFile.FullName -Raw
    if ($activeQuestionBankSource -match "(?m)^\s*(from|import)\s+(question_bank|pdf_recall_question_bank)\b") {
        throw "Active Python file imports a legacy root question-bank module: $($activeQuestionBankPythonFile.FullName)"
    }
}
$dockerfileSource = Get-Content -LiteralPath ".\Dockerfile" -Raw
if ($dockerfileSource -match "(?m)^COPY\s+.*(question_bank\.py|pdf_recall_question_bank\.py)") {
    throw "Dockerfile must not copy legacy root question-bank modules."
}

$requiredCurrentFiles = @(
    ".\scripts\check_project.ps1",
    ".\scripts\check_deployed_app.ps1",
    ".\docs\RUN_LOCAL.md",
    ".\docs\DEPLOYMENT.md"
)
foreach ($currentFile in $requiredCurrentFiles) {
    if (-not (Test-Path -LiteralPath $currentFile)) {
        throw "Required current file is missing: $currentFile"
    }
}

$legacyVersionName = "v" + "2"
$historicalRoot = Join-Path $repoRoot $legacyVersionName
$legacyScriptsRoot = Join-Path $historicalRoot "scripts"
if (Test-Path -LiteralPath $legacyScriptsRoot) {
    throw "The historical directory must not contain active scripts."
}

$allowedHistoricalFiles = @(
    "API_CONTRACT.md",
    "CHECKLIST.md",
    "COMPLETION_AUDIT.md",
    "MOBILE_QA.md",
    "MOBILE_QA_RESULT.template.md",
    "README.md"
) | Sort-Object
$trackedHistoricalPaths = @(& git ls-files -- $legacyVersionName)
if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect tracked historical files."
}
$actualHistoricalFiles = foreach ($trackedHistoricalPath in $trackedHistoricalPaths) {
    $relativeHistoricalPath = $trackedHistoricalPath.Substring($legacyVersionName.Length + 1)
    if ($relativeHistoricalPath -match "[/\\]") {
        throw "The historical directory contains an unexpected tracked subdirectory path: $trackedHistoricalPath"
    }
    $relativeHistoricalPath
}
$actualHistoricalFiles = $actualHistoricalFiles | Sort-Object
$historicalDifference = Compare-Object -ReferenceObject $allowedHistoricalFiles -DifferenceObject $actualHistoricalFiles
if ($historicalDifference) {
    throw "The historical directory file allowlist does not match: $($historicalDifference | Out-String)"
}

$legacyFunctionPattern = "(Resolve|Add|Invoke)-" + ("V" + "2")
$legacyScriptsPattern = ("v" + "2") + "[/\\]+scripts"
$legacyMainCheckName = "check_" + ("v" + "2") + ".ps1"
$legacyDeployCheckName = "check_deployed_" + ("v" + "2") + ".ps1"
foreach ($activeScript in (Get-ChildItem -LiteralPath ".\scripts" -Filter "*.ps1" -File)) {
    $activeScriptText = Get-Content -LiteralPath $activeScript.FullName -Raw
    if ($activeScriptText -match $legacyFunctionPattern) {
        throw "Active script contains a legacy version-bound function name: $($activeScript.Name)"
    }
    if ($activeScriptText -match $legacyScriptsPattern) {
        throw "Active script references the legacy scripts directory: $($activeScript.Name)"
    }
}
if ((Test-Path -LiteralPath (Join-Path ".\scripts" $legacyMainCheckName)) -or (Test-Path -LiteralPath (Join-Path ".\scripts" $legacyDeployCheckName))) {
    throw "A legacy version-bound active script filename still exists."
}

$appLineCount = (Get-Content -LiteralPath ".\frontend\src\App.jsx").Count
if ($appLineCount -gt 360) {
    throw "App.jsx has grown to $appLineCount lines. Keep App.jsx as a coordinator and move UI/detail logic into components, hooks, or utils."
}

$backendAppLineCount = (Get-Content -LiteralPath ".\backend\app.py").Count
if ($backendAppLineCount -gt 180) {
    throw "backend/app.py has grown to $backendAppLineCount lines. Keep it as an app factory, router mount, and static frontend shell."
}

$engineLineCount = (Get-Content -LiteralPath ".\backend\engine.py").Count
if ($engineLineCount -gt 180) {
    throw "engine.py has grown to $engineLineCount lines. Keep engine.py as a coordinator and move domain logic into service modules."
}

$mainJsx = Get-Content -LiteralPath ".\frontend\src\main.jsx" -Raw
$tokensImportIndex = $mainJsx.IndexOf('import "./styles/tokens.css";')
$appStylesImportIndex = $mainJsx.IndexOf('import "./styles/app.css";')
if ($tokensImportIndex -lt 0 -or $appStylesImportIndex -lt 0 -or $tokensImportIndex -gt $appStylesImportIndex) {
    throw "Frontend style imports must load styles/tokens.css before styles/app.css."
}

$legacyFrontendPaths = @(
    ".\frontend\src\styles.css",
    ".\frontend\src\styles\mobile.css",
    ".\frontend\src\components\layout",
    ".\frontend\src\components\messages",
    ".\frontend\src\state\selectors.js"
)
foreach ($legacyFrontendPath in $legacyFrontendPaths) {
    if (Test-Path -LiteralPath $legacyFrontendPath) {
        throw "Legacy V3 chat-layout path must not return in V4: $legacyFrontendPath"
    }
}

$appStyles = Get-Content -LiteralPath ".\frontend\src\styles\app.css" -Raw
if ($appStyles -notmatch "var\(--ev-safe-bottom\)") {
    throw "styles/app.css must keep the bottom safe-area inset (--ev-safe-bottom) for the fixed mic dock."
}
if ($appStyles -notmatch "prefers-reduced-motion") {
    throw "styles/app.css must honour prefers-reduced-motion."
}
$tokenStyles = Get-Content -LiteralPath ".\frontend\src\styles\tokens.css" -Raw
foreach ($token in @("--ev-ink:", "--ev-paper:", "--ev-ember-1:", "--ev-ember-2:", "--ev-rose:", "--ev-mint:", "--ev-amber:", "--ev-indigo:", "--ev-safe-bottom:")) {
    if (-not $tokenStyles.Contains($token)) {
        throw "styles/tokens.css is missing design token: $token"
    }
}

$frontendSourceFiles = Get-ChildItem -LiteralPath ".\frontend\src" -Recurse -File |
    Where-Object { $_.Extension -in @(".js", ".jsx") -and $_.Name -ne "api.js" }
foreach ($frontendFile in $frontendSourceFiles) {
    $frontendText = Get-Content -LiteralPath $frontendFile.FullName -Raw
    if ($frontendText -match "\bfetch\s*\(") {
        throw "Frontend API calls must go through frontend/src/api.js, but fetch() appears in $($frontendFile.FullName)."
    }
}

$backendServiceFiles = Get-ChildItem -LiteralPath ".\backend" -Filter "*_service.py" -File
foreach ($serviceFile in $backendServiceFiles) {
    $serviceText = Get-Content -LiteralPath $serviceFile.FullName -Raw
    if ($serviceText -match "from\s+fastapi|import\s+fastapi") {
        throw "Backend service modules must not depend on FastAPI: $($serviceFile.Name)"
    }
}

Invoke-ProjectNative $python -m py_compile `
    .\backend\ai_provider.py `
    .\backend\core\config.py `
    .\backend\core\payload_limits.py `
    .\backend\core\rate_limit.py `
    .\backend\audio_services.py `
    .\backend\exam_flow_service.py `
    .\backend\feedback_service.py `
    .\backend\part3_service.py `
    .\backend\question_bank_service.py `
    .\backend\report_service.py `
    .\backend\schemas.py `
    .\backend\answer_feedback_service.py `
    .\backend\answer_feedback_test.py `
    .\backend\part1_feedback_service.py `
    .\backend\engine.py `
    .\backend\routes\answer.py `
    .\backend\routes\audio.py `
    .\backend\routes\health.py `
    .\backend\routes\report.py `
    .\backend\routes\sessions.py `
    .\backend\routes\telemetry.py `
    .\backend\app.py `
    .\backend\smoke_test.py `
    .\backend\question_bank\__init__.py `
    .\backend\question_bank\catalog.py `
    .\backend\question_bank\pdf_recall.py `
    .\validate_question_bank.py

$scriptFiles = @(
    ".\scripts\_common.ps1",
    ".\scripts\check_project.ps1",
    ".\scripts\run_backend.ps1",
    ".\scripts\run_frontend.ps1",
    ".\scripts\run_local_stack.ps1",
    ".\scripts\start_https_tunnel.ps1",
    ".\scripts\check_local_preview.ps1",
    ".\scripts\check_mobile_qa_result.ps1",
    ".\scripts\check_git_ready.ps1",
    ".\scripts\stop_local_stack.ps1",
    ".\scripts\check_deployed_app.ps1",
    ".\scripts\check_deploy_config.ps1",
    ".\scripts\prepare_public_deploy_bundle.ps1",
    ".\scripts\generate_admin_token.ps1",
    ".\scripts\sync_public_deploy_github.ps1"
)
$actualScriptFiles = Get-ChildItem -LiteralPath ".\scripts" -Filter "*.ps1" -File |
    ForEach-Object { ".\scripts\$($_.Name)" } |
    Sort-Object
$scriptListDifference = Compare-Object -ReferenceObject ($scriptFiles | Sort-Object) -DifferenceObject $actualScriptFiles
if ($scriptListDifference) {
    throw "PowerShell script parse list does not cover the complete scripts directory: $($scriptListDifference | Out-String)"
}
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

Invoke-ProjectNative $python .\validate_question_bank.py
Invoke-ProjectNative $python -m backend.answer_feedback_test
Invoke-ProjectNative $python -m backend.smoke_test
powershell.exe -ExecutionPolicy Bypass -File .\scripts\check_deploy_config.ps1

Push-Location .\frontend
Invoke-ProjectNative $pnpm run test:smoke
Invoke-ProjectNative $pnpm run build
Pop-Location

$distIndex = Join-Path $repoRoot "frontend\dist\index.html"
if (-not (Test-Path -LiteralPath $distIndex)) {
    throw "Frontend build did not create frontend\dist\index.html"
}
$distHtml = Get-Content -LiteralPath $distIndex -Raw
if ($distHtml -match "@vite/client" -or $distHtml -match "/src/main.jsx") {
    throw "Frontend dist still references Vite dev files instead of production assets."
}
if ($distHtml -notmatch "/assets/index-.*\.js" -or $distHtml -notmatch "/assets/index-.*\.css") {
    throw "Frontend dist does not reference expected production JS/CSS assets."
}

$distJsFiles = Get-ChildItem -LiteralPath (Join-Path $repoRoot "frontend\dist\assets") -Filter "index-*.js" -File
if (-not $distJsFiles) {
    throw "Frontend build did not create a production JS bundle."
}
$distJsText = ($distJsFiles | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"
$requiredTestIds = @(
    "home-screen",
    "start-button",
    "call-screen",
    "call-button",
    "exam-screen",
    "question-text",
    "mic-button",
    "marking-screen",
    "review-screen",
    "top-fix",
    "retake-screen",
    "recap-screen",
    "type-input",
    "voice-banner"
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

Write-Host "All checks passed." -ForegroundColor Green
