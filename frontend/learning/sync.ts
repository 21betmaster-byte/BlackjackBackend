// Learning Sync — Backend sync utility
// Best-effort, non-blocking sync of learning progress to the backend.

import axios from 'axios';
import { API_URL } from '../config';
import { LearningProgress } from './types';

/**
 * Sync learning progress to the backend.
 * Best-effort: failures are logged but don't interrupt the app.
 */
export async function syncLearningProgress(
  progress: LearningProgress,
  authToken: string,
): Promise<void> {
  if (!authToken) return;

  try {
    await axios.put(
      `${API_URL}/learning/progress`,
      {
        game_type: progress.gameType,
        skill_level: progress.skillLevel,
        completed_card_ids: progress.completedCardIds,
        quiz_results: progress.quizResults,
        completed: progress.completed,
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
  } catch (err) {
    console.warn('Failed to sync learning progress:', err);
  }
}

/**
 * Load learning progress from the backend.
 * Returns null if no progress exists or on failure.
 */
export async function fetchLearningProgress(
  gameType: string,
  authToken: string,
): Promise<LearningProgress | null> {
  if (!authToken) return null;

  try {
    const resp = await axios.get(
      `${API_URL}/learning/progress`,
      {
        params: { game_type: gameType },
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    const data = resp.data;
    if (!data) return null;

    return {
      gameType: data.game_type,
      skillLevel: data.skill_level,
      completedCardIds: data.completed_card_ids ?? [],
      quizResults: data.quiz_results ?? {},
      completed: data.completed ?? false,
      startedAt: data.started_at ? new Date(data.started_at).getTime() : Date.now(),
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
    };
  } catch (err) {
    console.warn('Failed to fetch learning progress:', err);
    return null;
  }
}
