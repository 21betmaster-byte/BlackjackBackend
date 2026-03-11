# Frontend CLAUDE.md

## UI Component Library (`components/ui/`)

Prefer library components (`Button`, `IconButton`, etc.) for interactive UI in screen files. Raw `TouchableOpacity` is acceptable for custom one-off controls (e.g., toggle chips) that don't fit a library component.

### Button (`components/ui/Button.tsx`)
General-purpose button. Variants: `primary`, `secondary`, `outline`, `action`, `destructive`, `ghost`.
Sizes: `sm` (40px), `md` (48px), `lg` (56px).
Props: `title`, `onPress`, `variant`, `size`, `disabled`, `loading`, `icon` (MaterialIcons name), `iconElement` (ReactNode for custom icons like Image), `iconPosition` ('left'|'right'), `highlighted`, `fullWidth`, `style`, `textStyle`.

### IconButton (`components/ui/IconButton.tsx`)
Icon-only button (back arrows, toggles, notification bells). Variants: `default`, `filled`, `primary`, `destructive`.
Sizes: `sm` (32px), `md` (40px), `lg` (48px).
Props: `icon` (MaterialIcons name), `onPress`, `variant`, `size`, `disabled`, `iconColor`, `style`, `children` (custom content like emoji Text instead of icon).

### SegmentedControl (`components/ui/SegmentedControl.tsx`)
Tab/toggle selector (light/dark theme, identity/security tabs).
Props: `options` (array of `{value, label, icon?}`), `selectedValue`, `onSelect`, `style`.

### ListOption (`components/ui/ListOption.tsx`)
Selectable list items for pickers/modals (language selection).
Props: `label`, `onPress`, `leadingText` (emoji), `leadingIcon`, `selected`, `showSeparator`.

### SettingsRow (`components/ui/SettingsRow.tsx`)
Settings list row with icon, title, optional value or toggle.
Props: `icon`, `title`, `value` (string|boolean), `isToggle`, `onValueChange`, `isFirst`, `isLast`, `onPress`, `isDestructive`.

### ShareButton (`components/ui/ShareButton.tsx`)
Circular branded share button with label.
Props: `icon`, `brandColor`, `label`, `onPress`.

### Other components
- **AppInput** — Text input with label, types: `email`, `password`, `text`
- **AppModal** — Modal with variants: `center`, `bottom-sheet`
- **BottomNav** — Bottom tab navigation, prop: `activeTab`
- **CountryPicker** — Country selector dropdown
- **Toast** — Toast notifications (used via `useToast()` context)

## File-to-Screen Taxonomy

### Auth Flow
| File | Screen | What's on it |
|------|--------|-------------|
| `app/signup.tsx` | Registration | Hero, Google sign-in, email/password form, terms, login link |
| `app/login.tsx` | Login | Hero, Google sign-in, email/password form, forgot password modal (3-step: email → OTP → reset) |

### Onboarding Flow (post-registration)
| File | Screen | What's on it |
|------|--------|-------------|
| `app/mandatory-details.tsx` | Personal Info | Progress bar, first/last name, DOB (with native date picker), country picker, continue button |
| `app/language-theme-setup.tsx` | Preferences | Language selector, light/dark theme toggle, high contrast switch, continue button |

### Main App (tab-based via BottomNav)
| File | Screen | Tab | What's on it |
|------|--------|-----|-------------|
| `app/home-dashboard.tsx` | Home | `home` | Welcome header, resume learning card, learning cards (Texas Holdem, Roulette, Baccarat), mock stats button |
| `app/blackjack-game.tsx` | Game | — | Dealer/player areas, betting circles, chip selector, action buttons (hit/stand/double/split/surrender), insurance modal, result overlay with training feedback, dealing animation, training toggle, analytics button, haptic feedback |
| `app/strategy-reference.tsx` | Strategy | `strategy` | 3-tab strategy chart (hard/soft/pairs), color-coded cells, legend with action descriptions |
| `app/stats-dashboard.tsx` | Stats | `stats` | Overview cards (decisions/accuracy/sessions), accuracy trend chart, weakness evolution, money metrics |
| `app/training-analytics.tsx` | Analytics | — | 3-tab view (This Session / Progress / Milestones), category breakdowns, accuracy trends, weakness evolution, money metrics, milestone badges |
| `app/how-to-play.tsx` | Tutorial | — | Swipeable intro cards → interactive lessons |
| `app/learn.tsx` | Learn Mode | — | Guided learning journey: onboarding → skill level → swipable cards → completion → training bridge |
| `app/profile-settings-invite.tsx` | Profile | `profile` | Profile photo, account settings links, preferences (language/dark mode/haptics), referral/invite section, logout |
| `app/profile-personal-details.tsx` | Account Settings | `profile` | Identity tab (name, DOB, country, email) + Security tab (change password with strength meter) |

