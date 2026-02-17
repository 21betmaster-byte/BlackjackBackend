import {
  createShoe,
  scoreHand,
  isBlackjack,
  isPair,
  canSplit,
  canDouble,
  playerHit,
  playerDouble,
  playerSplit,
  playDealer,
  settleRound,
  dealInitialCards,
  createInitialState,
  placeBet,
  resolveInsurance,
  shouldReshuffle,
  Card,
  Hand,
  GameState,
  GameConfig,
  DEFAULT_CONFIG,
  Suit,
  Rank,
} from '../game/engine';
import { getBestPlay } from '../game/strategy';

// Helper to create cards
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
    dealerHand: [],
    playerHands: [],
    activeHandIndex: 0,
    phase: 'player_turn',
    balance: 1000,
    insuranceBet: 0,
    roundResult: null,
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

describe('createShoe', () => {
  it('creates 416 cards for 8 decks', () => {
    const shoe = createShoe(8);
    expect(shoe).toHaveLength(416);
  });

  it('has correct distribution of suits and ranks', () => {
    const shoe = createShoe(1);
    expect(shoe).toHaveLength(52);
    const aces = shoe.filter(c => c.rank === 'A');
    expect(aces).toHaveLength(4);
  });
});

describe('scoreHand', () => {
  it('scores hard total correctly', () => {
    const result = scoreHand([card('5'), card('8')]);
    expect(result.total).toBe(13);
    expect(result.soft).toBe(false);
    expect(result.display).toBe('13');
  });

  it('scores soft total correctly', () => {
    const result = scoreHand([card('A'), card('6')]);
    expect(result.total).toBe(17);
    expect(result.soft).toBe(true);
    expect(result.display).toBe('7 or 17');
  });

  it('scores multiple aces correctly', () => {
    const result = scoreHand([card('A'), card('A'), card('6')]);
    expect(result.total).toBe(18);
    expect(result.soft).toBe(true);
    expect(result.display).toBe('8 or 18');
  });

  it('scores bust correctly', () => {
    const result = scoreHand([card('10'), card('8'), card('5')]);
    expect(result.total).toBe(23);
    expect(result.soft).toBe(false);
  });

  it('converts soft to hard when bust', () => {
    const result = scoreHand([card('A'), card('8'), card('5')]);
    expect(result.total).toBe(14);
    expect(result.soft).toBe(false);
  });

  it('ignores face-down cards', () => {
    const result = scoreHand([card('10'), card('K', 'spades', false)]);
    expect(result.total).toBe(10);
  });
});

describe('isBlackjack', () => {
  it('returns true for Ace + King', () => {
    expect(isBlackjack([card('A'), card('K')])).toBe(true);
  });

  it('returns true for 10 + Ace', () => {
    expect(isBlackjack([card('10'), card('A')])).toBe(true);
  });

  it('returns false for 3-card 21', () => {
    expect(isBlackjack([card('A'), card('5'), card('5')])).toBe(false);
  });

  it('returns false for non-21 two cards', () => {
    expect(isBlackjack([card('K'), card('5')])).toBe(false);
  });
});

describe('canSplit', () => {
  it('returns true for pair of 8s with < 4 hands', () => {
    const hand = makeHand([card('8'), card('8', 'hearts')]);
    const allHands = [hand];
    expect(canSplit(hand, allHands)).toBe(true);
  });

  it('returns false when already at 4 hands', () => {
    const hand = makeHand([card('8'), card('8', 'hearts')]);
    const allHands = [hand, makeHand([card('5'), card('6')]), makeHand([card('7'), card('9')]), makeHand([card('3'), card('4')])];
    expect(canSplit(hand, allHands)).toBe(false);
  });

  it('returns false for non-pair', () => {
    const hand = makeHand([card('8'), card('9')]);
    expect(canSplit(hand, [hand])).toBe(false);
  });
});

