# =============================================================================
# ci-local.ps1 - Local CI validation script (Windows PowerShell 5.1+)
#
# FIX: Sets TURBO_DAEMON=0 to prevent the Windows sandboxing error:
#   "sandboxing is not supported on Windows"
#
# Usage:
#   .\scripts\ci-local.ps1              # Full CI (lint, typecheck, test, build)
#   .\scripts\ci-local.ps1 -LintOnly    # Lint + typecheck only (~30s)
#   .\scripts\ci-local.ps1 -Docker      # Also run Docker builds
#   .\scripts\ci-local.ps1 -Filter web  # Only the 'web' app
# =============================================================================

param(
    [switch]$Docker,
    [switch]$LintOnly,
    [switch]$ForceInstall,
    [switch]$Help,
    [string]$Filter = ""
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# FIX: Disable Turbo daemon to prevent Windows sandboxing error.
# "sandboxing is not supported on Windows" is caused by turbod trying to set
# up a Linux-style process sandbox. TURBO_DAEMON=0 disables the daemon
# entirely. Zero impact on caching or build correctness.
# ---------------------------------------------------------------------------
$env:TURBO_DAEMON         = "0"
$env:TURBO_TELEMETRY_DISABLED = "1"
$env:NEXT_TELEMETRY_DISABLED  = "1"
$env:FORCE_COLOR          = "1"

if ($Help) {
    Write-Host "Usage: .\scripts\ci-local.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -LintOnly        Only run lint and typecheck (fastest)"
    Write-Host "  -Docker          Also validate Docker builds"
    Write-Host "  -Filter <name>   Only run tasks for one app (e.g. web, frontend)"
    Write-Host "  -Help            Show this help message"
    exit 0
}

# ---------------------------------------------------------------------------
# Ensure we are running from the repository root
# ---------------------------------------------------------------------------
if (-not (Test-Path "turbo.json")) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $rootDir = Resolve-Path "$scriptDir\.."
    Set-Location $rootDir
    if (-not (Test-Path "turbo.json")) {
        Write-Host "[FAIL] Must be run from the repository root!" -ForegroundColor Red
        exit 1
    }
}

# ---------------------------------------------------------------------------
$_globalStart = Get-Date
$_stepStart   = Get-Date

function Write-Step {
    param([string]$Message)
    $script:_stepStart = Get-Date
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Pass {
    param([string]$Message)
    $elapsed = [math]::Round(((Get-Date) - $script:_stepStart).TotalSeconds, 1)
    Write-Host "[PASS] $Message ($($elapsed)s)" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message, [string]$Hint = "")
    Write-Host ""
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    if ($Hint) { Write-Host "  Hint: $Hint" -ForegroundColor Yellow }
    Write-Host ""
    exit 1
}

function Get-TurboCommand {
    param([string]$Task, [string[]]$ExtraTasks = @())
    $cmd = "npx turbo run $Task"
    foreach ($t in $ExtraTasks) { $cmd += " $t" }
    $cmd += " --no-daemon --cache-dir=.turbo"
    if ($Filter) { $cmd += " --filter=$Filter" }
    return $cmd
}

# ---------------------------------------------------------------------------
# Environment check
# ---------------------------------------------------------------------------
Write-Step "Checking environment"

try {
    $nodeVer = (node --version 2>&1)
    Write-Host "  Node  : $nodeVer"
} catch {
    Write-Fail "Node.js not installed" "Install Node 20+ from https://nodejs.org"
}

try {
    $npmVer = (npm --version 2>&1)
    Write-Host "  npm   : $npmVer"
} catch {
    Write-Fail "npm not installed"
}

$hasPython = $false
try {
    $pyVer = (python --version 2>&1)
    Write-Host "  Python: $pyVer"
    $hasPython = $true
} catch {
    Write-Host "[WARN] Python not found - skipping Python checks" -ForegroundColor Yellow
}

Write-Host "  Turbo : daemon disabled (TURBO_DAEMON=0)"
Write-Pass "Environment check"

# ---------------------------------------------------------------------------
# Install Node dependencies
# ---------------------------------------------------------------------------
Write-Step "Checking Node dependencies"
if ((Test-Path "node_modules") -and -not $ForceInstall) {
    Write-Host "  node_modules exists. Skipping npm install to avoid native rebuild locks." -ForegroundColor DarkGray
    Write-Host "  (Run with -ForceInstall to force module installation)" -ForegroundColor Yellow
} else {
    Write-Host "  Installing Node dependencies..."
    npm install --legacy-peer-deps --no-audit
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install" "Dependencies failed to install." }
}
Write-Pass "Node dependencies"

# ---------------------------------------------------------------------------
# Install Python dependencies
# ---------------------------------------------------------------------------
if ($hasPython) {
    Write-Step "Installing Python dependencies"
    python -m pip install -r apps/backend/requirements.txt ruff --quiet
    if ($LASTEXITCODE -ne 0) { Write-Fail "pip install" "Check Python and pip are working" }
    Write-Pass "Python dependencies"
}

# ---------------------------------------------------------------------------
# Lint and Typecheck
# ---------------------------------------------------------------------------
Write-Step "Node lint and typecheck (Turbo)"
$turboCmd = Get-TurboCommand -Task "lint" -ExtraTasks @("typecheck")
Invoke-Expression $turboCmd
if ($LASTEXITCODE -ne 0) { Write-Fail "Lint and Typecheck" "Run 'npx turbo run lint --no-daemon' for details" }
Write-Pass "Node lint and typecheck"

if ($hasPython) {
    Write-Step "Python lint (Ruff)"
    python -m ruff check apps/backend/ --select E,W,F --ignore E501,E402,E701,F841
    if ($LASTEXITCODE -ne 0) { Write-Fail "Python lint" "Fix Ruff violations shown above" }
    Write-Pass "Python lint"
}

# ---------------------------------------------------------------------------
# Early exit for lint-only mode
# ---------------------------------------------------------------------------
if ($LintOnly) {
    $total = [math]::Round(((Get-Date) - $_globalStart).TotalSeconds, 1)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host "  [PASS] Lint-only CI passed!  ($($total)s total)" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Green
    exit 0
}

# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------
Write-Step "Running tests (Turbo)"
$turboCmd = Get-TurboCommand -Task "test"
Invoke-Expression $turboCmd
if ($LASTEXITCODE -ne 0) { Write-Fail "Tests" "Check test output above" }
Write-Pass "Tests"

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
Write-Step "Running build (Turbo)"
$turboCmd = Get-TurboCommand -Task "build"
Invoke-Expression $turboCmd
if ($LASTEXITCODE -ne 0) { Write-Fail "Build" "Check build output above" }
Write-Pass "Build"

# ---------------------------------------------------------------------------
# Docker (optional)
# ---------------------------------------------------------------------------
if ($Docker) {
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCmd) {
        Write-Host "[WARN] Docker not found - skipping Docker builds" -ForegroundColor Yellow
        Write-Host "       Install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    } else {
        Write-Step "Docker dry-run builds"
        foreach ($app in @("web", "backend")) {
            Write-Host "  Building apps/$app..." -ForegroundColor Cyan
            docker build -f "apps/$app/Dockerfile" -t "cognode-${app}:ci-local" .
            if ($LASTEXITCODE -ne 0) { Write-Fail "Docker build ($app)" "Check Dockerfile at apps/$app/Dockerfile" }
            Write-Pass "Docker build ($app)"
        }
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
$total = [math]::Round(((Get-Date) - $_globalStart).TotalSeconds, 1)
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host "  [PASS] All local CI checks passed!  ($($total)s total)" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green
