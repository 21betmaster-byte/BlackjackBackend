import { computeSummary, mergeSummaries } from '../../training/analytics';
import {
  TrainingSessionState,
  TrainingDecision,
  TrainingSessionSummary,
} from '../../training/types';

function makeDecision(overrides: Partial<TrainingDecision> = {}): TrainingDecision {
  return {
    id: `td_${Math.random()}`,
    timestamp: Date.now(),
    category: 'hard_total',
    scenarioKey: 'hard_16_vs_10',
    scenarioDescription: 'Hard 16 vs Dealer 10',
    userAction: 'hit',
    optimalAction: 'hit',
    isCorrect: true,
    explanation: 'Test explanation',
    context: { roundId: 1 },
    ...overrides,
  };
}

function makeSession(
  decisions: TrainingDecision[],
  overrides: Partial<TrainingSessionState> = {},
): TrainingSessionState {
  return {
    sessionId: 'test_session',
    gameType: 'blackjack',
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    decisions,
    currentStreak: 0,
    bestStreak: 0,
    ...overrides,
  };
}

describe('computeSummary', () => {
  it('returns zero accuracy for empty session', () => {
    const session = makeSession([]);
    const summary = computeSummary(session);

    expect(summary.totalDecisions).toBe(0);
    expect(summary.correctDecisions).toBe(0);
    expect(summary.overallAccuracy).toBe(0);
    expect(summary.categoryStats).toHaveLength(0);
  });

  it('computes 100% accuracy when all correct', () => {
    const decisions = [
      makeDecision({ isCorrect: true }),
      makeDecision({ isCorrect: true }),
      makeDecision({ isCorrect: true }),
    ];
    const summary = computeSummary(makeSession(decisions));

    expect(summary.totalDecisions).toBe(3);
    expect(summary.correctDecisions).toBe(3);
    expect(summary.overallAccuracy).toBe(1);
  });

  it('computes accuracy correctly with mix of correct/incorrect', () => {
    const decisions = [
      makeDecision({ isCorrect: true }),
      makeDecision({ isCorrect: false }),
      makeDecision({ isCorrect: true }),
    ];
    const summary = computeSummary(makeSession(decisions));

    expect(summary.totalDecisions).toBe(3);
    expect(summary.correctDecisions).toBe(2);
    expect(summary.overallAccuracy).toBeCloseTo(0.6667, 3);
  });

  it('groups decisions by category', () => {
    const decisions = [
      makeDecision({ category: 'hard_total', isCorrect: true }),
      makeDecision({ category: 'hard_total', isCorrect: false }),
      makeDecision({ category: 'soft_total', isCorrect: true }),
      makeDecision({ category: 'pair_split', isCorrect: true }),
    ];
    const summary = computeSummary(makeSession(decisions));

    expect(summary.categoryStats).toHaveLength(3);
    const hard = summary.categoryStats.find(c => c.category === 'hard_total');
    expect(hard!.total).toBe(2);
    expect(hard!.correct).toBe(1);
    expect(hard!.accuracy).toBe(0.5);

    const soft = summary.categoryStats.find(c => c.category === 'soft_total');
    expect(soft!.total).toBe(1);
    expect(soft!.accuracy).toBe(1);
  });

  it('computes scenario breakdown within categories', () => {
    const decisions = [
      makeDecision({ category: 'hard_total', scenarioKey: 'hard_16_vs_10', isCorrect: true }),
      makeDecision({ category: 'hard_total', scenarioKey: 'hard_16_vs_10', isCorrect: false }),
      makeDecision({ category: 'hard_total', scenarioKey: 'hard_12_vs_4', isCorrect: true }),
    ];
    const summary = computeSummary(makeSession(decisions));

    const hard = summary.categoryStats.find(c => c.category === 'hard_total')!;
    expect(hard.scenarioBreakdown['hard_16_vs_10']).toEqual({ total: 2, correct: 1 });
    expect(hard.scenarioBreakdown['hard_12_vs_4']).toEqual({ total: 1, correct: 1 });
  });

  it('identifies weakest categories sorted by accuracy ascending', () => {
    const decisions = [
      makeDecision({ category: 'hard_total', isCorrect: true }),
      makeDecision({ category: 'hard_total', isCorrect: true }),
      makeDecision({ category: 'soft_total', isCorrect: false }),
      makeDecision({ category: 'soft_total', isCorrect: false }),
      makeDecision({ category: 'pair_split', isCorrect: true }),
      makeDecision({ category: 'pair_split', isCorrect: false }),
    ];
    const summary = computeSummary(makeSession(decisions));

    // soft_total: 0%, pair_split: 50%, hard_total: 100%
    expect(summary.weakestCategories[0]).toBe('soft_total');
    expect(summary.weakestCategories[1]).toBe('pair_split');
    expect(summary.weakestCategories[2]).toBe('hard_total');
  });

  it('limits weakest categories to top 3', () => {
    const decisions = [
      makeDecision({ category: 'cat1', isCorrect: false }),
      makeDecision({ category: 'cat2', isCorrect: false }),
      makeDecision({ category: 'cat3', isCorrect: false }),
      makeDecision({ category: 'cat4', isCorrect: false }),
    ];
    const summary = computeSummary(makeSession(decisions));
    expect(summary.weakestCategories).toHaveLength(3);
  });

  it('counts rounds from context.roundId', () => {
    const decisions = [
      makeDecision({ context: { roundId: 1 } }),
      makeDecision({ context: { roundId: 1 } }),
      makeDecision({ context: { roundId: 2 } }),
      makeDecision({ context: { roundId: 3 } }),
    ];
    const summary = computeSummary(makeSession(decisions));
    expect(summary.roundsPlayed).toBe(3);
  });

  it('returns 0 rounds when no roundId in context', () => {
    const decisions = [
      makeDecision({ context: {} }),
      makeDecision({ context: {} }),
    ];
    const summary = computeSummary(makeSession(decisions));
    expect(summary.roundsPlayed).toBe(0);
  });

  it('preserves session metadata', () => {
    const session = makeSession([], {
      sessionId: 'my_session',
      gameType: 'blackjack',
      startedAt: 1000,
      endedAt: 2000,
      currentStreak: 5,
      bestStreak: 10,
    });
    const summary = computeSummary(session);

    expect(summary.sessionId).toBe('my_session');
    expect(summary.gameType).toBe('blackjack');
    expect(summary.startedAt).toBe(1000);
    expect(summary.endedAt).toBe(2000);
    expect(summary.currentStreak).toBe(5);
    expect(summary.bestStreak).toBe(10);
  });
});

