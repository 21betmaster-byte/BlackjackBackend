import {
  blackjackAdapter,
  BlackjackAction,
  resetRoundCounter,
  incrementRoundCounter,
  getCurrentRoundId,
} from '../../training/adapters/BlackjackAdapter';
import {
  GameState,
  Card,
  Hand,
  Suit,
  Rank,
  DEFAULT_CONFIG,
  createShoe,
} from '../../game/engine';

function card(rank: Rank, suit: Suit = 'spades', faceUp = true): Card {
  return { rank, suit, faceUp };
}

function makeHand(cards: Card[], bet: number = 10, status: Hand['status'] = 'active'): Hand {
  return { cards, bet, status, isDoubled: false };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    shoe: createShoe(8),
    discardPile: [],
    dealerHand: [card('6'), card('K', 'hearts', false)],
    playerHands: [makeHand([card('10'), card('6')])],
    activeHandIndex: 0,
    phase: 'player_turn',
    balance: 1000,
    insuranceBet: 0,
    roundResult: null,
    config: DEFAULT_CONFIG,
    previousBets: [10],
    ...overrides,
  };
}

beforeEach(() => {
  resetRoundCounter();
});

// ============================================================
// gameType
// ============================================================

describe('blackjackAdapter.gameType', () => {
  it('returns "blackjack"', () => {
    expect(blackjackAdapter.gameType).toBe('blackjack');
  });
});

// ============================================================
// isDecisionPoint
// ============================================================

describe('isDecisionPoint', () => {
  it('returns true during player_turn with active hand', () => {
    const state = makeState({ phase: 'player_turn' });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(true);
  });

  it('returns true during insurance phase', () => {
    const state = makeState({ phase: 'insurance' });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(true);
  });

  it('returns false during betting phase', () => {
    const state = makeState({ phase: 'betting' });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(false);
  });

  it('returns false during dealing phase', () => {
    const state = makeState({ phase: 'dealing' });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(false);
  });

  it('returns false during dealer_turn', () => {
    const state = makeState({ phase: 'dealer_turn' });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(false);
  });

  it('returns false during settlement', () => {
    const state = makeState({ phase: 'settlement' });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(false);
  });

  it('returns false when active hand is stood', () => {
    const state = makeState({
      phase: 'player_turn',
      playerHands: [makeHand([card('10'), card('7')], 10, 'stood')],
    });
    expect(blackjackAdapter.isDecisionPoint(state)).toBe(false);
  });
});

// ============================================================
// getOptimalAction — Insurance
// ============================================================

describe('getOptimalAction (insurance)', () => {
  it('returns insurance_no for insurance phase', () => {
    const state = makeState({
      phase: 'insurance',
      dealerHand: [card('A'), card('K', 'hearts', false)],
    });
    const result = blackjackAdapter.getOptimalAction(state);

    expect(result).not.toBeNull();
    expect(result!.action).toBe('insurance_no');
    expect(result!.category).toBe('insurance');
    expect(result!.scenarioKey).toBe('insurance_offered');
  });

  it('includes dealerUpCard in context', () => {
    const state = makeState({
      phase: 'insurance',
      dealerHand: [card('A'), card('K', 'hearts', false)],
    });
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result!.context.dealerUpCard).toBeDefined();
  });
});

// ============================================================
// getOptimalAction — Player Turn
// ============================================================

