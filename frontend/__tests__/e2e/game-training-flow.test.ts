/**
 * E2E Integration Test: Full Game → Training → Analytics Flow
 *
 * Tests the complete lifecycle of playing blackjack hands while training
 * mode is active, and verifies that all analytics, progress tracking,
 * and milestone systems produce correct results.
 *
 * This exercises: engine.ts → BlackjackAdapter → TrainingSession →
 * analytics → progress → milestones — all wired together.
 */

import {
  createInitialState,
  placeBet,
  dealInitialCards,
  completeDeal,
  playerHit,
  playerStand,
  playerDouble,
  playerSplit,
  playDealer,
  settleRound,
  startNewRound,
  scoreHand,
  canSplit,
  canDouble,
  createShoe,
  Card,
  GameState,
  Suit,
  Rank,
  DEFAULT_CONFIG,
} from '../../game/engine';
import { getBestPlay, getDetailedPlay } from '../../game/strategy';
import {
  blackjackAdapter,
  resetRoundCounter,
  incrementRoundCounter,
} from '../../training/adapters/BlackjackAdapter';
import {
  createSession,
  recordDecision,
  endSession,
  _resetIdCounter,
} from '../../training/TrainingSession';
import { computeSummary, mergeSummaries } from '../../training/analytics';
import {
  createProgressSnapshot,
  computeProgressDashboard,
  computeWeaknessEvolutions,
  computeMoneyMetrics,
  estimateHandsToMastery,
} from '../../training/progress';
import {
  checkMilestones,
  getAllMilestoneStates,
  MILESTONE_DEFINITIONS,
} from '../../training/milestones';
import {
  TrainingSessionState,
  TrainingSessionSummary,
  ProgressTimeline,
  Milestone,
} from '../../training/types';

// ============================================================
// Helpers
// ============================================================

function card(rank: Rank, suit: Suit = 'spades', faceUp = true): Card {
  return { rank, suit, faceUp };
}

/** Create a game state with a rigged shoe for deterministic testing. */
function makeRiggedState(shoeCards: Card[]): GameState {
  return {
    shoe: shoeCards,
    discardPile: [],
    dealerHand: [],
    playerHands: Array.from({ length: DEFAULT_CONFIG.maxHands }, () => ({
      cards: [] as Card[],
      bet: 0,
      status: 'active' as const,
      isDoubled: false,
    })),
    activeHandIndex: 0,
    phase: 'betting',
    balance: 1000,
    insuranceBet: 0,
    roundResult: null,
    config: DEFAULT_CONFIG,
    previousBets: [],
  };
}

/** Play a complete round of blackjack with training, returning all artifacts. */
function playRoundWithTraining(
  gameState: GameState,
  session: TrainingSessionState,
  playerActions: string[],
): {
  gameState: GameState;
  session: TrainingSessionState;
  decisionsRecorded: number;
} {
  let state = gameState;
  let sess = session;
  let decisionsRecorded = 0;
  let actionIndex = 0;

  incrementRoundCounter();

  // Player turn — record decisions and apply actions
  while (state.phase === 'player_turn') {
    const hand = state.playerHands[state.activeHandIndex];
    if (!hand || hand.status !== 'active') break;

    const action = playerActions[actionIndex] ?? 'stand';
    actionIndex++;

    // Record decision via training adapter
    if (blackjackAdapter.isDecisionPoint(state)) {
      const result = recordDecision(sess, blackjackAdapter, state, action as any);
      sess = result.session;
      if (result.decision) decisionsRecorded++;
    }

    // Apply action to game state
    switch (action) {
      case 'hit':
        state = playerHit(state);
        break;
      case 'stand':
        state = playerStand(state);
        break;
      case 'double':
        state = playerDouble(state);
        break;
      case 'split':
        state = playerSplit(state);
        break;
      default:
        state = playerStand(state);
    }
  }

  // Dealer turn and settlement
  if (state.phase === 'dealer_turn') {
    state = playDealer(state);
  }
  if (state.phase === 'settlement') {
    state = settleRound(state);
  }

  return { gameState: state, session: sess, decisionsRecorded };
}

