import {
  createSession,
  recordDecision,
  endSession,
  _resetIdCounter,
} from '../../training/TrainingSession';
import { GameAdapter, TrainingDecision } from '../../training/types';

// Simple mock adapter for testing
const mockAdapter: GameAdapter<{ shouldBeDecisionPoint: boolean; action: string }, string> = {
  gameType: 'test_game',

  isDecisionPoint(state) {
    return state.shouldBeDecisionPoint;
  },

  getOptimalAction(state) {
    if (!state.shouldBeDecisionPoint) return null;
    return {
      action: state.action,
      category: 'test_category',
      scenarioKey: 'test_scenario',
      scenarioDescription: 'Test Scenario',
      explanation: 'This is the optimal play',
      context: { roundId: 1 },
    };
  },

  normalizeAction(action: string) {
    return action;
  },
};

beforeEach(() => {
  _resetIdCounter();
});

describe('createSession', () => {
  it('creates a session with correct game type', () => {
    const session = createSession('blackjack');
    expect(session.gameType).toBe('blackjack');
  });

  it('has a unique session ID', () => {
    const s1 = createSession('blackjack');
    const s2 = createSession('blackjack');
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it('starts with empty decisions', () => {
    const session = createSession('test');
    expect(session.decisions).toHaveLength(0);
  });

  it('starts with zero streaks', () => {
    const session = createSession('test');
    expect(session.currentStreak).toBe(0);
    expect(session.bestStreak).toBe(0);
  });

  it('has startedAt timestamp', () => {
    const before = Date.now();
    const session = createSession('test');
    expect(session.startedAt).toBeGreaterThanOrEqual(before);
  });

  it('endedAt is null initially', () => {
    const session = createSession('test');
    expect(session.endedAt).toBeNull();
  });
});

describe('recordDecision', () => {
  it('records a correct decision', () => {
    const session = createSession('test');
    const gameState = { shouldBeDecisionPoint: true, action: 'hit' };
    const { session: updated, decision } = recordDecision(session, mockAdapter, gameState, 'hit');

    expect(decision).not.toBeNull();
    expect(decision!.isCorrect).toBe(true);
    expect(decision!.userAction).toBe('hit');
    expect(decision!.optimalAction).toBe('hit');
  });

  it('records an incorrect decision', () => {
    const session = createSession('test');
    const gameState = { shouldBeDecisionPoint: true, action: 'hit' };
    const { decision } = recordDecision(session, mockAdapter, gameState, 'stand');

    expect(decision!.isCorrect).toBe(false);
    expect(decision!.userAction).toBe('stand');
    expect(decision!.optimalAction).toBe('hit');
  });

  it('increments streak on correct decision', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };

    const r1 = recordDecision(session, mockAdapter, gs, 'hit');
    session = r1.session;
    expect(session.currentStreak).toBe(1);

    const r2 = recordDecision(session, mockAdapter, gs, 'hit');
    session = r2.session;
    expect(session.currentStreak).toBe(2);
  });

  it('resets streak on incorrect decision', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };

    // Build a streak
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    expect(session.currentStreak).toBe(2);

    // Break it
    session = recordDecision(session, mockAdapter, gs, 'stand').session;
    expect(session.currentStreak).toBe(0);
  });

  it('preserves bestStreak when current streak resets', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };

    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    expect(session.bestStreak).toBe(3);

    session = recordDecision(session, mockAdapter, gs, 'stand').session;
    expect(session.currentStreak).toBe(0);
    expect(session.bestStreak).toBe(3);
  });

  it('updates bestStreak when new streak exceeds it', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };

    // 2 correct
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    // break
    session = recordDecision(session, mockAdapter, gs, 'stand').session;
    expect(session.bestStreak).toBe(2);

    // 3 correct (new best)
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    expect(session.bestStreak).toBe(3);
  });

  it('accumulates decisions in array', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };

    session = recordDecision(session, mockAdapter, gs, 'hit').session;
    session = recordDecision(session, mockAdapter, gs, 'stand').session;
    session = recordDecision(session, mockAdapter, gs, 'hit').session;

    expect(session.decisions).toHaveLength(3);
    expect(session.decisions[0].isCorrect).toBe(true);
    expect(session.decisions[1].isCorrect).toBe(false);
    expect(session.decisions[2].isCorrect).toBe(true);
  });

  it('returns null decision for non-decision-point state', () => {
    const session = createSession('test');
    const gs = { shouldBeDecisionPoint: false, action: 'hit' };
    const { session: updated, decision } = recordDecision(session, mockAdapter, gs, 'hit');

    expect(decision).toBeNull();
    expect(updated.decisions).toHaveLength(0);
  });

  it('decision has correct metadata', () => {
    const session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };
    const { decision } = recordDecision(session, mockAdapter, gs, 'hit');

    expect(decision!.category).toBe('test_category');
    expect(decision!.scenarioKey).toBe('test_scenario');
    expect(decision!.scenarioDescription).toBe('Test Scenario');
    expect(decision!.explanation).toBe('This is the optimal play');
    expect(decision!.context).toEqual({ roundId: 1 });
  });

  it('decision has unique ID', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };

    const r1 = recordDecision(session, mockAdapter, gs, 'hit');
    session = r1.session;
    const r2 = recordDecision(session, mockAdapter, gs, 'hit');

    expect(r1.decision!.id).not.toBe(r2.decision!.id);
  });

  it('decision has timestamp', () => {
    const before = Date.now();
    const session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };
    const { decision } = recordDecision(session, mockAdapter, gs, 'hit');

    expect(decision!.timestamp).toBeGreaterThanOrEqual(before);
  });

  it('does not mutate original session', () => {
    const session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };
    const original = { ...session, decisions: [...session.decisions] };

    recordDecision(session, mockAdapter, gs, 'hit');

    expect(session.decisions).toEqual(original.decisions);
    expect(session.currentStreak).toBe(original.currentStreak);
  });
});

describe('endSession', () => {
  it('sets endedAt timestamp', () => {
    const session = createSession('test');
    const ended = endSession(session);
    expect(ended.endedAt).not.toBeNull();
    expect(ended.endedAt).toBeGreaterThan(0);
  });

  it('preserves all other session data', () => {
    let session = createSession('test');
    const gs = { shouldBeDecisionPoint: true, action: 'hit' };
    session = recordDecision(session, mockAdapter, gs, 'hit').session;

    const ended = endSession(session);
    expect(ended.sessionId).toBe(session.sessionId);
    expect(ended.gameType).toBe(session.gameType);
    expect(ended.decisions).toHaveLength(1);
    expect(ended.currentStreak).toBe(1);
  });

  it('does not mutate original session', () => {
    const session = createSession('test');
    endSession(session);
    expect(session.endedAt).toBeNull();
  });
});
