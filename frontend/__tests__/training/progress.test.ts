import {
  createProgressSnapshot,
  computeProgressDashboard,
  computeWeaknessEvolutions,
  computeTrend,
  computeMoneyMetrics,
  estimateHandsToMastery,
} from '../../training/progress';
import {
  TrainingSessionSummary,
  ProgressTimeline,
  ProgressSnapshot,
} from '../../training/types';

function makeSummary(overrides: Partial<TrainingSessionSummary> = {}): TrainingSessionSummary {
  return {
    sessionId: 'test_session',
    gameType: 'blackjack',
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    roundsPlayed: 10,
    totalDecisions: 20,
    correctDecisions: 14,
    overallAccuracy: 0.7,
    categoryStats: [
      { category: 'hard_total', total: 10, correct: 8, accuracy: 0.8, scenarioBreakdown: {} },
      { category: 'soft_total', total: 5, correct: 3, accuracy: 0.6, scenarioBreakdown: {} },
      { category: 'pair_split', total: 5, correct: 3, accuracy: 0.6, scenarioBreakdown: {} },
    ],
    currentStreak: 3,
    bestStreak: 7,
    weakestCategories: ['soft_total', 'pair_split', 'hard_total'],
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    timestamp: Date.now(),
    sessionId: 'test_session',
    overallAccuracy: 0.7,
    categoryAccuracies: { hard_total: 0.8, soft_total: 0.6 },
    totalDecisions: 20,
    totalCorrect: 14,
    ...overrides,
  };
}

function makeTimeline(snapshots: ProgressSnapshot[]): ProgressTimeline {
  return { gameType: 'blackjack', snapshots };
}

// ============================================================
// createProgressSnapshot
// ============================================================

describe('createProgressSnapshot', () => {
  it('captures overall accuracy from summary', () => {
    const summary = makeSummary({ overallAccuracy: 0.85 });
    const snap = createProgressSnapshot(summary);
    expect(snap.overallAccuracy).toBe(0.85);
  });

  it('captures session ID', () => {
    const summary = makeSummary({ sessionId: 'my_session' });
    const snap = createProgressSnapshot(summary);
    expect(snap.sessionId).toBe('my_session');
  });

  it('captures per-category accuracy', () => {
    const summary = makeSummary();
    const snap = createProgressSnapshot(summary);
    expect(snap.categoryAccuracies['hard_total']).toBe(0.8);
    expect(snap.categoryAccuracies['soft_total']).toBe(0.6);
  });

  it('captures total decisions and correct counts', () => {
    const summary = makeSummary({ totalDecisions: 30, correctDecisions: 25 });
    const snap = createProgressSnapshot(summary);
    expect(snap.totalDecisions).toBe(30);
    expect(snap.totalCorrect).toBe(25);
  });

  it('uses endedAt as timestamp', () => {
    const summary = makeSummary({ endedAt: 12345 });
    const snap = createProgressSnapshot(summary);
    expect(snap.timestamp).toBe(12345);
  });
});

// ============================================================
// computeTrend
// ============================================================

describe('computeTrend', () => {
  it('returns stable for single value', () => {
    expect(computeTrend([0.7])).toBe('stable');
  });

  it('returns improving when second half > first half by >5%', () => {
    expect(computeTrend([0.5, 0.55, 0.7, 0.8])).toBe('improving');
  });

  it('returns declining when second half < first half by >5%', () => {
    expect(computeTrend([0.8, 0.75, 0.6, 0.5])).toBe('declining');
  });

  it('returns stable when difference is within 5%', () => {
    expect(computeTrend([0.7, 0.72, 0.71, 0.73])).toBe('stable');
  });

  it('returns stable for two equal values', () => {
    expect(computeTrend([0.7, 0.7])).toBe('stable');
  });
});

// ============================================================
// computeWeaknessEvolutions
// ============================================================

describe('computeWeaknessEvolutions', () => {
  it('returns empty for empty timeline', () => {
    const evolutions = computeWeaknessEvolutions(makeTimeline([]));
    expect(evolutions).toHaveLength(0);
  });

  it('creates evolution for each category across snapshots', () => {
    const snapshots = [
      makeSnapshot({
        timestamp: 1000,
        categoryAccuracies: { hard_total: 0.5, soft_total: 0.4 },
      }),
      makeSnapshot({
        timestamp: 2000,
        categoryAccuracies: { hard_total: 0.7, soft_total: 0.6 },
      }),
    ];
    const evolutions = computeWeaknessEvolutions(makeTimeline(snapshots));

    expect(evolutions).toHaveLength(2);
    const hard = evolutions.find(e => e.category === 'hard_total')!;
    expect(hard.dataPoints).toHaveLength(2);
    expect(hard.dataPoints[0].accuracy).toBe(0.5);
    expect(hard.dataPoints[1].accuracy).toBe(0.7);
  });

  it('computes improving trend for increasing accuracy', () => {
    const snapshots = [
      makeSnapshot({ timestamp: 1000, categoryAccuracies: { hard_total: 0.5 } }),
      makeSnapshot({ timestamp: 2000, categoryAccuracies: { hard_total: 0.6 } }),
      makeSnapshot({ timestamp: 3000, categoryAccuracies: { hard_total: 0.75 } }),
      makeSnapshot({ timestamp: 4000, categoryAccuracies: { hard_total: 0.85 } }),
    ];
    const evolutions = computeWeaknessEvolutions(makeTimeline(snapshots));
    expect(evolutions[0].trend).toBe('improving');
  });

  it('handles category appearing in only some snapshots', () => {
    const snapshots = [
      makeSnapshot({ timestamp: 1000, categoryAccuracies: { hard_total: 0.5 } }),
      makeSnapshot({ timestamp: 2000, categoryAccuracies: { hard_total: 0.6, pair_split: 0.8 } }),
    ];
    const evolutions = computeWeaknessEvolutions(makeTimeline(snapshots));
    const pair = evolutions.find(e => e.category === 'pair_split')!;
    expect(pair.dataPoints).toHaveLength(1);
    expect(pair.trend).toBe('stable');
  });
});