describe('canDouble', () => {
  it('returns true for 2-card active hand', () => {
    const hand = makeHand([card('5'), card('6')]);
    expect(canDouble(hand)).toBe(true);
  });

  it('returns false for 3-card hand', () => {
    const hand = makeHand([card('5'), card('6'), card('3')]);
    expect(canDouble(hand)).toBe(false);
  });
});

describe('playerHit', () => {
  it('busts when total exceeds 21', () => {
    const state = makeState({
      shoe: [card('K')],
      playerHands: [makeHand([card('10'), card('8')])],
      activeHandIndex: 0,
    });
    const result = playerHit(state);
    expect(result.playerHands[0].status).toBe('busted');
    expect(result.playerHands[0].cards).toHaveLength(3);
  });

  it('stays active when not bust', () => {
    const state = makeState({
      shoe: [card('3')],
      playerHands: [makeHand([card('5'), card('6')])],
      activeHandIndex: 0,
    });
    const result = playerHit(state);
    expect(result.playerHands[0].status).toBe('active');
    expect(scoreHand(result.playerHands[0].cards).total).toBe(14);
  });
});

describe('playerDouble', () => {
  it('doubles bet and draws one card', () => {
    const state = makeState({
      shoe: [card('5')],
      playerHands: [makeHand([card('5'), card('6')], 50)],
      activeHandIndex: 0,
      balance: 1000,
    });
    const result = playerDouble(state);
    expect(result.playerHands[0].bet).toBe(100);
    expect(result.playerHands[0].cards).toHaveLength(3);
    expect(result.playerHands[0].isDoubled).toBe(true);
    expect(result.balance).toBe(950);
  });
});

describe('playerSplit', () => {
  it('creates two hands with equal bets', () => {
    const state = makeState({
      shoe: [card('3'), card('7')],
      playerHands: [makeHand([card('8'), card('8', 'hearts')], 50)],
      activeHandIndex: 0,
      balance: 1000,
    });
    const result = playerSplit(state);
    expect(result.playerHands).toHaveLength(2);
    expect(result.playerHands[0].bet).toBe(50);
    expect(result.playerHands[1].bet).toBe(50);
    expect(result.playerHands[0].cards).toHaveLength(2);
    expect(result.playerHands[1].cards).toHaveLength(2);
    expect(result.balance).toBe(950);
  });
});

describe('playDealer', () => {
  it('hits on 16', () => {
    const state = makeState({
      shoe: [card('5')],
      dealerHand: [card('10'), card('6', 'spades', false)],
      playerHands: [makeHand([card('10'), card('8')], 10, 'stood')],
      phase: 'dealer_turn',
    });
    const result = playDealer(state);
    // Dealer had 16, drew a 5 to get 21
    expect(scoreHand(result.dealerHand).total).toBe(21);
    expect(result.dealerHand).toHaveLength(3);
  });

  it('stands on 17', () => {
    const state = makeState({
      shoe: [card('5')],
      dealerHand: [card('10'), card('7', 'spades', false)],
      playerHands: [makeHand([card('10'), card('8')], 10, 'stood')],
      phase: 'dealer_turn',
    });
    const result = playDealer(state);
    expect(scoreHand(result.dealerHand).total).toBe(17);
    expect(result.dealerHand).toHaveLength(2);
  });

  it('does not draw when all players busted', () => {
    const state = makeState({
      shoe: [card('5')],
      dealerHand: [card('6'), card('5', 'spades', false)],
      playerHands: [makeHand([card('10'), card('8'), card('5')], 10, 'busted')],
      phase: 'dealer_turn',
    });
    const result = playDealer(state);
    expect(result.dealerHand).toHaveLength(2);
    expect(result.phase).toBe('settlement');
  });
});

