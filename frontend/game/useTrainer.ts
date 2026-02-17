import { useState, useEffect } from 'react';
import { GameState, canSplit, canDouble } from './engine';
import { getBestPlay, BestPlay } from './strategy';

export type TrainerState = {
  bestPlay: BestPlay | null;
  mistakes: number;
  lastAction: string | null;
  checkAction: (action: string) => void;
  resetRound: () => void;
};

export function useTrainer(gameState: GameState, enabled: boolean = true): TrainerState {
  const [bestPlay, setBestPlay] = useState<BestPlay | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Compute best play when it's player's turn
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
          canDouble(hand)
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
    if (bestPlay && action !== bestPlay.action) {
      setMistakes(m => m + 1);
      setLastAction(bestPlay.action);
    } else {
      setLastAction(null);
    }
  };

  const resetRound = () => {
    setMistakes(0);
    setLastAction(null);
    setBestPlay(null);
  };

  return { bestPlay, mistakes, lastAction, checkAction, resetRound };
}
