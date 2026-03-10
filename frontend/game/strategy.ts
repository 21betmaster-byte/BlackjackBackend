// Basic Strategy Advisor for Blackjack
// Charts based on standard 8-deck, dealer stands on soft 17

import { Card, cardValue, scoreHand, isPair, Rank } from './engine';

type Action = 'H' | 'S' | 'D' | 'P' | 'Ds' | 'Rh';

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
  15: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'H','10':'Rh','A':'Rh' },
  16: { '2':'S','3':'S','4':'S','5':'S','6':'S','7':'H','8':'H','9':'Rh','10':'Rh','A':'Rh' },
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
  'Rh': 'surrender',
};

const ACTION_REASONS: Record<string, string> = {
  'H': 'Basic strategy says to hit',
  'S': 'Basic strategy says to stand',
  'D': 'Basic strategy says to double down',
  'Ds': 'Basic strategy says to double if allowed, otherwise stand',
  'P': 'Basic strategy says to split',
  'Rh': 'Basic strategy says to surrender if allowed, otherwise hit',
};

export type BestPlay = {
  action: 'hit' | 'stand' | 'double' | 'split' | 'surrender';
  reason: string;
};

export function getBestPlay(
  playerCards: Card[],
  dealerUpCard: Card,
  canSplitHand: boolean,
  canDoubleHand: boolean,
  canSurrenderHand: boolean = false
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
  if (finalAction === 'Rh' && !canSurrenderHand) {
    finalAction = 'H';
  }
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

// ============================================================
// Enhanced Strategy — Detailed Play with Rich Explanations
// ============================================================

/** Dealer bust probabilities by upcard (standard 8-deck, dealer stands on soft 17). */
export const DEALER_BUST_PROBABILITY: Record<string, number> = {
  '2': 0.3536, '3': 0.3744, '4': 0.3945, '5': 0.4153,
  '6': 0.4228, '7': 0.2600, '8': 0.2436, '9': 0.2291,
  '10': 0.2139, 'A': 0.1150,
};

export type DetailedPlayCategory = 'hard_total' | 'soft_total' | 'pair_split' | 'insurance';

export interface DetailedPlay extends BestPlay {
  category: DetailedPlayCategory;
  scenarioKey: string;
  scenarioDescription: string;
  explanation: string;
}

function buildHardExplanation(total: number, dKey: string, action: string, bustProb: number): string {
  if (action === 'stand' && total >= 17) {
    return `With ${total}, you have a strong hand. Standing avoids the risk of busting.`;
  }
  if (action === 'stand' && bustProb > 0.35) {
    return `Dealer shows ${dKey} and busts ${(bustProb * 100).toFixed(0)}% of the time. Stand and let the dealer take the risk.`;
  }
  if (action === 'hit' && total <= 11) {
    return `With ${total}, you cannot bust by taking one more card. Always hit to improve your hand.`;
  }
  if (action === 'hit') {
    return `Dealer shows ${dKey} (strong card, busts only ${(bustProb * 100).toFixed(0)}% of the time). With ${total}, hitting gives the best expected value despite bust risk.`;
  }
  if (action === 'double') {
    return `With ${total} vs dealer ${dKey}, doubling maximizes profit. Dealer busts ${(bustProb * 100).toFixed(0)}% of the time, and you have a strong position.`;
  }
  return `Basic strategy: ${action} with hard ${total} vs dealer ${dKey}.`;
}

function buildSoftExplanation(total: number, dKey: string, action: string, bustProb: number, canDouble: boolean): string {
  if (action === 'stand' && total >= 19) {
    return `Soft ${total} is a strong hand. Standing preserves your advantage.`;
  }
  if (action === 'double' || action === 'stand' && bustProb > 0.35) {
    if (!canDouble && total === 18) {
      return `Soft 18 vs ${dKey}: ideally you'd double to maximize value (dealer busts ${(bustProb * 100).toFixed(0)}%), but since you can't double, standing is best.`;
    }
    return `Soft ${total} vs dealer ${dKey}: ${action === 'double' ? 'doubling' : 'standing'} takes advantage of the dealer's ${(bustProb * 100).toFixed(0)}% bust rate while your ace keeps you flexible.`;
  }
  if (action === 'hit') {
    return `Soft ${total} vs dealer ${dKey}: hit to improve. Your ace acts as a safety net — you can't bust on the next card.`;
  }
  return `Basic strategy: ${action} with soft ${total} vs dealer ${dKey}.`;
}

function buildPairExplanation(rank: Rank, dKey: string, action: string, bustProb: number): string {
  const val = rank === 'A' ? 'A' : String(cardValue(rank));
  if (action === 'split' && (val === 'A' || val === '8')) {
    return val === 'A'
      ? 'Always split Aces. Two chances at 21 is far better than a soft 12.'
      : `Always split 8s. Playing a 16 is the worst hand in blackjack — two 8s give you a much better starting position.`;
  }
  if (action === 'split' && bustProb > 0.35) {
    return `Split ${val}s vs dealer ${dKey}. Dealer busts ${(bustProb * 100).toFixed(0)}% of the time, so two hands are better than one.`;
  }
  if (action === 'split') {
    return `Split ${val}s vs dealer ${dKey}. Two separate hands each have better expected value than the combined total.`;
  }
  return `Don't split ${val}s vs dealer ${dKey}. The combined total plays better as a single hand.`;
}

/**
 * Enhanced version of getBestPlay that returns category, scenario key,
 * and a rich explanation with probabilities. Used by the training framework.
 */
export function getDetailedPlay(
  playerCards: Card[],
  dealerUpCard: Card,
  canSplitHand: boolean,
  canDoubleHand: boolean,
  canSurrenderHand: boolean = false,
): DetailedPlay {
  const bestPlay = getBestPlay(playerCards, dealerUpCard, canSplitHand, canDoubleHand, canSurrenderHand);
  const dKey = dealerKey(dealerUpCard);
  const { total, soft } = scoreHand(playerCards);
  const bustProb = DEALER_BUST_PROBABILITY[dKey] ?? 0.2;

  // Determine category, scenarioKey, description
  let category: DetailedPlayCategory = 'hard_total';
  let scenarioKey: string;
  let scenarioDescription: string;

  // Check if it's a pair split scenario
  if (playerCards.length === 2 && isPair(playerCards) && canSplitHand) {
    const pairVal = playerCards[0].rank === 'A' ? 'A' : String(cardValue(playerCards[0].rank));
    const pairAction = PAIR_STRATEGY[pairVal]?.[dKey];
    if (pairAction === 'P') {
      category = 'pair_split';
      scenarioKey = `pair_${pairVal}_vs_${dKey}`;
      scenarioDescription = `Pair of ${pairVal}s vs Dealer ${dKey}`;
      return {
        ...bestPlay,
        category,
        scenarioKey,
        scenarioDescription,
        explanation: buildPairExplanation(playerCards[0].rank, dKey, bestPlay.action, bustProb),
      };
    }
  }

  // Soft totals
  if (soft && total >= 13 && total <= 21) {
    category = 'soft_total';
    scenarioKey = `soft_${total}_vs_${dKey}`;
    scenarioDescription = `Soft ${total} vs Dealer ${dKey}`;
    return {
      ...bestPlay,
      category,
      scenarioKey,
      scenarioDescription,
      explanation: buildSoftExplanation(total, dKey, bestPlay.action, bustProb, canDoubleHand),
    };
  }

  // Hard totals
  const hardTotal = Math.min(Math.max(total, 5), 21);
  scenarioKey = `hard_${hardTotal}_vs_${dKey}`;
  scenarioDescription = `Hard ${hardTotal} vs Dealer ${dKey}`;
  return {
    ...bestPlay,
    category,
    scenarioKey,
    scenarioDescription,
    explanation: buildHardExplanation(hardTotal, dKey, bestPlay.action, bustProb),
  };
}

/**
 * Insurance strategy. Basic strategy says never take insurance.
 * Returns a DetailedPlay for the insurance decision point.
 */
export function getInsurancePlay(): DetailedPlay {
  return {
    action: 'stand', // represents "decline insurance"
    reason: 'Basic strategy says never take insurance',
    category: 'insurance',
    scenarioKey: 'insurance_offered',
    scenarioDescription: 'Insurance offered (Dealer shows Ace)',
    explanation: 'Insurance is a side bet paying 2:1 that the dealer has blackjack. In an 8-deck game, the dealer has a 10-value hole card only ~30.8% of the time — the bet has negative expected value. Always decline.',
  };
}
