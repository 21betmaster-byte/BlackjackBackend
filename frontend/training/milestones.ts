// Milestones — Achievement system for training progress
// Pure TypeScript. Checks conditions against session/progress data.

import {
  Milestone,
  MilestoneType,
  ProgressTimeline,
  TrainingSessionSummary,
} from './types';

// ============================================================
// Milestone Definitions
// ============================================================

interface MilestoneDefinition {
  type: MilestoneType;
  name: string;
  description: string;
  icon: string;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // Accuracy gates
  { type: 'accuracy_50', name: 'Getting Started', description: 'Reach 50% overall accuracy', icon: 'trending-up' },
  { type: 'accuracy_75', name: 'Solid Player', description: 'Reach 75% overall accuracy', icon: 'star-half' },
  { type: 'accuracy_90', name: 'Sharp Mind', description: 'Reach 90% overall accuracy', icon: 'star' },
  { type: 'accuracy_95', name: 'Near Perfect', description: 'Reach 95% overall accuracy', icon: 'military-tech' },

  // Streak achievements
  { type: 'streak_10', name: 'On a Roll', description: '10 correct decisions in a row', icon: 'local-fire-department' },
  { type: 'streak_25', name: 'Hot Streak', description: '25 correct decisions in a row', icon: 'whatshot' },
  { type: 'streak_50', name: 'Unstoppable', description: '50 correct decisions in a row', icon: 'bolt' },
  { type: 'streak_100', name: 'Machine', description: '100 correct decisions in a row', icon: 'diamond' },

  // Volume badges
  { type: 'hands_100', name: 'Centurion', description: 'Make 100 training decisions', icon: 'fitness-center' },
  { type: 'hands_500', name: 'Dedicated', description: 'Make 500 training decisions', icon: 'emoji-events' },
  { type: 'hands_1000', name: 'Veteran', description: 'Make 1,000 training decisions', icon: 'workspace-premium' },

  // Special
  { type: 'first_perfect_round', name: 'Flawless Round', description: 'Complete a round with zero mistakes', icon: 'check-circle' },
  { type: 'zero_mistakes_session', name: 'Perfect Session', description: 'Complete a session (10+ rounds) with zero mistakes', icon: 'verified' },
  { type: 'category_mastered', name: 'Category Master', description: 'Reach 95%+ accuracy in any category (20+ decisions)', icon: 'school' },
  { type: 'comeback', name: 'Comeback Kid', description: 'Improve from below 50% to above 80% accuracy', icon: 'rocket-launch' },
  { type: 'consistency', name: 'Consistent', description: '5 consecutive sessions above 85% accuracy', icon: 'verified-user' },
];

// ============================================================
// Milestone Checker
// ============================================================

/**
 * Check for newly unlocked milestones.
 * Returns only milestones that are newly earned (not in existingMilestones).
 */
export function checkMilestones(
  timeline: ProgressTimeline,
  allSessions: TrainingSessionSummary[],
  existingMilestones: Milestone[],
): Milestone[] {
  const existingTypes = new Set(
    existingMilestones
      .filter(m => m.unlockedAt !== null)
      .map(m => m.type),
  );

  const newMilestones: Milestone[] = [];
  const now = Date.now();

  for (const def of MILESTONE_DEFINITIONS) {
    if (existingTypes.has(def.type)) continue;

    const result = checkSingleMilestone(def.type, timeline, allSessions);
    if (result.earned) {
      newMilestones.push({
        id: `milestone_${def.type}${result.detail ? '_' + result.detail.replace(/\s+/g, '_') : ''}`,
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
        unlockedAt: now,
        detail: result.detail,
      });
    }
  }

  return newMilestones;
}

interface MilestoneCheckResult {
  earned: boolean;
  detail?: string;
}

