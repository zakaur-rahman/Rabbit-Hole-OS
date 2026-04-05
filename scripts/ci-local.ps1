# =============================================================================
# ci-local.ps1 — Local CI validation script (Windows PowerShell)
#
# Mirrors the GitHub Actions CI pipeline for fast local validation before push.
# Usage:
#   .\scripts\ci-local.ps1              # Run lint, typecheck, test, build
#   .\scripts\ci-local.ps1 -Docker      # Also run Docker dry-run builds
#   .\scripts\ci-local.ps1 -LintOnly    # Only run lint and typecheck
# =============================================================================

param(
    [switch]$Docker,
    [switch]$LintOnly,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
    Write-Host "Usage: .\scripts\ci-local.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -LintOnly   Only run lint and typecheck (fastest)"
    Write-Host "  -Docker     Also validate Docker builds (slow)"
    Write-Host "  -Help       Show this help message"
    exit 0
}

function Write-Step($message) {
    Write-Host ""
    Write-Host ("=" * 50) -ForegroundColor Blue
    Write-Host ">>> $message" -ForegroundColor Blue
    Write-Host ("=" * 50) -ForegroundColor Blue
    Write-Host ""
}

function Write-Pass($message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Write-Fail($message) {
    Write-Host "[FAIL] $message" -ForegroundColor Red
    exit 1
}

# ---- Environment Check ----
Write-Step "Checking environment"

try { $nodeVersion = node --version } catch { Write-Fail "Node.js is not installed. Install Node 20+." }
try { $pythonVersion = python --version } catch { Write-Fail "Python is not installed. Install Python 3.11+." }
try { $npmVersion = npm --version } catch { Write-Fail "npm is not installed." }

Write-Host "Node: $nodeVersion"
Write-Host "Python: $pythonVersion"
Write-Host "npm: $npmVersion"

# ---- Install Dependencies ----
Write-Step "Installing Node dependencies"
npm ci --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Fail "npm ci" }
Write-Pass "Node dependencies"

Write-Step "Installing Python dependencies"
python -m pip install -r apps/backend/requirements.txt ruff --quiet
if ($LASTEXITCODE -ne 0) { Write-Fail "pip install" }
Write-Pass "Python dependencies"

# ---- Lint ----
Write-Step "Running Node Lint & Typecheck (Turbo)"
npx turbo run lint typecheck
if ($LASTEXITCODE -ne 0) { Write-Fail "Lint & Typecheck" }
Write-Pass "Node Lint & Typecheck"

Write-Step "Running Python Lint (Ruff)"
ruff check apps/backend/ --select E,W,F --ignore E501,E402,E701,F841
if ($LASTEXITCODE -ne 0) { Write-Fail "Python Lint" }
Write-Pass "Python Lint"

if ($LintOnly) {
    Write-Host ""
    Write-Host ("=" * 50) -ForegroundColor Green
    Write-Host "[PASS] Lint-only CI passed!" -ForegroundColor Green
    Write-Host ("=" * 50) -ForegroundColor Green
    exit 0
}

# ---- Test ----
Write-Step "Running Tests (Turbo)"
npx turbo run test
if ($LASTEXITCODE -ne 0) { Write-Fail "Tests" }
Write-Pass "Tests"

# ---- Build ----
Write-Step "Running Build (Turbo)"
npx turbo run build
if ($LASTEXITCODE -ne 0) { Write-Fail "Build" }
Write-Pass "Build"

# ---- Docker (Optional) ----
if ($Docker) {
    $dockerExists = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerExists) {
        Write-Host "[WARN] Docker not found, skipping Docker builds" -ForegroundColor Yellow
    } else {
        Write-Step "Running Docker Dry-Run Builds"

        foreach ($app in @("web", "backend")) {
            Write-Host "Building apps/$app..." -ForegroundColor Blue
            docker build -f "apps/$app/Dockerfile" -t "${app}:ci-local" . --no-cache
            if ($LASTEXITCODE -ne 0) { Write-Fail "Docker build ($app)" }
            Write-Pass "Docker build ($app)"
        }
    }
}

# ---- Summary ----
Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "[PASS] All local CI checks passed!" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green
