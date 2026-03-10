import {
  checkMilestones,
  getAllMilestoneStates,
  MILESTONE_DEFINITIONS,
} from '../../training/milestones';
import {
  Milestone,
  ProgressTimeline,
  ProgressSnapshot,
  TrainingSessionSummary,
  CategoryStats,
} from '../../training/types';

function makeSnapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    timestamp: Date.now(),
    sessionId: 'test',
    overallAccuracy: 0.7,
    categoryAccuracies: {},
    totalDecisions: 20,
    totalCorrect: 14,
    ...overrides,
  };
}

function makeTimeline(snapshots: ProgressSnapshot[] = []): ProgressTimeline {
  return { gameType: 'blackjack', snapshots };
}

function makeSummary(overrides: Partial<TrainingSessionSummary> = {}): TrainingSessionSummary {
  return {
    sessionId: 'test',
    gameType: 'blackjack',
    startedAt: 1000,
    endedAt: 2000,
    roundsPlayed: 10,
    totalDecisions: 20,
    correctDecisions: 14,
    overallAccuracy: 0.7,
    categoryStats: [],
    currentStreak: 3,
    bestStreak: 5,
    weakestCategories: [],
    ...overrides,
  };
}

function makeMilestone(type: Milestone['type'], unlockedAt: number | null = Date.now()): Milestone {
  return {
    id: `milestone_${type}`,
    type,
    name: 'Test',
    description: 'Test',
    icon: 'star',
    unlockedAt,
  };
}

// ============================================================
// Accuracy milestones
// ============================================================