function checkSingleMilestone(
  type: MilestoneType,
  timeline: ProgressTimeline,
  allSessions: TrainingSessionSummary[],
): MilestoneCheckResult {
  const snapshots = timeline.snapshots;
  if (snapshots.length === 0 && allSessions.length === 0) {
    return { earned: false };
  }

  switch (type) {
    // Accuracy gates — check latest snapshot
    case 'accuracy_50':
    case 'accuracy_75':
    case 'accuracy_90':
    case 'accuracy_95': {
      const threshold = parseAccuracyThreshold(type);
      // Check lifetime accuracy across all sessions
      const totalDecisions = allSessions.reduce((s, ses) => s + ses.totalDecisions, 0);
      const totalCorrect = allSessions.reduce((s, ses) => s + ses.correctDecisions, 0);
      const lifetimeAccuracy = totalDecisions > 0 ? totalCorrect / totalDecisions : 0;
      return { earned: lifetimeAccuracy >= threshold && totalDecisions >= 10 };
    }

    // Streak achievements — check best streak across sessions
    case 'streak_10':
    case 'streak_25':
    case 'streak_50':
    case 'streak_100': {
      const threshold = parseStreakThreshold(type);
      const bestStreak = Math.max(0, ...allSessions.map(s => s.bestStreak));
      return { earned: bestStreak >= threshold };
    }

    // Volume badges — total decisions
    case 'hands_100':
    case 'hands_500':
    case 'hands_1000': {
      const threshold = parseHandsThreshold(type);
      const totalDecisions = allSessions.reduce((s, ses) => s + ses.totalDecisions, 0);
      return { earned: totalDecisions >= threshold };
    }

    // First perfect round — any session has a round with all correct decisions
    case 'first_perfect_round': {
      // We check if any session has overallAccuracy === 1.0 with at least 1 decision,
      // or if currentStreak >= totalDecisions in a round
      // Simplification: check if any session's bestStreak >= some minimum
      // indicating at least one round was played perfectly
      for (const ses of allSessions) {
        if (ses.totalDecisions > 0 && ses.overallAccuracy === 1.0) {
          return { earned: true };
        }
        // Check if bestStreak covers at least one round (~2-4 decisions)
        if (ses.bestStreak >= 2 && ses.totalDecisions > 0) {
          // Check category stats — if every category has 100% accuracy in at least one scenario
          const hasAllCorrect = ses.categoryStats.every(
            cs => cs.total === 0 || cs.accuracy === 1.0,
          );
          if (hasAllCorrect && ses.totalDecisions >= 2) {
            return { earned: true };
          }
        }
      }
      return { earned: false };
    }

    // Zero mistakes session — full session (10+ rounds) with zero mistakes
    case 'zero_mistakes_session': {
      for (const ses of allSessions) {
        if (ses.roundsPlayed >= 10 && ses.totalDecisions > 0 && ses.overallAccuracy === 1.0) {
          return { earned: true };
        }
      }
      return { earned: false };
    }

    // Category mastered — any category at 95%+ with 20+ decisions
    case 'category_mastered': {
      for (const ses of allSessions) {
        for (const cs of ses.categoryStats) {
          if (cs.total >= 20 && cs.accuracy >= 0.95) {
            return { earned: true, detail: cs.category };
          }
        }
      }
      // Also check merged stats across all sessions
      const merged = mergeAllCategoryStats(allSessions);
      for (const [category, stats] of merged.entries()) {
        if (stats.total >= 20 && stats.correct / stats.total >= 0.95) {
          return { earned: true, detail: category };
        }
      }
      return { earned: false };
    }

    // Comeback — went from <50% to >80%
    case 'comeback': {
      if (snapshots.length < 2) return { earned: false };
      let hadBelow50 = false;
      for (const snap of snapshots) {
        if (snap.overallAccuracy < 0.5 && snap.totalDecisions >= 5) {
          hadBelow50 = true;
        }
        if (hadBelow50 && snap.overallAccuracy > 0.8 && snap.totalDecisions >= 5) {
          return { earned: true };
        }
      }
      return { earned: false };
    }

    // Consistency — 5 consecutive sessions above 85%
    case 'consistency': {
      if (allSessions.length < 5) return { earned: false };
      let consecutive = 0;
      for (const ses of allSessions) {
        if (ses.overallAccuracy >= 0.85 && ses.totalDecisions >= 5) {
          consecutive++;
          if (consecutive >= 5) return { earned: true };
        } else {
          consecutive = 0;
        }
      }
      return { earned: false };
    }

    default:
      return { earned: false };
  }
}

function parseAccuracyThreshold(type: MilestoneType): number {
  const map: Record<string, number> = {
    accuracy_50: 0.5,
    accuracy_75: 0.75,
    accuracy_90: 0.9,
    accuracy_95: 0.95,
  };
  return map[type] ?? 0;
}

function parseStreakThreshold(type: MilestoneType): number {
  const map: Record<string, number> = {
    streak_10: 10,
    streak_25: 25,
    streak_50: 50,
    streak_100: 100,
  };
  return map[type] ?? 0;
}

function parseHandsThreshold(type: MilestoneType): number {
  const map: Record<string, number> = {
    hands_100: 100,
    hands_500: 500,
    hands_1000: 1000,
  };
  return map[type] ?? 0;
}

function mergeAllCategoryStats(
  sessions: TrainingSessionSummary[],
): Map<string, { total: number; correct: number }> {
  const merged = new Map<string, { total: number; correct: number }>();
  for (const ses of sessions) {
    for (const cs of ses.categoryStats) {
      const existing = merged.get(cs.category) ?? { total: 0, correct: 0 };
      existing.total += cs.total;
      existing.correct += cs.correct;
      merged.set(cs.category, existing);
    }
  }
  return merged;
}

/**
 * Get all milestone definitions with their current locked/unlocked state.
 * Useful for UI rendering of the full milestone grid.
 */
export function getAllMilestoneStates(
  existingMilestones: Milestone[],
): Milestone[] {
  const unlockedMap = new Map<MilestoneType, Milestone>();
  for (const m of existingMilestones) {
    if (m.unlockedAt !== null) {
      unlockedMap.set(m.type, m);
    }
  }

  return MILESTONE_DEFINITIONS.map(def => {
    const unlocked = unlockedMap.get(def.type);
    if (unlocked) return unlocked;
    return {
      id: `milestone_${def.type}`,
      type: def.type,
      name: def.name,
      description: def.description,
      icon: def.icon,
      unlockedAt: null,
    };
  });
}
