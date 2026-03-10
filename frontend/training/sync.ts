// Training Sync — Backend sync utility
// Best-effort, non-blocking sync of training data to the backend.

import axios from 'axios';
import { API_URL } from '../config';
import { TrainingSessionState } from './types';

/**
 * Sync a completed training session to the backend.
 * Sends decision data to the /stats endpoint as an enhanced stats payload.
 * Best-effort: failures are logged but don't interrupt the app.
 */
export async function syncSessionToBackend(
  session: TrainingSessionState,
  authToken: string,
): Promise<void> {
  if (!authToken || session.decisions.length === 0) return;

  const decisionPayload = session.decisions.map(d => ({
    category: d.category,
    scenarioKey: d.scenarioKey,
    userAction: d.userAction,
    optimalAction: d.optimalAction,
    isCorrect: d.isCorrect,
    timestamp: d.timestamp,
  }));

  const correctCount = session.decisions.filter(d => d.isCorrect).length;

  try {
    await axios.post(
      `${API_URL}/stats`,
      {
        result: 'training_session',
        mistakes: session.decisions.length - correctCount,
        training_decisions: decisionPayload,
        details: {
          sessionId: session.sessionId,
          gameType: session.gameType,
          totalDecisions: session.decisions.length,
          correctDecisions: correctCount,
          accuracy: session.decisions.length > 0 ? correctCount / session.decisions.length : 0,
          bestStreak: session.bestStreak,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        },
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
  } catch (err) {
    // Stats sync is best-effort — don't interrupt gameplay
    console.warn('Failed to sync training session:', err);
  }
}