describe('accuracy milestones', () => {
  it('awards accuracy_50 when lifetime accuracy >= 50%', () => {
    const sessions = [makeSummary({ totalDecisions: 20, correctDecisions: 11 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    const found = newMs.find(m => m.type === 'accuracy_50');
    expect(found).toBeDefined();
  });

  it('does NOT award accuracy_50 with fewer than 10 decisions', () => {
    const sessions = [makeSummary({ totalDecisions: 5, correctDecisions: 4 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'accuracy_50')).toBeUndefined();
  });

  it('awards accuracy_75 at 75% lifetime accuracy', () => {
    const sessions = [makeSummary({ totalDecisions: 100, correctDecisions: 76 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'accuracy_75')).toBeDefined();
  });

  it('awards accuracy_90 at 90%', () => {
    const sessions = [makeSummary({ totalDecisions: 100, correctDecisions: 91 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'accuracy_90')).toBeDefined();
  });

  it('awards accuracy_95 at 95%', () => {
    const sessions = [makeSummary({ totalDecisions: 100, correctDecisions: 96 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'accuracy_95')).toBeDefined();
  });
});

// ============================================================
// Streak milestones
// ============================================================

describe('streak milestones', () => {
  it('awards streak_10 when best streak >= 10', () => {
    const sessions = [makeSummary({ bestStreak: 12 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'streak_10')).toBeDefined();
  });

  it('does NOT award streak_25 when best streak is 20', () => {
    const sessions = [makeSummary({ bestStreak: 20 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'streak_25')).toBeUndefined();
  });

  it('awards streak_100 when best streak >= 100', () => {
    const sessions = [makeSummary({ bestStreak: 100 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'streak_100')).toBeDefined();
  });
});

// ============================================================
// Volume milestones
// ============================================================

describe('volume milestones', () => {
  it('awards hands_100 at 100+ decisions', () => {
    const sessions = [makeSummary({ totalDecisions: 100 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'hands_100')).toBeDefined();
  });

  it('awards hands_500 summed across sessions', () => {
    const sessions = [
      makeSummary({ totalDecisions: 200 }),
      makeSummary({ totalDecisions: 300 }),
    ];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'hands_500')).toBeDefined();
  });

  it('does NOT award hands_1000 with 999 decisions', () => {
    const sessions = [makeSummary({ totalDecisions: 999 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'hands_1000')).toBeUndefined();
  });
});

// ============================================================
// Special milestones
// ============================================================

describe('special milestones', () => {
  it('awards first_perfect_round when a session has 100% accuracy', () => {
    const sessions = [makeSummary({ totalDecisions: 3, correctDecisions: 3, overallAccuracy: 1.0 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'first_perfect_round')).toBeDefined();
  });

  it('awards zero_mistakes_session with 10+ rounds and 100% accuracy', () => {
    const sessions = [makeSummary({ roundsPlayed: 10, totalDecisions: 30, correctDecisions: 30, overallAccuracy: 1.0 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'zero_mistakes_session')).toBeDefined();
  });

  it('does NOT award zero_mistakes_session with < 10 rounds', () => {
    const sessions = [makeSummary({ roundsPlayed: 5, totalDecisions: 10, correctDecisions: 10, overallAccuracy: 1.0 })];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'zero_mistakes_session')).toBeUndefined();
  });

  it('awards category_mastered when merged category has 95%+ with 20+ decisions', () => {
    const sessions = [
      makeSummary({
        categoryStats: [
          { category: 'hard_total', total: 25, correct: 24, accuracy: 0.96, scenarioBreakdown: {} },
        ],
      }),
    ];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    const found = newMs.find(m => m.type === 'category_mastered');
    expect(found).toBeDefined();
    expect(found!.detail).toBe('hard_total');
  });

  it('does NOT award category_mastered with < 20 decisions', () => {
    const sessions = [
      makeSummary({
        categoryStats: [
          { category: 'hard_total', total: 15, correct: 15, accuracy: 1.0, scenarioBreakdown: {} },
        ],
      }),
    ];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'category_mastered')).toBeUndefined();
  });

  it('awards comeback when going from <50% to >80%', () => {
    const snapshots = [
      makeSnapshot({ overallAccuracy: 0.4, totalDecisions: 10 }),
      makeSnapshot({ overallAccuracy: 0.6, totalDecisions: 10 }),
      makeSnapshot({ overallAccuracy: 0.85, totalDecisions: 10 }),
    ];
    const newMs = checkMilestones(makeTimeline(snapshots), [], []);
    expect(newMs.find(m => m.type === 'comeback')).toBeDefined();
  });

  it('does NOT award comeback without the below-50% dip', () => {
    const snapshots = [
      makeSnapshot({ overallAccuracy: 0.6, totalDecisions: 10 }),
      makeSnapshot({ overallAccuracy: 0.85, totalDecisions: 10 }),
    ];
    const newMs = checkMilestones(makeTimeline(snapshots), [], []);
    expect(newMs.find(m => m.type === 'comeback')).toBeUndefined();
  });

  it('awards consistency with 5 consecutive sessions above 85%', () => {
    const sessions = Array.from({ length: 5 }, () =>
      makeSummary({ overallAccuracy: 0.9, totalDecisions: 10 }),
    );
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'consistency')).toBeDefined();
  });

  it('does NOT award consistency if one session dips below 85%', () => {
    const sessions = [
      makeSummary({ overallAccuracy: 0.9, totalDecisions: 10 }),
      makeSummary({ overallAccuracy: 0.9, totalDecisions: 10 }),
      makeSummary({ overallAccuracy: 0.7, totalDecisions: 10 }),
      makeSummary({ overallAccuracy: 0.9, totalDecisions: 10 }),
      makeSummary({ overallAccuracy: 0.9, totalDecisions: 10 }),
    ];
    const newMs = checkMilestones(makeTimeline(), sessions, []);
    expect(newMs.find(m => m.type === 'consistency')).toBeUndefined();
  });
});

// ============================================================
// De-duplication
// ============================================================

describe('milestone de-duplication', () => {
  it('does NOT re-award already-unlocked milestones', () => {
    const sessions = [makeSummary({ totalDecisions: 200, correctDecisions: 160, bestStreak: 15 })];
    const existing = [makeMilestone('accuracy_50'), makeMilestone('streak_10'), makeMilestone('hands_100')];
    const newMs = checkMilestones(makeTimeline(), sessions, existing);

    expect(newMs.find(m => m.type === 'accuracy_50')).toBeUndefined();
    expect(newMs.find(m => m.type === 'streak_10')).toBeUndefined();
    expect(newMs.find(m => m.type === 'hands_100')).toBeUndefined();
  });

  it('awards new milestones while skipping existing ones', () => {
    const sessions = [makeSummary({ totalDecisions: 200, correctDecisions: 160, bestStreak: 15 })];
    const existing = [makeMilestone('accuracy_50')];
    const newMs = checkMilestones(makeTimeline(), sessions, existing);

    // accuracy_75 should be new (80% accuracy)
    expect(newMs.find(m => m.type === 'accuracy_75')).toBeDefined();
    // accuracy_50 should not be re-awarded
    expect(newMs.find(m => m.type === 'accuracy_50')).toBeUndefined();
  });
});

// ============================================================
// Empty data
// ============================================================

describe('edge cases', () => {
  it('returns empty array for empty sessions and timeline', () => {
    const newMs = checkMilestones(makeTimeline(), [], []);
    expect(newMs).toHaveLength(0);
  });
});

// ============================================================
// getAllMilestoneStates
// ============================================================

describe('getAllMilestoneStates', () => {
  it('returns all milestone definitions', () => {
    const states = getAllMilestoneStates([]);
    expect(states).toHaveLength(MILESTONE_DEFINITIONS.length);
  });

  it('marks unlocked milestones with unlockedAt', () => {
    const existing = [makeMilestone('accuracy_50', 12345)];
    const states = getAllMilestoneStates(existing);
    const found = states.find(m => m.type === 'accuracy_50')!;
    expect(found.unlockedAt).toBe(12345);
  });

  it('marks locked milestones with null unlockedAt', () => {
    const states = getAllMilestoneStates([]);
    for (const m of states) {
      expect(m.unlockedAt).toBeNull();
    }
  });
});
