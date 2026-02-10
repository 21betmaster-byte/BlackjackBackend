# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blackjack trainer app ("21 BetMaster") using a **thick client, serverless backend** architecture. All game logic runs on the mobile client; the backend handles only authentication, persistence, and analytics.

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
npx jest               # Run all frontend tests
npx jest __tests__/api.test.ts  # Run a single test file
```

### Backend (run from `backend/`)
```bash
pip install -r requirements.txt         # Install dependencies
pip install -r test-requirements.txt    # Install test dependencies
pytest tests/ -v                        # Run all backend tests
pytest tests/test_handlers.py::test_signup_success -v  # Run a single test
serverless deploy                       # Deploy to AWS
```

## Architecture

### Backend (`backend/`)
- `handlers/auth.py` — Signup and login Lambda handlers (POST /signup, POST /login)
- `handlers/stats.py` — Game stats persistence (POST /stats)
- `utils/auth.py` — Password hashing (bcrypt via passlib) and JWT token generation (python-jose, 30-min expiry)
- `serverless.yml` — Lambda functions, API Gateway routes, DynamoDB table definitions
- DynamoDB tables: **UsersTable** (key: email), **StatsTable** (key: userId + timestamp)

### Frontend (`frontend/`)
- `app/` — Expo Router file-based routing (screens: login, signup, home-dashboard, profile, settings)
- `config.ts` — Centralized API URL (production: `https://bi5sd3la1f.execute-api.us-east-1.amazonaws.com`)
- `constants/theme.ts` — Light/dark mode color definitions
- `components/` — Reusable UI components
- `hooks/` — Theme and color scheme hooks
- `__tests__/api.test.ts` — Jest tests using mocked axios and expo-router

### Auth Flow
Frontend sends email/password to `/signup` or `/login` → backend hashes password and stores in DynamoDB (signup) or verifies and returns JWT (login) → frontend stores token in component state and navigates to home-dashboard.

## Key Configuration

- **TypeScript paths:** `@/*` maps to project root (`tsconfig.json`)
- **Backend env vars** (set via serverless.yml): `SECRET_KEY`, `USERS_TABLE`, `STATS_TABLE`
- **Frontend API URL:** hardcoded in `frontend/config.ts` (switch to localhost for local dev)
- Backend tests use **moto** to mock AWS DynamoDB
