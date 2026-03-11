// Learning Storage — AsyncStorage persistence for learning progress.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LearningProgress } from './types';

const PREFIX = 'betmaster21_learn_';
const PROGRESS_KEY = (gameType: string) => `${PREFIX}progress_${gameType}`;
const GUIDE_SEEN_KEY = `${PREFIX}guide_seen`;

export async function saveLearningProgress(progress: LearningProgress): Promise<void> {
  await AsyncStorage.setItem(PROGRESS_KEY(progress.gameType), JSON.stringify(progress));
}

export async function loadLearningProgress(gameType: string): Promise<LearningProgress | null> {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY(gameType));
  return raw ? JSON.parse(raw) : null;
}

export async function clearLearningProgress(gameType: string): Promise<void> {
  await AsyncStorage.removeItem(PROGRESS_KEY(gameType));
}

export async function hasSeenGuide(): Promise<boolean> {
  const val = await AsyncStorage.getItem(GUIDE_SEEN_KEY);
  return val === 'true';
}

export async function markGuideSeen(): Promise<void> {
  await AsyncStorage.setItem(GUIDE_SEEN_KEY, 'true');
}
