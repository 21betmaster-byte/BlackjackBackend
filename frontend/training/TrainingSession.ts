// Training Session — Pure TypeScript State Machine
// No React dependencies. Immutable state updates.

import {
  TrainingDecision,
  TrainingSessionState,
  GameAdapter,
} from './types';

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `td_${Date.now()}_${idCounter}`;
}

/** Create a new training session for a given game type. */
export function createSession(gameType: string): TrainingSessionState {
  return {
    sessionId: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    gameType,
    startedAt: Date.now(),
    endedAt: null,
    decisions: [],
    currentStreak: 0,
    bestStreak: 0,
  };
}

/**
 * Record a player's decision against the optimal strategy.
 * Returns the updated session and the decision that was recorded (null if not a decision point).
 */
export function recordDecision<TGameState, TAction>(
  session: TrainingSessionState,
  adapter: GameAdapter<TGameState, TAction>,
  gameState: TGameState,
  userAction: TAction,
): { session: TrainingSessionState; decision: TrainingDecision | null } {
  const optimal = adapter.getOptimalAction(gameState);
  if (!optimal) {
    return { session, decision: null };
  }

  const normalizedUser = adapter.normalizeAction(userAction);
  const isCorrect = normalizedUser === (optimal.action as unknown as string);

  const decision: TrainingDecision = {
    id: generateId(),
    timestamp: Date.now(),
    category: optimal.category,
    scenarioKey: optimal.scenarioKey,
    scenarioDescription: optimal.scenarioDescription,
    userAction: normalizedUser,
    optimalAction: optimal.action as unknown as string,
    isCorrect,
    explanation: optimal.explanation,
    context: optimal.context,
  };

  const newStreak = isCorrect ? session.currentStreak + 1 : 0;
  const bestStreak = Math.max(session.bestStreak, newStreak);

  return {
    session: {
      ...session,
      decisions: [...session.decisions, decision],
      currentStreak: newStreak,
      bestStreak,
    },
    decision,
  };
}

/** Mark a session as ended. */
export function endSession(session: TrainingSessionState): TrainingSessionState {
  return {
    ...session,
    endedAt: Date.now(),
  };
}

/** Reset the internal ID counter (for testing). */
export function _resetIdCounter(): void {
  idCounter = 0;
}