describe('getOptimalAction (player turn)', () => {
  it('returns surrender for hard 16 vs dealer 10 (2-card hand)', () => {
    const state = makeState({
      dealerHand: [card('10'), card('K', 'hearts', false)],
      playerHands: [makeHand([card('10'), card('6')])],
    });
    const result = blackjackAdapter.getOptimalAction(state);

    expect(result).not.toBeNull();
    // With a 2-card hand (canSurrender=true), surrender is optimal for hard 16 vs 10
    expect(result!.action).toBe('surrender');
    expect(result!.category).toBe('hard_total');
    expect(result!.scenarioKey).toBe('hard_16_vs_10');
  });

  it('returns stand for hard 17 vs 7', () => {
    const state = makeState({
      dealerHand: [card('7'), card('K', 'hearts', false)],
      playerHands: [makeHand([card('10'), card('7')])],
    });
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result!.action).toBe('stand');
  });

  it('returns split for pair of 8s vs 6', () => {
    const state = makeState({
      dealerHand: [card('6'), card('K', 'hearts', false)],
      playerHands: [makeHand([card('8'), card('8', 'hearts')])],
    });
    const result = blackjackAdapter.getOptimalAction(state);

    expect(result!.action).toBe('split');
    expect(result!.category).toBe('pair_split');
  });

  it('returns double for soft 17 vs 3', () => {
    const state = makeState({
      dealerHand: [card('3'), card('K', 'hearts', false)],
      playerHands: [makeHand([card('A'), card('6')])],
    });
    const result = blackjackAdapter.getOptimalAction(state);

    expect(result!.action).toBe('double');
    expect(result!.category).toBe('soft_total');
  });

  it('returns null for non-active hand', () => {
    const state = makeState({
      playerHands: [makeHand([card('10'), card('7')], 10, 'stood')],
    });
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result).toBeNull();
  });

  it('returns null during betting phase', () => {
    const state = makeState({ phase: 'betting' });
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result).toBeNull();
  });

  it('includes player cards in context', () => {
    const state = makeState();
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result!.context.playerCards).toBeDefined();
    expect(Array.isArray(result!.context.playerCards)).toBe(true);
  });

  it('includes dealerUpCard in context', () => {
    const state = makeState();
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result!.context.dealerUpCard).toBeDefined();
  });

  it('includes handIndex in context', () => {
    const state = makeState({ activeHandIndex: 0 });
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result!.context.handIndex).toBe(0);
  });

  it('includes roundId in context', () => {
    incrementRoundCounter();
    const state = makeState();
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result!.context.roundId).toBe(1);
  });

  it('has non-empty explanation', () => {
    const state = makeState();
    const result = blackjackAdapter.getOptimalAction(state);
    expect(typeof result!.explanation).toBe('string');
    expect(result!.explanation.length).toBeGreaterThan(0);
  });

  it('handles multiple hands (split scenario) by using activeHandIndex', () => {
    const state = makeState({
      playerHands: [
        makeHand([card('8'), card('3')], 10, 'stood'),
        makeHand([card('8'), card('9')]),
      ],
      activeHandIndex: 1,
    });
    const result = blackjackAdapter.getOptimalAction(state);
    expect(result).not.toBeNull();
    expect(result!.context.handIndex).toBe(1);
  });
});

// ============================================================
// normalizeAction
// ============================================================

describe('normalizeAction', () => {
  it('returns the action unchanged', () => {
    expect(blackjackAdapter.normalizeAction('hit')).toBe('hit');
    expect(blackjackAdapter.normalizeAction('stand')).toBe('stand');
    expect(blackjackAdapter.normalizeAction('double')).toBe('double');
    expect(blackjackAdapter.normalizeAction('split')).toBe('split');
    expect(blackjackAdapter.normalizeAction('insurance_yes')).toBe('insurance_yes');
    expect(blackjackAdapter.normalizeAction('insurance_no')).toBe('insurance_no');
  });
});

// ============================================================
// Round counter
// ============================================================

describe('round counter', () => {
  it('starts at 0 after reset', () => {
    expect(getCurrentRoundId()).toBe(0);
  });

  it('increments correctly', () => {
    incrementRoundCounter();
    expect(getCurrentRoundId()).toBe(1);
    incrementRoundCounter();
    expect(getCurrentRoundId()).toBe(2);
  });

  it('resets to 0', () => {
    incrementRoundCounter();
    incrementRoundCounter();
    resetRoundCounter();
    expect(getCurrentRoundId()).toBe(0);
  });
});
