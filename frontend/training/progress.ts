// Progress Engine — Cross-session progress computation
// Pure TypeScript. No React, no storage I/O.

import {
  ProgressSnapshot,
  ProgressTimeline,
  ProgressDashboardData,
  WeaknessEvolution,
  MoneyMetrics,
  TrainingSessionSummary,
  Milestone,
  DecisionCategory,
} from './types';

// ============================================================
// Constants for money metrics
// ============================================================

/** Average EV cost per mistake as fraction of bet (approximate for basic strategy). */
const AVG_EV_COST_PER_MISTAKE = 0.04;
/** Assumed hands per hour at a typical blackjack table. */
const HANDS_PER_HOUR = 60;
/** Baseline accuracy of a random/untrained player (approximately 60%). */
const BASELINE_ACCURACY = 0.60;

// ============================================================
// Snapshot Creation
// ============================================================

/** Create a progress snapshot from a completed session summary. */
export function createProgressSnapshot(
  summary: TrainingSessionSummary,
): ProgressSnapshot {
  const categoryAccuracies: Record<DecisionCategory, number> = {};
  for (const cs of summary.categoryStats) {
    categoryAccuracies[cs.category] = cs.accuracy;
  }

  return {
    timestamp: summary.endedAt ?? Date.now(),
    sessionId: summary.sessionId,
    overallAccuracy: summary.overallAccuracy,
    categoryAccuracies,
    totalDecisions: summary.totalDecisions,
    totalCorrect: summary.correctDecisions,
  };
}

// ============================================================
// Dashboard Computation
// ============================================================

/** Compute the full progress dashboard from timeline data and milestones. */
export function computeProgressDashboard(
  timeline: ProgressTimeline,
  milestones: Milestone[],
  avgBet: number = 25,
): ProgressDashboardData {
  const weaknessEvolutions = computeWeaknessEvolutions(timeline);
  const moneyMetrics = computeMoneyMetrics(timeline, avgBet);
  const handsToMastery = estimateHandsToMastery(timeline);

  return {
    timeline,
    milestones,
    weaknessEvolutions,
    moneyMetrics,
    handsToMastery,
  };
}

// ============================================================
// Weakness Evolution
// ============================================================

/** Compute how each decision category's accuracy evolves over sessions. */
export function computeWeaknessEvolutions(
  timeline: ProgressTimeline,
): WeaknessEvolution[] {
  if (timeline.snapshots.length === 0) return [];

  // Collect all categories across all snapshots
  const categories = new Set<DecisionCategory>();
  for (const snap of timeline.snapshots) {
    for (const cat of Object.keys(snap.categoryAccuracies)) {
      categories.add(cat);
    }
  }

  const evolutions: WeaknessEvolution[] = [];

  for (const category of categories) {
    const dataPoints: WeaknessEvolution['dataPoints'] = [];

    for (const snap of timeline.snapshots) {
      const accuracy = snap.categoryAccuracies[category];
      if (accuracy !== undefined) {
        dataPoints.push({
          timestamp: snap.timestamp,
          accuracy,
          sampleSize: snap.totalDecisions, // total for session, not per-category
        });
      }
    }

    if (dataPoints.length === 0) continue;

    const trend = computeTrend(dataPoints.map(dp => dp.accuracy));
    evolutions.push({ category, dataPoints, trend });
  }

  return evolutions;
}

/** Determine if a series of accuracy values is improving, declining, or stable. */
export function computeTrend(
  values: number[],
): 'improving' | 'declining' | 'stable' {
  if (values.length < 2) return 'stable';

  // Compare average of last half vs first half
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;
  if (diff > 0.05) return 'improving';
  if (diff < -0.05) return 'declining';
  return 'stable';
}

// ============================================================
// Money Metrics
// ============================================================

/** Compute money-related performance metrics from progress timeline. */
export function computeMoneyMetrics(
  timeline: ProgressTimeline,
  avgBet: number = 25,
): MoneyMetrics {
  if (timeline.snapshots.length === 0) {
    return {
      estimatedSavingsPerHour: 0,
      totalHandsOptimal: 0,
      expectedValueImprovement: 0,
    };
  }

  // Aggregate accuracy across all snapshots
  const totalDecisions = timeline.snapshots.reduce((sum, s) => sum + s.totalDecisions, 0);
  const totalCorrect = timeline.snapshots.reduce((sum, s) => sum + s.totalCorrect, 0);
  const lifetimeAccuracy = totalDecisions > 0 ? totalCorrect / totalDecisions : 0;

  // EV improvement = reduction in mistake rate × cost per mistake
  const accuracyGain = Math.max(0, lifetimeAccuracy - BASELINE_ACCURACY);
  const expectedValueImprovement = accuracyGain * AVG_EV_COST_PER_MISTAKE;

  // Savings per hour = improvement fraction × avg bet × hands per hour
  const estimatedSavingsPerHour = expectedValueImprovement * avgBet * HANDS_PER_HOUR;

  return {
    estimatedSavingsPerHour: Math.round(estimatedSavingsPerHour * 100) / 100,
    totalHandsOptimal: totalCorrect,
    expectedValueImprovement: Math.round(expectedValueImprovement * 10000) / 10000,
  };
}

// ============================================================
// Hands to Mastery
// ============================================================

/**
 * Estimate how many more hands until the user reaches 95%+ accuracy,
 * using linear regression on their accuracy trend.
 * Returns null if already at 95%+, insufficient data, or not improving.
 */
export function estimateHandsToMastery(
  timeline: ProgressTimeline,
): number | null {
  const snapshots = timeline.snapshots;
  if (snapshots.length < 2) return null;

  // Check if already at mastery
  const latest = snapshots[snapshots.length - 1];
  if (latest.overallAccuracy >= 0.95) return null;

  // Use cumulative decisions as x-axis, accuracy as y-axis
  const points: Array<{ x: number; y: number }> = [];
  let cumulativeDecisions = 0;
  for (const snap of snapshots) {
    cumulativeDecisions += snap.totalDecisions;
    points.push({ x: cumulativeDecisions, y: snap.overallAccuracy });
  }

  // Simple linear regression: y = mx + b
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Not improving — can't estimate
  if (slope <= 0) return null;

  // Solve for x when y = 0.95: x = (0.95 - b) / m
  const targetX = (0.95 - intercept) / slope;
  const remainingHands = Math.ceil(targetX - cumulativeDecisions);

  // Sanity check — cap at reasonable number
  if (remainingHands <= 0) return null;
  if (remainingHands > 100000) return 100000;

  return remainingHands;
}
