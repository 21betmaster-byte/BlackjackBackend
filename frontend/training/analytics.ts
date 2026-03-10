// Analytics — Pure computation functions for session summaries
// No side effects, no React, no storage.

import {
  TrainingSessionState,
  TrainingSessionSummary,
  CategoryStats,
  DecisionCategory,
} from './types';

/** Compute a summary from a training session's decisions. */
export function computeSummary(session: TrainingSessionState): TrainingSessionSummary {
  const { decisions } = session;
  const correct = decisions.filter(d => d.isCorrect).length;

  // Group by category
  const categoryMap = new Map<
    DecisionCategory,
    {
      total: number;
      correct: number;
      scenarios: Map<string, { total: number; correct: number }>;
    }
  >();

  for (const d of decisions) {
    let cat = categoryMap.get(d.category);
    if (!cat) {
      cat = { total: 0, correct: 0, scenarios: new Map() };
      categoryMap.set(d.category, cat);
    }
    cat.total++;
    if (d.isCorrect) cat.correct++;

    let sc = cat.scenarios.get(d.scenarioKey);
    if (!sc) {
      sc = { total: 0, correct: 0 };
      cat.scenarios.set(d.scenarioKey, sc);
    }
    sc.total++;
    if (d.isCorrect) sc.correct++;
  }

  const categoryStats: CategoryStats[] = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
      scenarioBreakdown: Object.fromEntries(data.scenarios),
    }),
  );

  // Weakest categories (sorted by accuracy ascending, top 3)
  const weakestCategories = [...categoryStats]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map(c => c.category);

  // Count rounds from context.roundId (if provided by adapter)
  const roundIds = new Set(
    decisions
      .map(d => d.context?.roundId as string | number | undefined)
      .filter(id => id !== undefined && id !== null),
  );

  return {
    sessionId: session.sessionId,
    gameType: session.gameType,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    roundsPlayed: roundIds.size,
    totalDecisions: decisions.length,
    correctDecisions: correct,
    overallAccuracy: decisions.length > 0 ? correct / decisions.length : 0,
    categoryStats,
    currentStreak: session.currentStreak,
    bestStreak: session.bestStreak,
    weakestCategories,
  };
}

/** Merge multiple session summaries into a single aggregate summary. */
export function mergeSummaries(
  summaries: TrainingSessionSummary[],
): TrainingSessionSummary | null {
  if (summaries.length === 0) return null;

  // Aggregate category stats across all summaries
  const categoryMap = new Map<
    DecisionCategory,
    {
      total: number;
      correct: number;
      scenarios: Map<string, { total: number; correct: number }>;
    }
  >();

  let totalDecisions = 0;
  let correctDecisions = 0;
  let totalRounds = 0;
  let bestStreak = 0;

  for (const s of summaries) {
    totalDecisions += s.totalDecisions;
    correctDecisions += s.correctDecisions;
    totalRounds += s.roundsPlayed;
    bestStreak = Math.max(bestStreak, s.bestStreak);

    for (const cs of s.categoryStats) {
      let cat = categoryMap.get(cs.category);
      if (!cat) {
        cat = { total: 0, correct: 0, scenarios: new Map() };
        categoryMap.set(cs.category, cat);
      }
      cat.total += cs.total;
      cat.correct += cs.correct;

      for (const [key, data] of Object.entries(cs.scenarioBreakdown)) {
        let sc = cat.scenarios.get(key);
        if (!sc) {
          sc = { total: 0, correct: 0 };
          cat.scenarios.set(key, sc);
        }
        sc.total += data.total;
        sc.correct += data.correct;
      }
    }
  }

  const categoryStats: CategoryStats[] = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
      scenarioBreakdown: Object.fromEntries(data.scenarios),
    }),
  );

  const weakestCategories = [...categoryStats]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map(c => c.category);

  const earliest = Math.min(...summaries.map(s => s.startedAt));
  const latest = Math.max(...summaries.map(s => s.endedAt ?? s.startedAt));

  return {
    sessionId: 'merged',
    gameType: summaries[0].gameType,
    startedAt: earliest,
    endedAt: latest,
    roundsPlayed: totalRounds,
    totalDecisions,
    correctDecisions,
    overallAccuracy: totalDecisions > 0 ? correctDecisions / totalDecisions : 0,
    categoryStats,
    currentStreak: 0, // Not meaningful for merged
    bestStreak,
    weakestCategories,
  };
}
