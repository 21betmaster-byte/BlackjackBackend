// Learning Registry — Central registry of LearningContentProviders.

import { LearningContentProvider } from './types';
import { blackjackLearningProvider } from './content/blackjack';

const providers = new Map<string, LearningContentProvider>();

export function registerProvider(provider: LearningContentProvider): void {
  providers.set(provider.gameType, provider);
}

export function getProvider(gameType: string): LearningContentProvider | null {
  return providers.get(gameType) ?? null;
}

export function getAvailableGames(): string[] {
  return Array.from(providers.keys());
}

// Auto-register built-in providers
registerProvider(blackjackLearningProvider);