describe('mergeSummaries', () => {
  function makeSummary(overrides: Partial<TrainingSessionSummary> = {}): TrainingSessionSummary {
    return {
      sessionId: 'test',
      gameType: 'blackjack',
      startedAt: 1000,
      endedAt: 2000,
      roundsPlayed: 5,
      totalDecisions: 10,
      correctDecisions: 7,
      overallAccuracy: 0.7,
      categoryStats: [],
      currentStreak: 3,
      bestStreak: 5,
      weakestCategories: [],
      ...overrides,
    };
  }

  it('returns null for empty array', () => {
    expect(mergeSummaries([])).toBeNull();
  });

  it('sums total decisions across sessions', () => {
    const merged = mergeSummaries([
      makeSummary({ totalDecisions: 10, correctDecisions: 7 }),
      makeSummary({ totalDecisions: 20, correctDecisions: 15 }),
    ]);

    expect(merged!.totalDecisions).toBe(30);
    expect(merged!.correctDecisions).toBe(22);
  });

  it('computes merged overall accuracy', () => {
    const merged = mergeSummaries([
      makeSummary({ totalDecisions: 10, correctDecisions: 8 }),
      makeSummary({ totalDecisions: 10, correctDecisions: 6 }),
    ]);

    expect(merged!.overallAccuracy).toBeCloseTo(0.7, 2);
  });

  it('sums rounds played', () => {
    const merged = mergeSummaries([
      makeSummary({ roundsPlayed: 5 }),
      makeSummary({ roundsPlayed: 8 }),
    ]);

    expect(merged!.roundsPlayed).toBe(13);
  });

  it('takes best streak from all sessions', () => {
    const merged = mergeSummaries([
      makeSummary({ bestStreak: 5 }),
      makeSummary({ bestStreak: 12 }),
      makeSummary({ bestStreak: 3 }),
    ]);

    expect(merged!.bestStreak).toBe(12);
  });

  it('merges category stats across sessions', () => {
    const merged = mergeSummaries([
      makeSummary({
        categoryStats: [
          { category: 'hard_total', total: 5, correct: 3, accuracy: 0.6, scenarioBreakdown: { 'h16v10': { total: 5, correct: 3 } } },
        ],
      }),
      makeSummary({
        categoryStats: [
          { category: 'hard_total', total: 5, correct: 4, accuracy: 0.8, scenarioBreakdown: { 'h16v10': { total: 3, correct: 2 }, 'h12v4': { total: 2, correct: 2 } } },
          { category: 'soft_total', total: 3, correct: 3, accuracy: 1, scenarioBreakdown: {} },
        ],
      }),
    ]);

    const hard = merged!.categoryStats.find(c => c.category === 'hard_total')!;
    expect(hard.total).toBe(10);
    expect(hard.correct).toBe(7);
    expect(hard.accuracy).toBe(0.7);
    expect(hard.scenarioBreakdown['h16v10']).toEqual({ total: 8, correct: 5 });
    expect(hard.scenarioBreakdown['h12v4']).toEqual({ total: 2, correct: 2 });

    const soft = merged!.categoryStats.find(c => c.category === 'soft_total')!;
    expect(soft.total).toBe(3);
  });

  it('uses earliest startedAt and latest endedAt', () => {
    const merged = mergeSummaries([
      makeSummary({ startedAt: 5000, endedAt: 6000 }),
      makeSummary({ startedAt: 1000, endedAt: 10000 }),
      makeSummary({ startedAt: 3000, endedAt: 4000 }),
    ]);

    expect(merged!.startedAt).toBe(1000);
    expect(merged!.endedAt).toBe(10000);
  });

  it('recomputes weakest categories from merged data', () => {
    const merged = mergeSummaries([
      makeSummary({
        categoryStats: [
          { category: 'hard_total', total: 10, correct: 9, accuracy: 0.9, scenarioBreakdown: {} },
          { category: 'soft_total', total: 10, correct: 3, accuracy: 0.3, scenarioBreakdown: {} },
        ],
      }),
    ]);

    expect(merged!.weakestCategories[0]).toBe('soft_total');
  });
});