describe('settleRound', () => {
  it('player win pays 1:1', () => {
    const state = makeState({
      dealerHand: [card('10'), card('8')],
      playerHands: [makeHand([card('10'), card('K')], 100, 'stood')],
      phase: 'settlement',
      balance: 900,
    });
    const result = settleRound(state);
    expect(result.roundResult!.handResults[0].result).toBe('win');
    expect(result.roundResult!.handResults[0].payout).toBe(200);
    expect(result.balance).toBe(1100);
  });

  it('blackjack pays 3:2', () => {
    const state = makeState({
      dealerHand: [card('10'), card('8')],
      playerHands: [makeHand([card('A'), card('K')], 100, 'blackjack')],
      phase: 'settlement',
      balance: 900,
    });
    const result = settleRound(state);
    expect(result.roundResult!.handResults[0].result).toBe('blackjack');
    expect(result.roundResult!.handResults[0].payout).toBe(250); // 100 + 150
    expect(result.balance).toBe(1150);
  });

  it('push returns bet', () => {
    const state = makeState({
      dealerHand: [card('10'), card('8')],
      playerHands: [makeHand([card('J'), card('8')], 100, 'stood')],
      phase: 'settlement',
      balance: 900,
    });
    const result = settleRound(state);
    expect(result.roundResult!.handResults[0].result).toBe('push');
    expect(result.roundResult!.handResults[0].payout).toBe(100);
    expect(result.balance).toBe(1000);
  });

  it('busted player loses', () => {
    const state = makeState({
      dealerHand: [card('10'), card('8')],
      playerHands: [makeHand([card('10'), card('8'), card('5')], 100, 'busted')],
      phase: 'settlement',
      balance: 900,
    });
    const result = settleRound(state);
    expect(result.roundResult!.handResults[0].result).toBe('busted');
    expect(result.roundResult!.handResults[0].payout).toBe(0);
    expect(result.balance).toBe(900);
  });

  it('insurance pays 2:1 when dealer has blackjack', () => {
    const state = makeState({
      dealerHand: [card('A'), card('K')],
      playerHands: [makeHand([card('10'), card('8')], 100, 'stood')],
      phase: 'settlement',
      balance: 850,
      insuranceBet: 50,
    });
    const result = settleRound(state);
    // Player loses hand but wins insurance: 0 (hand) + 150 (insurance 2:1 = 50*3)
    expect(result.balance).toBe(1000);
  });
});

describe('getBestPlay (strategy)', () => {
  it('recommends split for pair of 8s vs dealer 6', () => {
    const result = getBestPlay(
      [card('8'), card('8', 'hearts')],
      card('6'),
      true,
      true
    );
    expect(result.action).toBe('split');
  });

  it('recommends double for soft 17 (A,6) vs dealer 3', () => {
    const result = getBestPlay(
      [card('A'), card('6')],
      card('3'),
      false,
      true
    );
    expect(result.action).toBe('double');
  });

  it('recommends hit for hard 16 vs dealer 10', () => {
    const result = getBestPlay(
      [card('10'), card('6')],
      card('10', 'hearts'),
      false,
      true
    );
    expect(result.action).toBe('hit');
  });

  it('recommends stand for hard 17 vs any dealer card', () => {
    const result = getBestPlay(
      [card('10'), card('7')],
      card('A'),
      false,
      false
    );
    expect(result.action).toBe('stand');
  });

  it('recommends hit for soft 18 vs dealer 9 (cannot double)', () => {
    const result = getBestPlay(
      [card('A'), card('7')],
      card('9'),
      false,
      false
    );
    expect(result.action).toBe('hit');
  });

  it('recommends stand for soft 18 vs dealer 7', () => {
    const result = getBestPlay(
      [card('A'), card('7')],
      card('7'),
      false,
      false
    );
    expect(result.action).toBe('stand');
  });
});

describe('dealInitialCards', () => {
  it('deals 2 cards to each hand and 2 to dealer', () => {
    let state = createInitialState();
    state = placeBet(state, 0, 25);
    state = placeBet(state, 1, 50);
    state = dealInitialCards(state);
    expect(state.playerHands[0].cards).toHaveLength(2);
    expect(state.playerHands[1].cards).toHaveLength(2);
    expect(state.dealerHand).toHaveLength(2);
    expect(state.dealerHand[0].faceUp).toBe(true);
    expect(state.dealerHand[1].faceUp).toBe(false);
  });
});

