// Blackjack Training Adapter
// Implements GameAdapter for the blackjack game engine.

import { GameAdapter, DecisionCategory } from '../types';
import {
  GameState,
  canSplit,
  canDouble,
  canSurrender,
  scoreHand,
  cardValue,
  formatCardShort,
} from '../../game/engine';
import { getDetailedPlay, getInsurancePlay } from '../../game/strategy';

export type BlackjackAction =
  | 'hit'
  | 'stand'
  | 'double'
  | 'split'
  | 'surrender'
  | 'insurance_yes'
  | 'insurance_no';

let roundCounter = 0;

export function resetRoundCounter(): void {
  roundCounter = 0;
}

export function incrementRoundCounter(): number {
  return ++roundCounter;
}

export function getCurrentRoundId(): number {
  return roundCounter;
}

export const blackjackAdapter: GameAdapter<GameState, BlackjackAction> = {
  gameType: 'blackjack',

  isDecisionPoint(gameState: GameState): boolean {
    if (gameState.phase === 'insurance') return true;
    if (gameState.phase === 'player_turn') {
      const hand = gameState.playerHands[gameState.activeHandIndex];
      return hand?.status === 'active';
    }
    return false;
  },

  getOptimalAction(gameState: GameState) {
    // Insurance decision
    if (gameState.phase === 'insurance') {
      const play = getInsurancePlay();
      return {
        action: 'insurance_no' as BlackjackAction,
        category: play.category as DecisionCategory,
        scenarioKey: play.scenarioKey,
        scenarioDescription: play.scenarioDescription,
        explanation: play.explanation,
        context: {
          dealerUpCard: formatCardShort(gameState.dealerHand[0]),
          phase: 'insurance',
          roundId: roundCounter,
        },
      };
    }

    // Player turn decision
    if (gameState.phase === 'player_turn') {
      const hand = gameState.playerHands[gameState.activeHandIndex];
      if (!hand || hand.status !== 'active') return null;

      const dealerUpCard = gameState.dealerHand[0];
      if (!dealerUpCard) return null;

      const play = getDetailedPlay(
        hand.cards,
        dealerUpCard,
        canSplit(hand, gameState.playerHands, gameState.config),
        canDouble(hand),
        canSurrender(hand),
      );

      const { total, soft } = scoreHand(hand.cards);

      return {
        action: play.action as BlackjackAction,
        category: play.category as DecisionCategory,
        scenarioKey: play.scenarioKey,
        scenarioDescription: play.scenarioDescription,
        explanation: play.explanation,
        context: {
          playerCards: hand.cards.map(formatCardShort),
          dealerUpCard: formatCardShort(dealerUpCard),
          handTotal: total,
          isSoft: soft,
          handIndex: gameState.activeHandIndex,
          roundId: roundCounter,
        },
      };
    }

    return null;
  },

  normalizeAction(action: BlackjackAction): string {
    return action;
  },
};