### Infrastructure
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, auth guard, theme/toast/language providers |
| `app/index.tsx` | Entry redirect to login or home |
| `app/custom-app-loader.tsx` | Splash/loading screen |

### Supporting Components (non-library)
| File | Used by | What it does |
|------|---------|-------------|
| `components/BettingCircle.tsx` | `blackjack-game.tsx` | Tap-to-bet circle with chip stack visualization |
| `components/PlayingCard.tsx` | `blackjack-game.tsx`, `InteractiveLesson.tsx` | Card rendering (face up/down) |
| `components/HowToPlay/SwipeableInstructionCards.tsx` | `how-to-play.tsx` | Intro swipe cards |
| `components/HowToPlay/InteractiveLesson.tsx` | `how-to-play.tsx` | Guided scenarios with action buttons |
| `components/Learning/OnboardingFlow.tsx` | `learn.tsx` | 3-step onboarding: welcome → swipe demo → level picker |
| `components/Learning/SwipableCardStack.tsx` | `learn.tsx` | Tinder-style swipable card stack (reanimated + gesture handler) |
| `components/Learning/LearningCardView.tsx` | `SwipableCardStack.tsx` | Routes card type to sub-renderer |
| `components/Learning/QuizCardView.tsx` | `LearningCardView.tsx` | Interactive quiz with answer feedback |
| `components/Learning/ScenarioCardView.tsx` | `LearningCardView.tsx` | Mini blackjack table with PlayingCard |
| `components/Learning/CompletionScreen.tsx` | `learn.tsx` | Celebration + stats summary |
| `components/Learning/TrainingBridge.tsx` | `learn.tsx` | CTA to start training mode |
| `game/engine.ts` | `blackjack-game.tsx` | Pure game logic state machine |
| `game/strategy.ts` | `useTrainer.ts`, `BlackjackAdapter.ts` | Basic strategy tables + detailed play with explanations |
| `game/useTrainer.ts` | `blackjack-game.tsx` | Strategy hints, delegates to training framework |
| `hooks/useHaptics.ts` | `blackjack-game.tsx` | Haptic feedback (persisted via AsyncStorage) |

### Navigation Graph
```
signup → login → mandatory-details → language-theme-setup → home-dashboard
                                                                ├── blackjack-game ↔ how-to-play
                                                                │     └── training-analytics
                                                                ├── learn (onboard → swipe cards → completion → training bridge)
                                                                ├── strategy-reference
                                                                ├── stats-dashboard
                                                                └── profile-settings-invite
                                                                      └── profile-personal-details
```

## Game Engine (`game/engine.ts`)

Pure TypeScript state machine. Phases: `betting` → `dealing` → `insurance` → `player_turn` → `dealer_turn` → `settlement`.
Config: `maxBet: 500`, `maxHands: 3`, `deckCount: 6`.
Key exports: `createInitialState`, `placeBet`, `removeBet`, `clearBets`, `dealInitialCards`, `completeDeal`, `playerHit`, `playerStand`, `playerDouble`, `playerSplit`, `playerSurrender`, `playDealer`, `settleRound`, `startNewRound`, `rebetAndDeal`, `resetMoney`, `scoreHand`, `canSplit`, `canDouble`, `canSurrender`.

## Training Framework (`training/`)

Game-agnostic training system using the **adapter pattern**. Any casino game can plug in by implementing `GameAdapter<TGameState, TAction>`.

### Architecture
```
training/
  types.ts                       All interfaces (TrainingDecision, SessionSummary, ProgressDashboard, Milestone, GameAdapter, etc.)
  TrainingSession.ts             Pure TS session state machine (createSession, recordDecision, endSession)
  analytics.ts                   Session-level summaries (computeSummary, mergeSummaries)
  progress.ts                    Cross-session progress engine (trends, weakness evolution, money metrics, hands-to-mastery)
  milestones.ts                  Achievement system (16 milestone types, checkMilestones, getAllMilestoneStates)
  storage.ts                     AsyncStorage persistence (betmaster21_training_ prefix)
  sync.ts                        Backend sync utility (best-effort POST to /stats)
  useTrainingSession.ts          React hook wrapping session logic
  useProgress.ts                 React hook for cross-session progress data
  adapters/
    BlackjackAdapter.ts          Blackjack-specific adapter (maps GameState + actions to training decisions)
```

