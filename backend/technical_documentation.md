# Technical Specification: Casino Trainer App (MVP)

## 1. Executive Summary
**Goal**: Build a high-performance, low-cost mobile application to train users in casino games (starting with Blackjack).
**Core Philosophy**: "Thick Client, Serverless Backend." Logic runs locally to ensure zero latency and zero server costs during gameplay. The backend is used strictly for persistence, authentication, and B2B analytics.
**Monetization**: Freemium model (Ads for free users, IAP for Premium).
**Long-term Goal**: White-label licensing to big-brand casinos (requires strict separation of UI and Logic).

## 2. High-Level Architecture
The system utilizes a Serverless Microservices approach.

### Core Components
**Mobile Client (The "Thick" Client)**:
- **Framework**: React Native (Cross-platform).
- **Responsibility**: Handles 100% of the game loop, strategy calculations, and rendering.
- **Offline Capability**: Fully functional offline (syncs data when online).

**Backend (Serverless)**:
- **Compute**: AWS Lambda (Python).
- **Database**: AWS DynamoDB (NoSQL) for flexible schema and high write throughput.

**Content Delivery**:
- **Media**: AWS S3 + CloudFront (CDN) for video hosting.
- **Security**: Signed URLs (Time-limited access).

## 3. Client-Side Logic (The "Strategy Engine")
**Constraint**: Do NOT perform strategy calculations on the server.
**Pattern**: Observer Pattern with Lookup Tables.

**Logic Separation**: The `BlackjackGameEngine` class must be decoupled from the UI components. It should emit events (`onCardDealt`, `onHandEnd`).

**Strategy Implementation**:
- Use hardcoded Lookup Tables (JSON/SQLite) for optimal moves (e.g., Hard 16 vs 10 = Hit).
- **Evaluation**: On every user input, compare `UserMove` vs `OptimalMove`.
- If `UserMove != OptimalMove`: Trigger "Mistake Event" (Visual feedback).

## 4. Data Architecture & Schema
We use a dual-collection strategy to optimize for both Write Heavy (gameplay logs) and Read Heavy (dashboards) operations.

### A. Collection: `sessions` (Immutable Log)
Written by Client after every game session.
**Backend Implementation**: Stored in `StatsTable` in DynamoDB.

```json
{
  "user_id": "u_123",
  "session_id": "sess_882",
  "timestamp": "ISO_8601",
  "game_variant": "blackjack_s17",
  "hands_played": 50,
  "hands_won": 22,
  "ev_loss_total": 0.45,
  "mistakes": [
    { "scenario": "hard_16_vs_10", "action": "stand", "count": 2 }
  ]
}
```

### B. Collection: `player_stats` (Mutable Profile)
Updated via Serverless Trigger (Background Function) whenever a new Session is written.
**Backend Implementation**: Not yet implemented. Current `UsersTable` stores basic user info.

```json
{
  "user_id": "u_123",
  "total_hands": 5400,
  "level": "Intermediate",
  "weaknesses": {
    "splitting_8s": { "error_rate": 0.25, "trend": "improving" },
    "soft_17": { "error_rate": 0.05, "trend": "stable" }
  },
  "is_premium": true
}
```

## 5. Content Delivery System (The "Course")
**Goal**: Prevent bandwidth theft (hotlinking) without expensive DRM.

**Storage**: Videos stored in private S3 Bucket.

**Access**: App requests video -> API validates Premium Status -> API returns Signed URL (valid for 1 hour).

The "Bridge" (Video to Game): Every video lesson is paired with a Drill Config JSON.

- **Video**: "How to Split 8s"
- **Config**: Forces the Game Engine to deal pair of 8s to player.

### Drill Config Structure:
```json
{
  "drill_id": "drill_split_8s",
  "force_cards": { "player": ["8", "8"], "dealer": "ANY" },
  "allowed_actions": ["split"],
  "success_criteria": "3_correct_splits_row"
}
```

## 6. Monetization & Security Flow
### A. Freemium Gates
**App Launch**: Check `user.is_premium` flag in local storage (validated against server).
**Premium Users**: Hide all Ads, unlock all Video/Drill modules.
**Free Users**: Initialize AdMob SDK. Lock modules 2–10.

### B. Purchase Flow (IAP)
1. User buys IAP (Apple/Google).
2. Client receives Receipt.
3. Client sends Receipt to Serverless Function.
4. Function validates Receipt with Store API.
5. Function updates DB (`is_premium: true`).
6. Client unlocks UI.

## 7. Recommended Tech Stack
- **Frontend**: React Native (TypeScript).
- **State Management**: Redux Toolkit or Zustand (for managing complex Game State).
- **Backend**: AWS Lambda (Python), AWS DynamoDB.
- **Navigation**: React Navigation (Stack/Tab based).
