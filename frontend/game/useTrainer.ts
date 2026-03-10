// useTrainer — Backward-compatible hook that delegates to the training framework.
// Maintains the same external API so blackjack-game.tsx changes are minimal.

import { useState, useEffect, useMemo } from 'react';
import { GameState, canSplit, canDouble, canSurrender } from './engine';
import { getBestPlay, BestPlay, getDetailedPlay } from './strategy';
import { useTrainingSession, UseTrainingSessionReturn } from '../training/useTrainingSession';
import { blackjackAdapter, BlackjackAction } from '../training/adapters/BlackjackAdapter';
import { TrainingDecision } from '../training/types';

export type TrainerState = {
  bestPlay: BestPlay | null;
  mistakes: number;
  lastAction: string | null;
  checkAction: (action: string) => void;
  resetRound: () => void;
  /** NEW: Access the full training session for enhanced UI */
  training: UseTrainingSessionReturn<GameState, BlackjackAction>;
};

export function useTrainer(gameState: GameState, enabled: boolean = true): TrainerState {
  const training = useTrainingSession(blackjackAdapter, enabled);
  const [bestPlay, setBestPlay] = useState<BestPlay | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Compute best play when it's player's turn (same logic as before)
  useEffect(() => {
    if (!enabled) {
      setBestPlay(null);
      return;
    }

    if (gameState.phase === 'player_turn' && gameState.playerHands.length > 0) {
      const hand = gameState.playerHands[gameState.activeHandIndex];
      if (hand && hand.status === 'active' && gameState.dealerHand.length > 0) {
        const dealerUpCard = gameState.dealerHand[0];
        const play = getBestPlay(
          hand.cards,
          dealerUpCard,
          canSplit(hand, gameState.playerHands, gameState.config),
          canDouble(hand),
          canSurrender(hand),
        );
        setBestPlay(play);
      } else {
        setBestPlay(null);
      }
    } else {
      setBestPlay(null);
    }
  }, [gameState.phase, gameState.activeHandIndex, gameState.playerHands, enabled]);

  const checkAction = (action: string) => {
    if (!enabled) return;

    // Record the decision through the training framework
    const decision = training.evaluate(gameState, action as BlackjackAction);

    // Update lastAction for the mistake flash UI
    if (decision && !decision.isCorrect) {
      setLastAction(decision.optimalAction);
    } else {
      setLastAction(null);
    }
  };

  const resetRound = () => {
    setLastAction(null);
    setBestPlay(null);
    training.resetRound();
  };

  return {
    bestPlay,
    mistakes: training.totalMistakes,
    lastAction,
    checkAction,
    resetRound,
    training,
  };
}