describe('GameConfig', () => {
  it('createInitialState uses custom config', () => {
    const customConfig: GameConfig = {
      ...DEFAULT_CONFIG,
      deckCount: 6,
      startingBalance: 500,
      maxBet: 200,
    };
    const state = createInitialState(customConfig);
    expect(state.balance).toBe(500);
    expect(state.config.maxBet).toBe(200);
    expect(state.config.deckCount).toBe(6);
    expect(state.shoe.length).toBe(6 * 52);
  });

  it('placeBet respects custom maxBet', () => {
    const customConfig: GameConfig = { ...DEFAULT_CONFIG, maxBet: 200 };
    let state = createInitialState(customConfig);
    state = placeBet(state, 0, 150);
    expect(state.playerHands[0].bet).toBe(150);
    // Adding more beyond maxBet should be rejected
    state = placeBet(state, 0, 100);
    expect(state.playerHands[0].bet).toBe(150); // unchanged
  });

  it('placeBet respects custom maxHands', () => {
    const customConfig: GameConfig = { ...DEFAULT_CONFIG, maxHands: 2 };
    let state = createInitialState(customConfig);
    state = placeBet(state, 0, 25);
    state = placeBet(state, 1, 25);
    state = placeBet(state, 2, 25); // should be rejected
    expect(state.playerHands).toHaveLength(2);
  });

  it('6:5 blackjack payout', () => {
    const customConfig: GameConfig = { ...DEFAULT_CONFIG, blackjackPayout: 1.2 };
    const state = makeState({
      dealerHand: [card('10'), card('8')],
      playerHands: [makeHand([card('A'), card('K')], 100, 'blackjack')],
      phase: 'settlement',
      balance: 900,
      config: customConfig,
    });
    const result = settleRound(state);
    // 6:5 payout: 100 + Math.floor(100 * 1.2) = 100 + 120 = 220
    expect(result.roundResult!.handResults[0].payout).toBe(220);
    expect(result.balance).toBe(1120);
  });

  it('dealer hits soft 17 when configured', () => {
    const customConfig: GameConfig = { ...DEFAULT_CONFIG, dealerHitsSoft17: true };
    const state = makeState({
      shoe: [card('4')], // dealer will draw this to get 21
      dealerHand: [card('A'), card('6', 'spades', false)],
      playerHands: [makeHand([card('10'), card('8')], 10, 'stood')],
      phase: 'dealer_turn',
      config: customConfig,
    });
    const result = playDealer(state);
    // Dealer had soft 17 (A+6), should hit and draw 4 to get 21
    expect(result.dealerHand).toHaveLength(3);
    expect(scoreHand(result.dealerHand).total).toBe(21);
  });

  it('dealer stands on soft 17 with default config', () => {
    const state = makeState({
      shoe: [card('4')],
      dealerHand: [card('A'), card('6', 'spades', false)],
      playerHands: [makeHand([card('10'), card('8')], 10, 'stood')],
      phase: 'dealer_turn',
      config: DEFAULT_CONFIG,
    });
    const result = playDealer(state);
    // Dealer had soft 17, should stand with default config
    expect(result.dealerHand).toHaveLength(2);
    expect(scoreHand(result.dealerHand).total).toBe(17);
  });

  it('shouldReshuffle respects custom config', () => {
    const customConfig: GameConfig = { ...DEFAULT_CONFIG, deckCount: 4, reshuffleThreshold: 0.5 };
    const totalCards = 4 * 52; // 208
    const halfShoe = createShoe(4).slice(0, 103); // just under half
    expect(shouldReshuffle(halfShoe, customConfig)).toBe(true);

    const overHalf = createShoe(4).slice(0, 105); // just over half
    expect(shouldReshuffle(overHalf, customConfig)).toBe(false);
  });
});
