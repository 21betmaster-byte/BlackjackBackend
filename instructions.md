# BetMaster21 — Development Instructions

These instructions are mandatory for every code change. They define how we build, test, and ship features to ensure a high-quality, performant, and delightful application.

---

## 1. Testing Requirements

### Every code change must include E2E tests

No feature, bug fix, or refactor is complete without corresponding end-to-end tests. Tests are not an afterthought — they are part of the definition of done.

#### What "E2E" means in this project

E2E tests validate **complete user journeys**, not isolated functions. A user journey is a sequence of actions a real user would take, spanning multiple screens, API calls, and state transitions. Every test should read like a story: "The user does X, then Y happens, then they see Z."

#### Process for every code change

1. **Before writing code:** Define the user journeys that the change affects. Write them out in plain language (e.g., "User opens game → places bet → surrenders → sees half bet returned → starts new round").
2. **Write the tests first or alongside the code.** Do not defer testing to a later PR.
3. **Cover both frontend and backend.** If a feature touches both layers, both need E2E coverage.
4. **Run the full test suite before considering the work done.** Use `./run-tests.sh` from the project root.

#### Test format: User Journey style

Tests must be structured as user journeys, not as unit assertions on internals. Each test should:

- **Have a descriptive name that reads as a user story:**
  ```
  'player surrenders on hard 16 vs dealer 10 and gets half bet returned'
  ```
  Not:
  ```
  'playerSurrender sets status to surrendered'
  ```

- **Start from a realistic entry point** (signup, login, game start — not a mid-state object).

- **Follow the full flow through to the user-visible outcome:**
  ```typescript
  // Good: Full journey
  signup → login → place bet → deal → surrender → settle → verify balance

  // Bad: Testing internals
  call playerSurrender() → check status field
  ```

- **Assert on what the user sees/experiences**, not implementation details:
  ```typescript
  // Good: User-visible outcome
  expect(state.balance).toBe(950); // "I see my balance is $950"

  // Bad: Implementation detail
  expect(state.playerHands[0].__internalFlag).toBe(true);
  ```

#### Where tests live

| Layer | Location | Framework | Runner |
|-------|----------|-----------|--------|
| Backend E2E | `backend/tests/test_e2e*.py` | pytest + moto | `./run-tests.sh backend` |
| Frontend E2E | `frontend/__tests__/e2e/*.test.ts` | Jest + ts-jest | `./run-tests.sh frontend` |
| Full suite | — | Both | `./run-tests.sh` |

#### Backend E2E test pattern

Backend E2E tests use real handler functions with mocked DynamoDB (via moto). They test the actual Lambda handler code, not HTTP endpoints.

```python
class TestFeatureNameFlow:
    """Tests the complete [feature] user journey."""

    def test_user_does_X_then_sees_Y(self, dynamodb_tables, mock_context):
        """[Plain language description of the journey]."""
        h, ctx = dynamodb_tables, mock_context

        # Step 1: Setup (signup + login)
        token, uid, email = signup_and_login(h, ctx, "user@example.com")

        # Step 2: User action
        resp = h["stats"].save(
            make_auth_event(token, body={...}),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Step 3: Verify user-visible outcome
        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        summary = json.loads(resp["body"])
        assert summary["overall_accuracy"] == 0.8
```

#### Frontend E2E test pattern

Frontend E2E tests fall into two categories:

**1. Pure logic journeys** (game engine, training pipeline) — test the full state machine flow:
```typescript
// Rig the shoe → place bet → deal → take action → settle → verify outcome
let state = makeRiggedState(shoe);
state = placeBet(state, 0, 100);
state = dealInitialCards(state);
state = completeDeal(state);
state = playerSurrender(state);
state = playDealer(state);
state = settleRound(state);
expect(state.balance).toBe(950);
```

**2. API interaction journeys** (auth, stats, analytics) — test the full client-server flow with mocked axios:
```typescript
// Signup → login → save stats → fetch analytics → verify data
const signupResp = await mockedAxios.post(`${API_URL}/signup`, {...});
const loginResp = await mockedAxios.post(`${API_URL}/login`, {...});
await mockedAxios.post(`${API_URL}/stats`, {...}, { headers: { Authorization: `Bearer ${token}` }});
const analyticsResp = await mockedAxios.get(`${API_URL}/training/summary?game_type=blackjack`, {...});
expect(analyticsResp.data.overall_accuracy).toBe(0.8);
```

#### Minimum coverage per change type

| Change type | Required tests |
|-------------|---------------|
| New screen/feature | Full user journey from entry to exit, happy path + 1 error path |
| Bug fix | Test that reproduces the bug (fails before fix, passes after) |
| API endpoint change | Backend E2E with auth + validation + success flow; Frontend E2E with mocked API call |
| Game engine change | Rigged-shoe E2E through full bet → deal → action → settle cycle |
| Strategy/training change | Adapter → session → analytics pipeline E2E |
| Auth/security change | Full auth flow E2E (signup → login → protected action → verify) |
| i18n change | No E2E required, but verify keys exist in all 11 locale files |

---

## 2. Performance Standards

### Frontend performance

