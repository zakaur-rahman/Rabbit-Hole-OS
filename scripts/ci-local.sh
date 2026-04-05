#!/usr/bin/env bash
# =============================================================================
# ci-local.sh — Local CI validation script
#
# Mirrors the GitHub Actions CI pipeline for fast local validation before push.
# Usage:
#   ./scripts/ci-local.sh              # Run lint, typecheck, test, build
#   ./scripts/ci-local.sh --docker     # Also run Docker dry-run builds
#   ./scripts/ci-local.sh --lint-only  # Only run lint and typecheck
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOCKER_BUILD=false
LINT_ONLY=false

for arg in "$@"; do
  case $arg in
    --docker)
      DOCKER_BUILD=true
      ;;
    --lint-only)
      LINT_ONLY=true
      ;;
    --help)
      echo "Usage: ./scripts/ci-local.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --lint-only   Only run lint and typecheck (fastest)"
      echo "  --docker      Also validate Docker builds (slow)"
      echo "  --help        Show this help message"
      exit 0
      ;;
  esac
done

step() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}▸ $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

pass() {
  echo -e "${GREEN}✓ $1 passed${NC}"
}

fail() {
  echo -e "${RED}✗ $1 failed${NC}"
  exit 1
}

# ---- Environment Check ----
step "Checking environment"

if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Install Node 20+.${NC}"
  exit 1
fi

if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
  echo -e "${RED}Python is not installed. Install Python 3.11+.${NC}"
  exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
  PYTHON_CMD="python"
fi

echo -e "Node: $(node --version)"
echo -e "Python: $($PYTHON_CMD --version)"
echo -e "npm: $(npm --version)"

# ---- Install Dependencies ----
step "Installing Node dependencies"
npm ci --legacy-peer-deps || fail "npm ci"
pass "Node dependencies"

step "Installing Python dependencies"
$PYTHON_CMD -m pip install -r apps/backend/requirements.txt ruff --quiet || fail "pip install"
pass "Python dependencies"

# ---- Lint ----
step "Running Node Lint & Typecheck (Turbo)"
npx turbo run lint typecheck || fail "Lint & Typecheck"
pass "Node Lint & Typecheck"

step "Running Python Lint (Ruff)"
ruff check apps/backend/ --select E,W,F --ignore E501,E402,E701,F841 || fail "Python Lint"
pass "Python Lint"

if [ "$LINT_ONLY" = true ]; then
  echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✓ Lint-only CI passed!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi

# ---- Test ----
step "Running Tests (Turbo)"
npx turbo run test || fail "Tests"
pass "Tests"

# ---- Build ----
step "Running Build (Turbo)"
npx turbo run build || fail "Build"
pass "Build"

# ---- Docker (Optional) ----
if [ "$DOCKER_BUILD" = true ]; then
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker not found, skipping Docker builds${NC}"
  else
    step "Running Docker Dry-Run Builds"

    for app in web backend; do
      echo -e "${BLUE}Building apps/$app...${NC}"
      docker build -f "apps/$app/Dockerfile" -t "$app:ci-local" . --no-cache || fail "Docker build ($app)"
      pass "Docker build ($app)"
    done
  fi
fi

# ---- Summary ----
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All local CI checks passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