### Key APIs
- `useTrainingSession(adapter, enabled)` — Returns `{ evaluate(), start(), end(), summary, roundDecisions, currentStreak, ... }`
- `useProgress(gameType)` — Returns `{ dashboard, allMilestones, newMilestones, refresh() }`
- `useTrainer(gameState, enabled)` — Backward-compatible hook used by `blackjack-game.tsx`, delegates to `useTrainingSession` internally

### Adding a New Game
1. Create `training/adapters/NewGameAdapter.ts` implementing `GameAdapter<TGameState, TAction>`
2. Implement `isDecisionPoint()`, `getOptimalAction()`, `normalizeAction()`
3. Use `useTrainingSession(newGameAdapter, enabled)` in the game screen
4. All analytics, progress, milestones, and storage work automatically

### Decision Categories
Blackjack uses: `hard_total`, `soft_total`, `pair_split`, `insurance`.

### Tests (319 total, 16 suites)
```bash
npx jest                                      # Run all 319 tests
npx jest __tests__/e2e/                       # 39 tests — E2E integration flows
npx jest __tests__/strategy.test.ts           # 41 tests — strategy engine
npx jest __tests__/training/                  # 117 tests — training modules
npx jest __tests__/game-engine.test.ts        # 43 tests — game engine
npx jest __tests__/mandatory-details.test.ts  # 21 tests — onboarding
npx jest __tests__/api.test.ts                # 6 tests — API/auth
```

### E2E Test Suites (`__tests__/e2e/`)
- `game-engine-integration.test.ts` — Full game lifecycle: bet → deal → play → settle, doubles, splits, multi-round, rebet
- `game-training-flow.test.ts` — Complete pipeline: game engine → BlackjackAdapter → TrainingSession → analytics → progress → milestones
- `auth-api-flow.test.ts` — Full API flows: signup → login → onboarding → stats, password reset, profile management, training analytics
- `learning-journey-flow.test.ts` — Full learning journey: level selection → card filtering → swipe mechanics → quiz tracking → completion → registry
- `learning-api-flow.test.ts` — Learning API flows: save/fetch progress, summary, sync utilities with mocked axios

## Learning Framework (`learning/`)

Game-agnostic learning card system using the **content provider pattern**. Any casino game can plug in by implementing `LearningContentProvider`.

### Architecture
```
learning/
  types.ts                       All interfaces (LearningCard, SkillLevel, LearningContentProvider, LearningProgress, etc.)
  registry.ts                    Central provider registry (auto-registers providers)
  storage.ts                     AsyncStorage persistence (betmaster21_learn_ prefix)
  useLearningSession.ts          React hook managing card deck state, swipe actions, quiz answers
  content/
    blackjack.ts                 Blackjack learning cards (~27 cards: rules, concepts, scenarios, tips, quizzes)
```

### Key APIs
- `getProvider(gameType)` — Get registered content provider
- `useLearningSession(gameType, skillLevel)` — Returns `{ cards, currentCard, swipeRight(), swipeLeft(), answerQuiz(), restart(), progress, isComplete }`
- Skill levels: `'beginner'` | `'amateur'` | `'pro'` — filter card content by user ability

### Adding a New Game
1. Create `learning/content/NewGame.ts` implementing `LearningContentProvider`
2. Register in `learning/registry.ts`
3. Add scenario renderer in `components/Learning/renderers/`
4. Add i18n keys under `learn.<gameType>.*`

## i18n

11 locales in `i18n/locales/`: en, zh, fr, it, nl, es, tl, de, cs, el, pl.
Namespaces in each JSON: `common`, `auth`, `home`, `game`, `profile`, `howToPlay`, `nav`, `setup`, `onboarding`, `loader`, `training`, `strategy`, `stats`, `drill`, `learn`.
Use `useTranslation()` hook with `t('namespace.key')`. When adding new UI text, add keys to all 11 locale files.

## Conventions

- Theme colors: `Colors[colorScheme ?? 'light']` from `constants/theme.ts`. Primary: `Colors.primary` (#11d4c4).
- Dark mode detection: `useColorScheme()` hook or `useTheme()` context.
- Navigation: `expo-router` — `router.push()`, `router.back()`, `router.replace()`.
- Auth: `useAuth()` context provides `token`, `login()`, `logout()`, `setMandatoryDetailsCompleted()`.
- API calls: `axios` with `API_URL` from `config.ts`. Auth header: `{ Authorization: \`Bearer ${token}\` }`.
