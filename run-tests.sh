#!/usr/bin/env bash
# ==============================================================
# BetMaster21 — Full Test Suite Runner
# Runs backend (pytest) and frontend (jest) tests sequentially.
# Exit code is non-zero if any suite fails.
#
# Usage:
#   ./run-tests.sh           # Run all tests
#   ./run-tests.sh backend   # Run only backend tests
#   ./run-tests.sh frontend  # Run only frontend tests
#   ./run-tests.sh e2e       # Run only E2E tests (both)
# ==============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXIT_CODE=0

run_header() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
  echo ""
}

run_backend_tests() {
  local test_args="${1:---tb=short -v}"
  run_header "Backend Tests (pytest)"
  cd "$ROOT_DIR/backend"
  if python3 -m pytest tests/ $test_args; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
  else
    echo -e "${RED}✗ Backend tests failed${NC}"
    EXIT_CODE=1
  fi
  cd "$ROOT_DIR"
}

run_backend_e2e() {
  run_header "Backend E2E Tests (pytest)"
  cd "$ROOT_DIR/backend"
  if python3 -m pytest tests/test_e2e.py --tb=short -v; then
    echo -e "${GREEN}✓ Backend E2E tests passed${NC}"
  else
    echo -e "${RED}✗ Backend E2E tests failed${NC}"
    EXIT_CODE=1
  fi
  cd "$ROOT_DIR"
}

run_frontend_tests() {
  local test_args="${1:-}"
  run_header "Frontend Tests (jest)"
  cd "$ROOT_DIR/frontend"
  if npx jest $test_args --no-cache; then
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
  else
    echo -e "${RED}✗ Frontend tests failed${NC}"
    EXIT_CODE=1
  fi
  cd "$ROOT_DIR"
}

run_frontend_e2e() {
  run_header "Frontend E2E Tests (jest)"
  cd "$ROOT_DIR/frontend"
  if npx jest __tests__/e2e/ --no-cache; then
    echo -e "${GREEN}✓ Frontend E2E tests passed${NC}"
  else
    echo -e "${RED}✗ Frontend E2E tests failed${NC}"
    EXIT_CODE=1
  fi
  cd "$ROOT_DIR"
}

# ==============================================================
# Main
# ==============================================================

MODE="${1:-all}"

echo -e "${YELLOW}BetMaster21 Test Suite${NC}"
echo -e "${YELLOW}Mode: ${MODE}${NC}"

case "$MODE" in
  backend)
    run_backend_tests
    ;;
  frontend)
    run_frontend_tests
    ;;
  e2e)
    run_backend_e2e
    run_frontend_e2e
    ;;
  all)
    run_backend_tests
    run_frontend_tests
    ;;
  *)
    echo "Usage: $0 [all|backend|frontend|e2e]"
    exit 1
    ;;
esac

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}  All tests passed!${NC}"
else
  echo -e "${RED}  Some tests failed. See output above.${NC}"
fi
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
