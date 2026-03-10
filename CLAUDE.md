# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blackjack trainer app ("BetMaster21") using a **thick client, serverless backend** architecture. All game logic runs on the mobile client; the backend handles only authentication, persistence, and analytics.

## Tech Stack

- **Backend:** Python 3.9, AWS Lambda via Serverless Framework, DynamoDB
- **Frontend:** React Native (Expo SDK 54), TypeScript, Expo Router (file-based routing), NativeWind

## Commands

### Frontend (run from `frontend/`)
```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web
npx jest               # Run all frontend tests (257 tests)
npx jest __tests__/e2e/  # Run frontend E2E tests only
npx jest __tests__/api.test.ts  # Run a single test file
```

### Backend (run from `backend/`)
```bash
pip install -r requirements.txt         # Install dependencies
pip install -r test-requirements.txt    # Install test dependencies
pytest tests/ -v                        # Run all backend tests (51 tests)
pytest tests/test_e2e.py -v             # Run backend E2E tests only
pytest tests/test_handlers.py::test_signup_success -v  # Run a single test
serverless deploy                       # Deploy to AWS
```

### Full Test Suite (run from project root)
```bash
./run-tests.sh           # Run all backend + frontend tests
./run-tests.sh backend   # Backend only
./run-tests.sh frontend  # Frontend only
./run-tests.sh e2e       # E2E tests only (both backend + frontend)
```

## Architecture

### Backend (`backend/`)
- `handlers/auth.py` — Signup, login, Google auth, mandatory details, profile, password reset (OTP flow)
- `handlers/stats.py` — Game stats persistence (POST /stats) — accepts `training_decisions` array, validates result in `{win, loss, push, training_session}`, uses Bearer token auth (same `_get_user_id_from_token` pattern as training.py)
- `handlers/training.py` — Training analytics endpoints (GET /training/summary, GET /training/progress)
- `utils/auth.py` — Password hashing (bcrypt via passlib) and JWT token generation (python-jose, 30-min expiry)
- `serverless.yml` — Lambda functions, API Gateway routes, DynamoDB table definitions
- DynamoDB tables: **UsersTable** (key: email), **StatsTable** (key: userId + timestamp)

### Frontend (`frontend/`)
- `app/` — Expo Router file-based routing (screens: login, signup, home-dashboard, profile, settings, game, analytics, strategy-reference, stats-dashboard)
- `training/` — Game-agnostic training framework (adapter pattern, session tracking, analytics, progress, milestones)
- `game/` — Blackjack game engine, strategy tables, trainer hook
- `config.ts` — Centralized API URL (production: `https://bi5sd3la1f.execute-api.us-east-1.amazonaws.com`)
- `constants/theme.ts` — Light/dark mode color definitions
- `components/` — Reusable UI components
- `hooks/` — Theme, color scheme, and haptic feedback hooks
- `__tests__/` — Jest tests (257 tests: game engine, strategy, training framework, E2E flows)

### Auth Flow
Frontend sends email/password to `/signup` or `/login` → backend hashes password and stores in DynamoDB (signup) or verifies and returns JWT (login) → frontend stores token in component state and navigates to home-dashboard.

## Testing

### Test Structure

**Backend (51 tests across 3 files):**
- `tests/conftest.py` — Shared fixtures: DynamoDB table setup, mock context, auth helpers
- `tests/test_handlers.py` — Unit tests for individual handler functions (27 tests)
- `tests/test_training.py` — Unit tests for training analytics endpoints (8 tests)
- `tests/test_e2e.py` — End-to-end flow tests across multiple endpoints (16 tests):
  - `TestAuthOnboardingFlow` — Signup → login → onboarding → profile (including Google auth)
  - `TestPasswordResetFlow` — Forgot password → OTP → reset → login
  - `TestGameplayTrainingFlow` — Stats save → training summary → progress tracking
  - `TestMultiUserIsolation` — Verify data isolation between users
  - `TestErrorHandlingFlows` — Expired tokens, missing auth, validation
  - `TestExtendedStatsFlow` — Optional fields (net_payout, hands_played, details)

**Frontend (257 tests across 12 files):**
- `__tests__/game-engine.test.ts` — Game engine state machine (43 tests)
- `__tests__/strategy.test.ts` — Basic strategy tables (41 tests)
- `__tests__/api.test.ts` — API interaction patterns (6 tests)
- `__tests__/mandatory-details.test.ts` — Onboarding validation (21 tests)
- `__tests__/training/` — Training framework modules (117 tests)
- `__tests__/e2e/` — End-to-end integration tests (29 tests):
  - `game-engine-integration.test.ts` — Full game lifecycle (bet → deal → play → settle), splits, doubles, multi-round
  - `game-training-flow.test.ts` — Game → adapter → session → analytics → progress → milestones pipeline
  - `auth-api-flow.test.ts` — Auth, onboarding, stats, profile, password reset API flows

## Key Configuration

- **TypeScript paths:** `@/*` maps to project root (`tsconfig.json`)
- **Backend env vars** (set via serverless.yml): `SECRET_KEY`, `USERS_TABLE`, `STATS_TABLE`
- **Frontend API URL:** hardcoded in `frontend/config.ts` (switch to localhost for local dev)
- Backend tests use **moto** to mock AWS DynamoDB