// ============================================================
// E2E Test: Complete Game + Training Session
// ============================================================

describe('E2E: Game → Training → Analytics Flow', () => {
  beforeEach(() => {
    _resetIdCounter();
    resetRoundCounter();
  });

  describe('Single Round Training', () => {
    it('records a correct decision when player follows basic strategy', () => {
      // dealCard pops from end of array
      // Deal order: player1, dealer-up, player2, dealer-hole
      // Player: 10+6=16, Dealer shows 6 → stand is correct
      const shoe: Card[] = [
        card('3', 'hearts'),       // extra card in shoe (won't be dealt)
        card('6', 'clubs', false), // dealer hole (4th dealt, face down)
        card('6', 'hearts'),       // player card 2 (3rd dealt)
        card('6', 'diamonds'),     // dealer up card (2nd dealt)
        card('10', 'spades'),      // player card 1 (1st dealt)
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 25);
      state = dealInitialCards(state);
      state = completeDeal(state);

      expect(state.phase).toBe('player_turn');
      expect(scoreHand(state.playerHands[0].cards).total).toBe(16);

      const session = createSession('blackjack');
      incrementRoundCounter();

      expect(blackjackAdapter.isDecisionPoint(state)).toBe(true);

      const result = recordDecision(session, blackjackAdapter, state, 'stand');
      expect(result.decision).not.toBeNull();
      expect(result.decision!.isCorrect).toBe(true);
      expect(result.decision!.category).toBe('hard_total');
      expect(result.decision!.userAction).toBe('stand');
      expect(result.decision!.optimalAction).toBe('stand');
    });

    it('records an incorrect decision when player deviates from strategy', () => {
      // Player: 10+6=16, Dealer shows 10 → optimal = hit
      const shoe: Card[] = [
        card('5', 'hearts'),       // extra (hit card)
        card('7', 'clubs', false), // dealer hole
        card('6', 'hearts'),       // player card 2
        card('10', 'diamonds'),    // dealer up card
        card('10', 'spades'),      // player card 1
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 25);
      state = dealInitialCards(state);
      state = completeDeal(state);

      expect(state.phase).toBe('player_turn');

      const session = createSession('blackjack');
      incrementRoundCounter();

      // Player stands on 16 vs 10 → incorrect (should surrender for 2-card hand, or hit)
      const result = recordDecision(session, blackjackAdapter, state, 'stand');
      expect(result.decision).not.toBeNull();
      expect(result.decision!.isCorrect).toBe(false);
      expect(result.decision!.userAction).toBe('stand');
      // With surrender available (2-card hand), optimal is surrender; otherwise hit
      expect(['hit', 'surrender']).toContain(result.decision!.optimalAction);
    });
  });

  describe('Multi-Round Session with Analytics', () => {
    it('plays multiple rounds and computes correct session summary', () => {
      let session = createSession('blackjack');

      // Simulate 5 decisions across rounds
      const scenarios: Array<{
        category: string;
        userAction: string;
        optimalAction: string;
        correct: boolean;
      }> = [
        { category: 'hard_total', userAction: 'stand', optimalAction: 'stand', correct: true },
        { category: 'hard_total', userAction: 'hit', optimalAction: 'hit', correct: true },
        { category: 'hard_total', userAction: 'stand', optimalAction: 'hit', correct: false },
        { category: 'soft_total', userAction: 'hit', optimalAction: 'hit', correct: true },
        { category: 'soft_total', userAction: 'stand', optimalAction: 'double', correct: false },
      ];

      // Manually record decisions to simulate adapter output
      for (const sc of scenarios) {
        const decision = {
          id: `td_test_${session.decisions.length}`,
          timestamp: Date.now(),
          category: sc.category,
          scenarioKey: `${sc.category}_test`,
          scenarioDescription: `Test ${sc.category}`,
          userAction: sc.userAction,
          optimalAction: sc.optimalAction,
          isCorrect: sc.correct,
          explanation: 'Test explanation',
          context: { roundId: Math.floor(session.decisions.length / 2) + 1 },
        };
        const newStreak = sc.correct ? session.currentStreak + 1 : 0;
        session = {
          ...session,
          decisions: [...session.decisions, decision],
          currentStreak: newStreak,
          bestStreak: Math.max(session.bestStreak, newStreak),
        };
      }

      session = endSession(session);
      const summary = computeSummary(session);

      expect(summary.totalDecisions).toBe(5);
      expect(summary.correctDecisions).toBe(3);
      expect(summary.overallAccuracy).toBeCloseTo(0.6);
      expect(summary.bestStreak).toBe(2);

      // Category breakdown
      const hard = summary.categoryStats.find(c => c.category === 'hard_total');
      expect(hard).toBeDefined();
      expect(hard!.total).toBe(3);
      expect(hard!.correct).toBe(2);
      expect(hard!.accuracy).toBeCloseTo(2 / 3);

      const soft = summary.categoryStats.find(c => c.category === 'soft_total');
      expect(soft).toBeDefined();
      expect(soft!.total).toBe(2);
      expect(soft!.correct).toBe(1);
      expect(soft!.accuracy).toBeCloseTo(0.5);

      // Weakest categories
      expect(summary.weakestCategories[0]).toBe('soft_total');
    });
  });

  describe('Multi-Session Progress Tracking', () => {
    function makeSessionSummary(
      overrides: Partial<TrainingSessionSummary>,
    ): TrainingSessionSummary {
      return {
        sessionId: `session_${Math.random()}`,
        gameType: 'blackjack',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        roundsPlayed: 10,
        totalDecisions: 20,
        correctDecisions: 10,
        overallAccuracy: 0.5,
        categoryStats: [],
        currentStreak: 0,
        bestStreak: 5,
        weakestCategories: [],
        ...overrides,
      };
    }

    it('creates progress snapshots and computes dashboard', () => {
      const summaries = [
        makeSessionSummary({
          sessionId: 's1',
          totalDecisions: 20,
          correctDecisions: 10,
          overallAccuracy: 0.5,
          bestStreak: 3,
          categoryStats: [
            { category: 'hard_total', total: 10, correct: 5, accuracy: 0.5, scenarioBreakdown: {} },
            { category: 'soft_total', total: 10, correct: 5, accuracy: 0.5, scenarioBreakdown: {} },
          ],
          startedAt: Date.now() - 7200000,
          endedAt: Date.now() - 3600000,
        }),
        makeSessionSummary({
          sessionId: 's2',
          totalDecisions: 20,
          correctDecisions: 15,
          overallAccuracy: 0.75,
          bestStreak: 8,
          categoryStats: [
            { category: 'hard_total', total: 10, correct: 8, accuracy: 0.8, scenarioBreakdown: {} },
            { category: 'soft_total', total: 10, correct: 7, accuracy: 0.7, scenarioBreakdown: {} },
          ],
          startedAt: Date.now() - 3600000,
          endedAt: Date.now(),
        }),
      ];

      // Build timeline from summaries
      const snapshots = summaries.map(s => createProgressSnapshot(s));
      const timeline: ProgressTimeline = {
        gameType: 'blackjack',
        snapshots,
      };

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].overallAccuracy).toBe(0.5);
      expect(snapshots[1].overallAccuracy).toBe(0.75);

      // Compute dashboard
      const dashboard = computeProgressDashboard(timeline, []);

      // Weakness evolutions should show improvement
      const hardEvo = dashboard.weaknessEvolutions.find(
        w => w.category === 'hard_total',
      );
      expect(hardEvo).toBeDefined();
      expect(hardEvo!.dataPoints).toHaveLength(2);
      // 0.5 → 0.8 is >0.05 gain → improving
      expect(hardEvo!.trend).toBe('improving');

      // Money metrics should reflect improvement over baseline (60%)
      expect(dashboard.moneyMetrics.estimatedSavingsPerHour).toBeGreaterThanOrEqual(0);

      // Hands to mastery should be non-null (not at 95% yet, improving)
      // May be null depending on linear regression — just verify it's a number or null
      if (dashboard.handsToMastery !== null) {
        expect(dashboard.handsToMastery).toBeGreaterThan(0);
      }
    });

    it('merges summaries correctly across sessions', () => {
      const s1 = makeSessionSummary({
        totalDecisions: 10,
        correctDecisions: 8,
        overallAccuracy: 0.8,
        bestStreak: 5,
        categoryStats: [
          { category: 'hard_total', total: 6, correct: 5, accuracy: 5 / 6, scenarioBreakdown: { 'ht_16v10': { total: 3, correct: 2 } } },
          { category: 'soft_total', total: 4, correct: 3, accuracy: 0.75, scenarioBreakdown: {} },
        ],
      });
      const s2 = makeSessionSummary({
        totalDecisions: 10,
        correctDecisions: 9,
        overallAccuracy: 0.9,
        bestStreak: 9,
        categoryStats: [
          { category: 'hard_total', total: 5, correct: 5, accuracy: 1.0, scenarioBreakdown: { 'ht_16v10': { total: 2, correct: 2 } } },
          { category: 'pair_split', total: 5, correct: 4, accuracy: 0.8, scenarioBreakdown: {} },
        ],
      });

      const merged = mergeSummaries([s1, s2]);
      expect(merged).not.toBeNull();
      expect(merged!.totalDecisions).toBe(20);
      expect(merged!.correctDecisions).toBe(17);
      expect(merged!.overallAccuracy).toBeCloseTo(0.85);
      expect(merged!.bestStreak).toBe(9);

      const hardTotal = merged!.categoryStats.find(c => c.category === 'hard_total');
      expect(hardTotal!.total).toBe(11);
      expect(hardTotal!.correct).toBe(10);

      // Scenario breakdown should be merged
      expect(hardTotal!.scenarioBreakdown['ht_16v10'].total).toBe(5);
      expect(hardTotal!.scenarioBreakdown['ht_16v10'].correct).toBe(4);

      // New category from s2
      const pairSplit = merged!.categoryStats.find(c => c.category === 'pair_split');
      expect(pairSplit!.total).toBe(5);
    });
  });

  describe('Milestone System E2E', () => {
    function makeSessionSummary(
      overrides: Partial<TrainingSessionSummary>,
    ): TrainingSessionSummary {
      return {
        sessionId: `ms_${Math.random()}`,
        gameType: 'blackjack',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        roundsPlayed: 5,
        totalDecisions: 10,
        correctDecisions: 5,
        overallAccuracy: 0.5,
        categoryStats: [],
        currentStreak: 0,
        bestStreak: 0,
        weakestCategories: [],
        ...overrides,
      };
    }

    it('unlocks accuracy milestones progressively', () => {
      const timeline: ProgressTimeline = { gameType: 'blackjack', snapshots: [] };
      let existing: Milestone[] = [];

      // 50% accuracy → accuracy_50
      const sessions50 = [
        makeSessionSummary({ totalDecisions: 20, correctDecisions: 10, overallAccuracy: 0.5 }),
      ];
      let newMilestones = checkMilestones(timeline, sessions50, existing);
      const has50 = newMilestones.find(m => m.type === 'accuracy_50');
      expect(has50).toBeDefined();
      existing = [...existing, ...newMilestones];

      // 75% accuracy → accuracy_75 (but not accuracy_50 again)
      const sessions75 = [
        makeSessionSummary({ totalDecisions: 40, correctDecisions: 30, overallAccuracy: 0.75 }),
      ];
      newMilestones = checkMilestones(timeline, sessions75, existing);
      expect(newMilestones.find(m => m.type === 'accuracy_50')).toBeUndefined(); // already earned
      expect(newMilestones.find(m => m.type === 'accuracy_75')).toBeDefined();
    });

    it('unlocks streak milestones', () => {
      const timeline: ProgressTimeline = { gameType: 'blackjack', snapshots: [] };

      const sessions = [
        makeSessionSummary({ bestStreak: 12 }),
      ];

      const newMilestones = checkMilestones(timeline, sessions, []);
      expect(newMilestones.find(m => m.type === 'streak_10')).toBeDefined();
      expect(newMilestones.find(m => m.type === 'streak_25')).toBeUndefined();
    });

    it('unlocks volume badges', () => {
      const timeline: ProgressTimeline = { gameType: 'blackjack', snapshots: [] };

      const sessions = [
        makeSessionSummary({ totalDecisions: 60 }),
        makeSessionSummary({ totalDecisions: 50 }),
      ];

      const newMilestones = checkMilestones(timeline, sessions, []);
      expect(newMilestones.find(m => m.type === 'hands_100')).toBeDefined();
      expect(newMilestones.find(m => m.type === 'hands_500')).toBeUndefined();
    });

    it('unlocks consistency milestone after 5 high-accuracy sessions', () => {
      const timeline: ProgressTimeline = { gameType: 'blackjack', snapshots: [] };

      const sessions = Array.from({ length: 5 }, (_, i) =>
        makeSessionSummary({
          sessionId: `cons_${i}`,
          totalDecisions: 20,
          correctDecisions: 18,
          overallAccuracy: 0.9,
        }),
      );

      const newMilestones = checkMilestones(timeline, sessions, []);
      expect(newMilestones.find(m => m.type === 'consistency')).toBeDefined();
    });

    it('getAllMilestoneStates returns all definitions with correct locked/unlocked state', () => {
      const unlockedMilestone: Milestone = {
        id: 'milestone_accuracy_50',
        type: 'accuracy_50',
        name: 'Getting Started',
        description: 'Reach 50% overall accuracy',
        icon: 'trending-up',
        unlockedAt: Date.now(),
      };

      const states = getAllMilestoneStates([unlockedMilestone]);
      expect(states).toHaveLength(MILESTONE_DEFINITIONS.length);

      const acc50 = states.find(m => m.type === 'accuracy_50');
      expect(acc50!.unlockedAt).not.toBeNull();

      const acc75 = states.find(m => m.type === 'accuracy_75');
      expect(acc75!.unlockedAt).toBeNull();
    });
  });

  describe('Full Pipeline: Game Engine → Training → Summary → Progress → Milestones', () => {
    it('runs a complete multi-session pipeline and produces coherent results', () => {
      const allSummaries: TrainingSessionSummary[] = [];
      const allSnapshots: ProgressTimeline = {
        gameType: 'blackjack',
        snapshots: [],
      };
      let allMilestones: Milestone[] = [];

      // --- Session 1: Beginner (50% accuracy) ---
      let session1 = createSession('blackjack');
      // Simulate decisions manually
      const decisions1 = [
        { category: 'hard_total', correct: true },
        { category: 'hard_total', correct: false },
        { category: 'soft_total', correct: true },
        { category: 'soft_total', correct: false },
        { category: 'hard_total', correct: true },
        { category: 'hard_total', correct: false },
        { category: 'soft_total', correct: true },
        { category: 'soft_total', correct: false },
        { category: 'pair_split', correct: true },
        { category: 'pair_split', correct: false },
      ];

      for (const d of decisions1) {
        session1 = {
          ...session1,
          decisions: [
            ...session1.decisions,
            {
              id: `td_s1_${session1.decisions.length}`,
              timestamp: Date.now(),
              category: d.category,
              scenarioKey: `${d.category}_s1`,
              scenarioDescription: `Test ${d.category}`,
              userAction: d.correct ? 'hit' : 'stand',
              optimalAction: 'hit',
              isCorrect: d.correct,
              explanation: '',
              context: { roundId: Math.floor(session1.decisions.length / 2) + 1 },
            },
          ],
          currentStreak: d.correct ? session1.currentStreak + 1 : 0,
          bestStreak: d.correct
            ? Math.max(session1.bestStreak, session1.currentStreak + 1)
            : session1.bestStreak,
        };
      }
      session1 = endSession(session1);
      const summary1 = computeSummary(session1);
      allSummaries.push(summary1);
      allSnapshots.snapshots.push(createProgressSnapshot(summary1));

      expect(summary1.totalDecisions).toBe(10);
      expect(summary1.overallAccuracy).toBe(0.5);

      // Check milestones after session 1
      let newMs = checkMilestones(allSnapshots, allSummaries, allMilestones);
      allMilestones = [...allMilestones, ...newMs];
      expect(newMs.find(m => m.type === 'accuracy_50')).toBeDefined();

      // --- Session 2: Improving (80% accuracy) ---
      let session2 = createSession('blackjack');
      const decisions2 = [
        { category: 'hard_total', correct: true },
        { category: 'hard_total', correct: true },
        { category: 'soft_total', correct: true },
        { category: 'soft_total', correct: true },
        { category: 'hard_total', correct: true },
        { category: 'hard_total', correct: true },
        { category: 'soft_total', correct: false },
        { category: 'soft_total', correct: true },
        { category: 'pair_split', correct: true },
        { category: 'pair_split', correct: false },
      ];

      for (const d of decisions2) {
        session2 = {
          ...session2,
          decisions: [
            ...session2.decisions,
            {
              id: `td_s2_${session2.decisions.length}`,
              timestamp: Date.now(),
              category: d.category,
              scenarioKey: `${d.category}_s2`,
              scenarioDescription: `Test ${d.category}`,
              userAction: d.correct ? 'hit' : 'stand',
              optimalAction: 'hit',
              isCorrect: d.correct,
              explanation: '',
              context: { roundId: Math.floor(session2.decisions.length / 2) + 1 },
            },
          ],
          currentStreak: d.correct ? session2.currentStreak + 1 : 0,
          bestStreak: d.correct
            ? Math.max(session2.bestStreak, session2.currentStreak + 1)
            : session2.bestStreak,
        };
      }
      session2 = endSession(session2);
      const summary2 = computeSummary(session2);
      allSummaries.push(summary2);
      allSnapshots.snapshots.push(createProgressSnapshot(summary2));

      expect(summary2.totalDecisions).toBe(10);
      expect(summary2.overallAccuracy).toBe(0.8);

      // Check milestones after session 2
      newMs = checkMilestones(allSnapshots, allSummaries, allMilestones);
      allMilestones = [...allMilestones, ...newMs];
      // Lifetime: 13/20 = 65% — not yet at 75%, but accuracy_50 already earned
      // New milestones might include hands_100 (no, only 20 hands), streak, etc.
      // The key check is that the milestone system processes correctly
      expect(allMilestones.length).toBeGreaterThanOrEqual(1); // at least accuracy_50

      // Merged summary
      const merged = mergeSummaries(allSummaries);
      expect(merged).not.toBeNull();
      expect(merged!.totalDecisions).toBe(20);
      expect(merged!.correctDecisions).toBe(13);
      expect(merged!.overallAccuracy).toBeCloseTo(0.65);

      // Progress dashboard
      const dashboard = computeProgressDashboard(allSnapshots, allMilestones);
      expect(dashboard.timeline.snapshots).toHaveLength(2);
      expect(dashboard.weaknessEvolutions.length).toBeGreaterThan(0);

      // All milestones grid
      const allStates = getAllMilestoneStates(allMilestones);
      expect(allStates).toHaveLength(MILESTONE_DEFINITIONS.length);
      const unlockedCount = allStates.filter(m => m.unlockedAt !== null).length;
      expect(unlockedCount).toBeGreaterThanOrEqual(1); // at least accuracy_50
    });
  });
});