- **No unnecessary re-renders.** Game state updates should only re-render affected components. Use `React.memo`, `useMemo`, and `useCallback` where profiling shows render waste — but do not add them preemptively everywhere.
- **Keep the game engine pure.** `game/engine.ts` must remain a pure TypeScript state machine with zero React imports, zero side effects, and zero async calls. This is what makes it fast and testable.
- **Minimize bridge crossings.** Avoid calling native modules (haptics, AsyncStorage) in tight loops. Batch reads, debounce writes.
- **Lazy-load heavy screens.** Strategy reference tables, analytics charts, and the How to Play tutorial should not block initial app load.
- **Animations at 60fps.** Use `react-native-reanimated` or `Animated` API for card dealing and chip animations. Never animate with `setState` in a loop.
- **Image and asset optimization.** All images should be appropriately sized for their display context. Do not ship 2000px images for 100px thumbnails.
- **AsyncStorage usage.** Reads are async and can block rendering if awaited in component body. Read during mount effects, not during render. Write in background (fire-and-forget for non-critical data like haptic preferences).
- **List rendering.** Any list with more than 20 items must use `FlatList` with `getItemLayout` for constant-time scroll performance. Never render 100+ items with `.map()` in a `ScrollView`.

### Backend performance

- **DynamoDB query design.** Always query by partition key (userId). Never scan the full table. Use `Limit` to cap result sets.
- **Lambda cold start awareness.** Keep handler files small. Import only what you need. Avoid importing large libraries at module level if they're only used in one handler.
- **Response size.** Training progress responses should be capped (currently `Limit=500` items). If a user has 10,000 sessions, don't return all of them — paginate or aggregate server-side.
- **Stateless handlers.** Every Lambda invocation must be self-contained. No global mutable state, no in-memory caching between invocations (unless you explicitly add a caching layer).

### Measuring performance

- Profile frontend with React DevTools and Expo's built-in performance monitor.
- Monitor backend with CloudWatch Lambda metrics (duration, cold start frequency, error rate).
- If a screen takes more than 300ms to become interactive after navigation, investigate and optimize.

---

## 3. User Experience Standards

### Feedback for every action

- **Every button press must have immediate feedback.** At minimum: haptic feedback (if enabled) + visual state change (pressed/loading state). The user should never wonder "did my tap register?"
- **Loading states are mandatory.** Any action that involves a network call must show a loading indicator. Use the `loading` prop on `Button` components. Never show a blank screen while fetching.
- **Error states are mandatory.** Every API call must handle failure. Show a toast (`useToast()`) or inline error message. Never silently swallow errors — the user must know something went wrong and what they can do about it.
- **Success feedback for significant actions.** After saving stats, completing onboarding, or changing settings, provide confirmation (toast, animation, or screen transition).

### Consistency

- **Use the component library.** Prefer `Button`, `IconButton`, `SegmentedControl`, `ListOption`, `SettingsRow` from `components/ui/` over raw `TouchableOpacity`. This ensures consistent sizing, theming, and accessibility.
- **Respect the theme.** All colors must come from `Colors[colorScheme]` in `constants/theme.ts`. Never hardcode hex values in screen files. Both light and dark themes must look correct.
- **i18n everything.** No hardcoded user-facing strings. All text goes through `t('namespace.key')`. When adding a new key, add it to all 11 locale files.
- **Navigation patterns.** Use `router.push()` for forward navigation, `router.back()` for back, `router.replace()` for auth redirects (prevents back-navigating to login after auth).

### Accessibility

- **Touch targets.** Minimum 44x44pt for all interactive elements (Apple HIG). The `Button` and `IconButton` components already enforce this via their size props.
- **Screen reader labels.** Interactive elements should have `accessibilityLabel` when the visual content alone isn't descriptive (e.g., icon-only buttons).
- **Color contrast.** Text must meet WCAG AA contrast ratios against its background in both light and dark themes.
- **No information conveyed by color alone.** Strategy chart cells use color + text labels. Game results use icons + text, not just color.

### Offline resilience

- **Training data persists locally.** The training framework stores all session data in AsyncStorage. If the backend is unreachable, local data is the source of truth.
- **Backend sync is best-effort.** `training/sync.ts` POSTs to `/stats` but does not block the user on failure. If it fails, data stays local and can be synced later.
- **Analytics screen uses whichever source has more data.** If backend has more sessions than local (because user played on another device), use backend. Otherwise use local. Never show the user less data than they've generated.

---

## 4. Code Change Checklist

Before submitting any code change, verify:

- [ ] **User journeys identified** — I can describe who does what and what they see.
- [ ] **E2E tests written** — Backend and/or frontend E2E tests cover the full journey.
- [ ] **All tests pass** — `./run-tests.sh` exits with code 0.
- [ ] **No regressions** — Existing test count does not decrease.
- [ ] **Theme compliance** — New UI works in both light and dark mode.
- [ ] **i18n compliance** — New user-facing strings added to all 11 locale files.
- [ ] **Loading/error states** — Network calls have loading indicators and error handling.
- [ ] **Haptic feedback** — Interactive game elements trigger haptics (when enabled).
- [ ] **No hardcoded values** — Colors from theme, strings from i18n, URLs from config.
- [ ] **CLAUDE.md updated** — If the change adds screens, endpoints, exports, or test files, update the relevant CLAUDE.md.
