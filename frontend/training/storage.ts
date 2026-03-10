// Training Storage — AsyncStorage persistence layer
// Uses the same prefix pattern as the rest of the app (betmaster21_).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrainingStore,
  TrainingSessionState,
  TrainingSessionSummary,
  ProgressSnapshot,
  ProgressTimeline,
  Milestone,
} from './types';
import { computeSummary, mergeSummaries } from './analytics';

const PREFIX = 'betmaster21_training_';
const SESSION_KEY = (id: string) => `${PREFIX}session_${id}`;
const INDEX_KEY = (gameType: string) => `${PREFIX}index_${gameType}`;
const TIMELINE_KEY = (gameType: string) => `${PREFIX}timeline_${gameType}`;
const MILESTONES_KEY = `${PREFIX}milestones`;

export const trainingStore: TrainingStore = {
  async saveSession(session: TrainingSessionState): Promise<void> {
    // Save session data
    await AsyncStorage.setItem(SESSION_KEY(session.sessionId), JSON.stringify(session));

    // Update index
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY(session.gameType));
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    if (!index.includes(session.sessionId)) {
      index.push(session.sessionId);
    }
    await AsyncStorage.setItem(INDEX_KEY(session.gameType), JSON.stringify(index));
  },

  async loadSession(sessionId: string): Promise<TrainingSessionState | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY(sessionId));
    return raw ? JSON.parse(raw) : null;
  },

  async listSessions(gameType: string, limit: number = 20): Promise<TrainingSessionSummary[]> {
    const indexRaw = await AsyncStorage.getItem(INDEX_KEY(gameType));
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    const recent = index.slice(-limit);

    const summaries: TrainingSessionSummary[] = [];
    for (const id of recent) {
      const session = await this.loadSession(id);
      if (session) {
        summaries.push(computeSummary(session));
      }
    }
    return summaries.reverse(); // Most recent first
  },

  async getLifetimeStats(gameType: string): Promise<TrainingSessionSummary | null> {
    const allSummaries = await this.listSessions(gameType, 1000);
    return mergeSummaries(allSummaries);
  },

  async saveProgressSnapshot(snapshot: ProgressSnapshot, gameType: string): Promise<void> {
    const timeline = await this.getProgressTimeline(gameType);
    timeline.snapshots.push(snapshot);
    await AsyncStorage.setItem(TIMELINE_KEY(gameType), JSON.stringify(timeline));
  },

  async getProgressTimeline(gameType: string): Promise<ProgressTimeline> {
    const raw = await AsyncStorage.getItem(TIMELINE_KEY(gameType));
    if (raw) {
      return JSON.parse(raw);
    }
    return { gameType, snapshots: [] };
  },

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    const existing = await this.getMilestones();
    // Merge: keep existing, add new
    const existingMap = new Map(existing.map(m => [m.id, m]));
    for (const m of milestones) {
      existingMap.set(m.id, m);
    }
    await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(Array.from(existingMap.values())));
  },

  async getMilestones(): Promise<Milestone[]> {
    const raw = await AsyncStorage.getItem(MILESTONES_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async clearAll(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const trainingKeys = allKeys.filter(k => k.startsWith(PREFIX));
    if (trainingKeys.length > 0) {
      await AsyncStorage.multiRemove(trainingKeys);
    }
  },
};
