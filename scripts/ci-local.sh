#!/usr/bin/env bash
# =============================================================================
# ci-local.sh — Local CI validation script (Bash / WSL / Linux / macOS)
#
# FIX: Exports TURBO_DAEMON=0 to prevent the Windows sandboxing error when
# running under WSL or Git Bash. Safe on all platforms.
#
# Usage:
#   bash scripts/ci-local.sh                # Full CI
#   bash scripts/ci-local.sh --lint-only    # Lint + typecheck only (~30s)
#   bash scripts/ci-local.sh --docker       # Include Docker builds
#   bash scripts/ci-local.sh --filter web   # Only run tasks for 'web' app
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIX: Disable Turbo daemon to avoid Linux sandbox setup issues and ensure
# consistent behavior across Windows, WSL, and Linux CI environments.
# ---------------------------------------------------------------------------
export TURBO_DAEMON=0
export TURBO_TELEMETRY_DISABLED=1
export NEXT_TELEMETRY_DISABLED=1
export FORCE_COLOR=1

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
LINT_ONLY=false
DOCKER=false
FILTER=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --lint-only) LINT_ONLY=true ;;
        --docker)    DOCKER=true ;;
        --filter)    FILTER="$2"; shift ;;
        --help|-h)
            echo "Usage: bash scripts/ci-local.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --lint-only      Only run lint and typecheck (fastest)"
            echo "  --docker         Also validate Docker builds"
            echo "  --filter <name>  Only run tasks for one app (e.g. 'web', 'frontend')"
            echo "  --help           Show this help"
            exit 0
            ;;
        *) echo "[WARN] Unknown argument: $1" ;;
    esac
    shift
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; RESET='\033[0m'
TOTAL_START=$(date +%s)

# Navigate to repo root if run from scripts dir
if [ ! -f "turbo.json" ]; then
  cd "$(dirname "$0")/.." || exit 1
  if [ ! -f "turbo.json" ]; then
    echo -e "\n\033[1;31m[FAIL] Must be run from the repository root!\033[0m"
    exit 1
  fi
fi

step()    { echo ""; echo -e "${CYAN}$(printf '=%.0s' {1..60})${RESET}"; echo -e "${CYAN}  $1${RESET}"; echo -e "${CYAN}$(printf '=%.0s' {1..60})${RESET}"; echo ""; STEP_START=$(date +%s); }
pass()    { local elapsed=$(( $(date +%s) - STEP_START )); echo -e "${GREEN}[PASS] $1 (${elapsed}s)${RESET}"; }
fail()    { echo -e "${RED}[FAIL] $1${RESET}"; if [[ -n "${2:-}" ]]; then echo -e "${YELLOW}  Hint: $2${RESET}"; fi; exit 1; }

build_turbo_args() {
    local task="$1"
    local args="run $task --no-daemon --cache-dir=.turbo"
    if [[ -n "$FILTER" ]]; then args="$args --filter=$FILTER"; fi
    echo "$args"
}

# ---------------------------------------------------------------------------
# Environment check
# ---------------------------------------------------------------------------
step "Checking environment"
command -v node >/dev/null 2>&1 || fail "Node.js not installed" "Install Node 20+ from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || fail "npm not installed"
HAS_PYTHON=false
if command -v python3 >/dev/null 2>&1; then
    HAS_PYTHON=true
    echo "  Node  : $(node --version)"
    echo "  npm   : $(npm --version)"
    echo "  Python: $(python3 --version)"
else
    echo "[WARN] Python3 not found — skipping Python checks" 
fi
echo "  Turbo : daemon disabled (TURBO_DAEMON=0)"
pass "Environment check"

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
step "Installing Node dependencies"
npm ci --legacy-peer-deps || fail "npm ci" "Try deleting node_modules first"
pass "Node dependencies"

if $HAS_PYTHON; then
    step "Installing Python dependencies"
    python3 -m pip install -r apps/backend/requirements.txt ruff --quiet || fail "pip install"
    pass "Python dependencies"
fi

# ---------------------------------------------------------------------------
# Lint & Typecheck
# ---------------------------------------------------------------------------
step "Node lint & typecheck (Turbo)"
npx turbo $(build_turbo_args "lint") typecheck || fail "Lint & Typecheck"
pass "Node lint & typecheck"

if $HAS_PYTHON; then
    step "Python lint (Ruff)"
    ruff check apps/backend/ --select E,W,F --ignore E501,E402,E701,F841 || fail "Python lint"
    pass "Python lint"
fi

# ---------------------------------------------------------------------------
# Early exit for lint-only mode
# ---------------------------------------------------------------------------
if $LINT_ONLY; then
    TOTAL=$(( $(date +%s) - TOTAL_START ))
    echo ""
    echo -e "${GREEN}$(printf '=%.0s' {1..60})${RESET}"
    echo -e "${GREEN}  [PASS] Lint-only CI passed!  (${TOTAL}s total)${RESET}"
    echo -e "${GREEN}$(printf '=%.0s' {1..60})${RESET}"
    exit 0
fi

# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------
step "Running tests (Turbo)"
npx turbo $(build_turbo_args "test") || fail "Tests"
pass "Tests"

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
step "Running build (Turbo)"
npx turbo $(build_turbo_args "build") || fail "Build"
pass "Build"

# ---------------------------------------------------------------------------
# Docker (optional)
# ---------------------------------------------------------------------------
if $DOCKER; then
    if ! command -v docker >/dev/null 2>&1; then
        echo -e "${YELLOW}[WARN] Docker not found — skipping Docker builds${RESET}"
    else
        step "Docker dry-run builds"
        for app in web backend; do
            echo "  Building apps/$app..."
            docker build -f "apps/$app/Dockerfile" -t "cognode-${app}:ci-local" . || fail "Docker build ($app)"
            pass "Docker build ($app)"
        done
    fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$(( $(date +%s) - TOTAL_START ))
echo ""
echo -e "${GREEN}$(printf '=%.0s' {1..60})${RESET}"
echo -e "${GREEN}  [PASS] All local CI checks passed!  (${TOTAL}s total)${RESET}"
echo -e "${GREEN}$(printf '=%.0s' {1..60})${RESET}"
