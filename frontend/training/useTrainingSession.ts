// useTrainingSession — React hook wrapping the pure training session logic.
// Primary API for game screens to integrate training.

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TrainingSessionState,
  TrainingSessionSummary,
  TrainingDecision,
  GameAdapter,
} from './types';
import { createSession, recordDecision, endSession } from './TrainingSession';
import { computeSummary } from './analytics';
import { createProgressSnapshot } from './progress';
import { trainingStore } from './storage';
import { syncSessionToBackend } from './sync';

export interface UseTrainingSessionReturn<TGameState, TAction> {
  /** Whether a session is currently active */
  isActive: boolean;
  /** Current session summary (recomputed on each decision) */
  summary: TrainingSessionSummary | null;
  /** The most recent decision made */
  lastDecision: TrainingDecision | null;
  /** Current streak of correct decisions */
  currentStreak: number;
  /** Best streak in this session */
  bestStreak: number;
  /** Total incorrect decisions (backward compat with useTrainer.mistakes) */
  totalMistakes: number;

  /** Evaluate a user action against the optimal strategy. Returns the decision. */
  evaluate(gameState: TGameState, userAction: TAction): TrainingDecision | null;
  /** Start a new training session */
  start(): void;
  /** End the current session, persist to storage, sync to backend */
  end(authToken?: string): Promise<TrainingSessionSummary | null>;
  /** Reset round-level tracking (called between rounds) */
  resetRound(): void;
  /** Decisions made in the current round only */
  roundDecisions: TrainingDecision[];
}

export function useTrainingSession<TGameState, TAction>(
  adapter: GameAdapter<TGameState, TAction>,
  enabled: boolean = true,
): UseTrainingSessionReturn<TGameState, TAction> {
  const [session, setSession] = useState<TrainingSessionState | null>(null);
  const [lastDecision, setLastDecision] = useState<TrainingDecision | null>(null);
  const [roundDecisions, setRoundDecisions] = useState<TrainingDecision[]>([]);
  const sessionRef = useRef<TrainingSessionState | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const start = useCallback(() => {
    if (!enabled) return;
    const newSession = createSession(adapter.gameType);
    setSession(newSession);
    setLastDecision(null);
    setRoundDecisions([]);
  }, [enabled, adapter.gameType]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (enabled && !session) {
      start();
    }
  }, [enabled]);

  const evaluate = useCallback(
    (gameState: TGameState, userAction: TAction): TrainingDecision | null => {
      if (!enabled || !sessionRef.current) return null;

      const result = recordDecision(sessionRef.current, adapter, gameState, userAction);
      if (result.decision) {
        setSession(result.session);
        sessionRef.current = result.session;
        setLastDecision(result.decision);
        setRoundDecisions(prev => [...prev, result.decision!]);
      }
      return result.decision;
    },
    [enabled, adapter],
  );

  const end = useCallback(
    async (authToken?: string): Promise<TrainingSessionSummary | null> => {
      if (!sessionRef.current) return null;

      const ended = endSession(sessionRef.current);
      setSession(ended);
      sessionRef.current = ended;

      const summary = computeSummary(ended);

      // Persist locally
      try {
        await trainingStore.saveSession(ended);
        const snapshot = createProgressSnapshot(summary);
        await trainingStore.saveProgressSnapshot(snapshot, ended.gameType);
      } catch (err) {
        console.warn('Failed to persist training session:', err);
      }

      // Sync to backend (best-effort)
      if (authToken) {
        syncSessionToBackend(ended, authToken).catch(() => {});
      }

      return summary;
    },
    [],
  );

  const resetRound = useCallback(() => {
    setLastDecision(null);
    setRoundDecisions([]);
  }, []);

  const summary = session ? computeSummary(session) : null;

  return {
    isActive: !!session && !session.endedAt,
    summary,
    lastDecision,
    currentStreak: session?.currentStreak ?? 0,
    bestStreak: session?.bestStreak ?? 0,
    totalMistakes: summary
      ? summary.totalDecisions - summary.correctDecisions
      : 0,
    evaluate,
    start,
    end,
    resetRound,
    roundDecisions,
  };
}
