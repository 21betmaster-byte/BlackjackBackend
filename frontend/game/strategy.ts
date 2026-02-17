// Basic Strategy Advisor for Blackjack
// Charts based on standard 8-deck, dealer stands on soft 17

import { Card, cardValue, scoreHand, isPair, Rank } from './engine';

type Action = 'H' | 'S' | 'D' | 'P' | 'Ds';

function dealerKey(card: Card): string {
  if (card.rank === 'A') return 'A';
  return String(cardValue(card.rank));
}

const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'] as const;

// Hard totals strategy: key = player total, value = action per dealer upcard (2-10, A)
const HARD_STRATEGY: Record<number, Record<string, Action>> = {
  5:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  6:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  7:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  8:  { '2':'H','3':'H','4':'H','5':'H','6':'H','7':'H','8':'H','9':'H','10':'H','A':'H' },
  9:  { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  10: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  11: { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'D','A':'D' },
  12: { '2':'H','3':'H','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  13: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  14: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'H','A':'H' },
  17: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  18: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  19: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

// Soft totals strategy: key = player total (soft), value = action per dealer upcard
const SOFT_STRATEGY: Record<number, Record<string, Action>> = {
  13: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  14: { '2':'H','3':'H','4':'H','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  15: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  16: { '2':'H','3':'H','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  17: { '2':'H','3':'D','4':'D','5':'D','6':'D','7':'H','8':'H','9':'H','10':'H','A':'H' },
  18: { '2':'Ds','3':'Ds','4':'Ds','5':'Ds','6':'Ds','7':'S','8':'S','9':'H','10':'H','A':'H' },
  19: { '2':'S','3':'S','4':'S','5':'S','6':'Ds','7':'S','8':'S','9':'S','10':'S','A':'S' },
  20: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  21: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
};

// Pair splitting strategy: key = pair rank value, value = action per dealer upcard
// P = split, H = hit, S = stand, D = double
const PAIR_STRATEGY: Record<string, Record<string, Action>> = {
  'A': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
  '10': { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'S','8':'S','9':'S','10':'S','A':'S' },
  '9': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'S','8':'P','9':'P','10':'S','A':'S' },
  '8': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','A':'P' },
  '7': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
  '6': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '5': { '2':'D','3':'D','4':'D','5':'D','6':'D','7':'D','8':'D','9':'D','10':'H','A':'H' },
  '4': { '2':'H','3':'H','4':'H','5':'P','6':'P','7':'H','8':'H','9':'H','10':'H','A':'H' },
  '3': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
  '2': { '2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'H','9':'H','10':'H','A':'H' },
};

const ACTION_NAMES: Record<string, string> = {
  'H': 'hit',
  'S': 'stand',
  'D': 'double',
  'Ds': 'double',
  'P': 'split',
};

const ACTION_REASONS: Record<string, string> = {
  'H': 'Basic strategy says to hit',
  'S': 'Basic strategy says to stand',
  'D': 'Basic strategy says to double down',
  'Ds': 'Basic strategy says to double if allowed, otherwise stand',
  'P': 'Basic strategy says to split',
};

export type BestPlay = {
  action: 'hit' | 'stand' | 'double' | 'split';
  reason: string;
};

export function getBestPlay(
  playerCards: Card[],
  dealerUpCard: Card,
  canSplitHand: boolean,
  canDoubleHand: boolean
): BestPlay {
  const dKey = dealerKey(dealerUpCard);
  const { total, soft } = scoreHand(playerCards);

  // Check pairs first
  if (playerCards.length === 2 && isPair(playerCards) && canSplitHand) {
    const pairKey = playerCards[0].rank === 'A' ? 'A' : String(cardValue(playerCards[0].rank));
    const pairAction = PAIR_STRATEGY[pairKey]?.[dKey];
    if (pairAction === 'P') {
      return { action: 'split', reason: ACTION_REASONS['P'] };
    }
    // If pair chart says don't split, fall through to soft/hard
  }

  // Check soft totals
  if (soft && total >= 13 && total <= 21) {
    const softAction = SOFT_STRATEGY[total]?.[dKey];
    if (softAction) {
      let action = softAction;
      // Ds = double if allowed, otherwise stand
      if (action === 'Ds' && !canDoubleHand) {
        action = 'S';
      }
      // D = double if allowed, otherwise hit
      if (action === 'D' && !canDoubleHand) {
        action = 'H';
      }
      return {
        action: ACTION_NAMES[action] as BestPlay['action'],
        reason: ACTION_REASONS[softAction],
      };
    }
  }

  // Hard totals
  const hardTotal = Math.min(total, 21);
  const clampedTotal = Math.max(5, hardTotal);
  const hardAction = HARD_STRATEGY[clampedTotal]?.[dKey] || 'H';

  let finalAction = hardAction;
  if (finalAction === 'D' && !canDoubleHand) {
    finalAction = 'H';
  }

  return {
    action: ACTION_NAMES[finalAction] as BestPlay['action'],
    reason: ACTION_REASONS[hardAction],
  };
}

export function formatDealerCard(card: Card): string {
  return dealerKey(card);
}
