// useProgress — React hook for loading cross-session progress data.
// Loads timeline, milestones, and computes dashboard data from storage.

import { useState, useCallback, useEffect } from 'react';
import {
  ProgressDashboardData,
  ProgressTimeline,
  Milestone,
  TrainingSessionSummary,
} from './types';
import { computeProgressDashboard } from './progress';
import { checkMilestones } from './milestones';
import { trainingStore } from './storage';

export interface UseProgressReturn {
  /** Whether data is still loading from storage */
  loading: boolean;
  /** Full progress dashboard data (null if loading or no data) */
  dashboard: ProgressDashboardData | null;
  /** All milestones (including recently unlocked ones) */
  allMilestones: Milestone[];
  /** Milestones unlocked during the most recent refresh */
  newMilestones: Milestone[];
  /** Reload progress data from storage and check for new milestones */
  refresh(): Promise<void>;
}

export function useProgress(gameType: string): UseProgressReturn {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ProgressDashboardData | null>(null);
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [newMilestones, setNewMilestones] = useState<Milestone[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      // Load data from storage
      const [timeline, existingMilestones, allSessions] = await Promise.all([
        trainingStore.getProgressTimeline(gameType),
        trainingStore.getMilestones(),
        trainingStore.listSessions(gameType, 100),
      ]);

      // Check for new milestones
      const freshMilestones = checkMilestones(timeline, allSessions, existingMilestones);
      if (freshMilestones.length > 0) {
        await trainingStore.saveMilestones(freshMilestones);
      }
      setNewMilestones(freshMilestones);

      const combined = [...existingMilestones, ...freshMilestones];
      setAllMilestones(combined);

      // Compute dashboard
      const dashboardData = computeProgressDashboard(timeline, combined);
      setDashboard(dashboardData);
    } catch (err) {
      console.warn('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  }, [gameType]);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [gameType]);

  return {
    loading,
    dashboard,
    allMilestones,
    newMilestones,
    refresh,
  };
}