// ============================================================
// computeMoneyMetrics
// ============================================================

describe('computeMoneyMetrics', () => {
  it('returns zeros for empty timeline', () => {
    const metrics = computeMoneyMetrics(makeTimeline([]), 25);
    expect(metrics.estimatedSavingsPerHour).toBe(0);
    expect(metrics.totalHandsOptimal).toBe(0);
    expect(metrics.expectedValueImprovement).toBe(0);
  });

  it('computes positive savings when accuracy exceeds baseline (60%)', () => {
    const snapshots = [
      makeSnapshot({ totalDecisions: 100, totalCorrect: 80, overallAccuracy: 0.8 }),
    ];
    const metrics = computeMoneyMetrics(makeTimeline(snapshots), 25);
    expect(metrics.estimatedSavingsPerHour).toBeGreaterThan(0);
    expect(metrics.totalHandsOptimal).toBe(80);
  });

  it('returns zero savings when accuracy is at or below baseline', () => {
    const snapshots = [
      makeSnapshot({ totalDecisions: 100, totalCorrect: 50, overallAccuracy: 0.5 }),
    ];
    const metrics = computeMoneyMetrics(makeTimeline(snapshots), 25);
    expect(metrics.estimatedSavingsPerHour).toBe(0);
  });

  it('scales savings with bet size', () => {
    const snapshots = [
      makeSnapshot({ totalDecisions: 100, totalCorrect: 90, overallAccuracy: 0.9 }),
    ];
    const metricsLow = computeMoneyMetrics(makeTimeline(snapshots), 10);
    const metricsHigh = computeMoneyMetrics(makeTimeline(snapshots), 100);
    expect(metricsHigh.estimatedSavingsPerHour).toBeGreaterThan(metricsLow.estimatedSavingsPerHour);
  });

  it('aggregates across multiple snapshots', () => {
    const snapshots = [
      makeSnapshot({ totalDecisions: 50, totalCorrect: 40 }),
      makeSnapshot({ totalDecisions: 50, totalCorrect: 45 }),
    ];
    const metrics = computeMoneyMetrics(makeTimeline(snapshots), 25);
    expect(metrics.totalHandsOptimal).toBe(85);
  });
});

// ============================================================
// estimateHandsToMastery
// ============================================================

describe('estimateHandsToMastery', () => {
  it('returns null for single snapshot (insufficient data)', () => {
    const result = estimateHandsToMastery(makeTimeline([
      makeSnapshot({ totalDecisions: 20, overallAccuracy: 0.7 }),
    ]));
    expect(result).toBeNull();
  });

  it('returns null when already at 95%+ accuracy', () => {
    const result = estimateHandsToMastery(makeTimeline([
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.90 }),
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.96 }),
    ]));
    expect(result).toBeNull();
  });

  it('returns positive number for improving player below 95%', () => {
    const result = estimateHandsToMastery(makeTimeline([
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.60 }),
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.70 }),
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.80 }),
    ]));
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });

  it('returns null for declining player', () => {
    const result = estimateHandsToMastery(makeTimeline([
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.85 }),
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.75 }),
      makeSnapshot({ totalDecisions: 50, overallAccuracy: 0.65 }),
    ]));
    expect(result).toBeNull();
  });

  it('caps at 100000 for very slow improvement', () => {
    const result = estimateHandsToMastery(makeTimeline([
      makeSnapshot({ totalDecisions: 100, overallAccuracy: 0.60 }),
      makeSnapshot({ totalDecisions: 100, overallAccuracy: 0.6001 }),
    ]));
    if (result !== null) {
      expect(result).toBeLessThanOrEqual(100000);
    }
  });
});

// ============================================================
// computeProgressDashboard (integration)
// ============================================================

describe('computeProgressDashboard', () => {
  it('returns full dashboard structure', () => {
    const snapshots = [
      makeSnapshot({ timestamp: 1000, totalDecisions: 20, totalCorrect: 16, overallAccuracy: 0.8 }),
      makeSnapshot({ timestamp: 2000, totalDecisions: 20, totalCorrect: 17, overallAccuracy: 0.85 }),
    ];
    const dashboard = computeProgressDashboard(makeTimeline(snapshots), []);

    expect(dashboard.timeline).toBeDefined();
    expect(dashboard.milestones).toBeDefined();
    expect(dashboard.weaknessEvolutions).toBeDefined();
    expect(dashboard.moneyMetrics).toBeDefined();
    expect(dashboard.handsToMastery).toBeDefined();
  });

  it('passes milestones through unchanged', () => {
    const milestones = [
      { id: 'm1', type: 'accuracy_50' as const, name: 'Test', description: 'Test', icon: 'star', unlockedAt: 1000 },
    ];
    const dashboard = computeProgressDashboard(makeTimeline([makeSnapshot()]), milestones);
    expect(dashboard.milestones).toBe(milestones);
  });
});
