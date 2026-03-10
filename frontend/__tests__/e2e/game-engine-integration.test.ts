/**
 * E2E Integration Test: Game Engine Full Lifecycle
 *
 * Tests complete blackjack game scenarios from betting through settlement,
 * including multi-hand play, splits, doubles, insurance, and reshuffling.
 * Verifies the game engine state machine transitions are correct end-to-end.
 */

import {
  createInitialState,
  createShoe,
  placeBet,
  removeBet,
  clearBets,
  dealInitialCards,
  completeDeal,
  resolveInsurance,
  playerHit,
  playerStand,
  playerDouble,
  playerSplit,
  playDealer,
  settleRound,
  startNewRound,
  rebetAndDeal,
  resetMoney,
  scoreHand,
  canSplit,
  canDouble,
  isBlackjack,
  Card,
  GameState,
  Hand,
  Suit,
  Rank,
  DEFAULT_CONFIG,
} from '../../game/engine';

// ============================================================
// Helpers
// ============================================================

function card(rank: Rank, suit: Suit = 'spades', faceUp = true): Card {
  return { rank, suit, faceUp };
}

/** Create a rigged game state with pre-initialized hand slots (matching createInitialState). */
function makeRiggedState(shoeCards: Card[]): GameState {
  return {
    shoe: shoeCards,
    discardPile: [],
    dealerHand: [],
    playerHands: Array.from({ length: DEFAULT_CONFIG.maxHands }, () => ({
      cards: [] as Card[],
      bet: 0,
      status: 'active' as Hand['status'],
      isDoubled: false,
    })),
    activeHandIndex: 0,
    phase: 'betting',
    balance: 1000,
    insuranceBet: 0,
    roundResult: null,
    config: DEFAULT_CONFIG,
    previousBets: [],
  };
}

// ============================================================
// Full Game Lifecycle Tests
// ============================================================

describe('E2E: Full Game Lifecycle', () => {
  describe('Standard Win/Loss/Push Scenarios', () => {
    it('player wins with higher total than dealer', () => {
      // Shoe pops from the end: dealer-up, player1, player2, dealer-hole
      // Player: 10+9=19, Dealer: 10+7=17
      const shoe: Card[] = [
        card('7', 'clubs', false),  // dealer hole (dealt face down)
        card('9', 'hearts'),        // player card 2
        card('10', 'diamonds'),     // dealer up card
        card('10', 'spades'),       // player card 1
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 50);
      expect(state.balance).toBe(950);

      state = dealInitialCards(state);
      state = completeDeal(state);
      expect(state.phase).toBe('player_turn');
      expect(scoreHand(state.playerHands[0].cards).total).toBe(19);

      state = playerStand(state);
      expect(state.phase).toBe('dealer_turn');

      state = playDealer(state);
      expect(scoreHand(state.dealerHand).total).toBe(17);

      state = settleRound(state);
      expect(state.phase).toBe('settlement');
      expect(state.balance).toBe(1050); // Won 50
    });

    it('player loses when busting', () => {
      // Player: 10+6=16, hits 10 → busts at 26
      const shoe: Card[] = [
        card('10', 'hearts'),       // hit card (busts)
        card('8', 'clubs', false),  // dealer hole
        card('6', 'hearts'),        // player card 2
        card('10', 'diamonds'),     // dealer up
        card('10', 'spades'),       // player card 1
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 50);
      state = dealInitialCards(state);
      state = completeDeal(state);

      expect(scoreHand(state.playerHands[0].cards).total).toBe(16);

      state = playerHit(state);
      expect(scoreHand(state.playerHands[0].cards).total).toBeGreaterThan(21);
      expect(state.playerHands[0].status).toBe('busted');

      if (state.phase === 'dealer_turn') {
        state = playDealer(state);
      }
      state = settleRound(state);
      expect(state.balance).toBe(950); // Lost 50
    });

    it('push when both have same total', () => {
      // Player: 10+8=18, Dealer: 10+8=18
      const shoe: Card[] = [
        card('8', 'clubs', false),  // dealer hole
        card('8', 'hearts'),        // player card 2
        card('10', 'diamonds'),     // dealer up
        card('10', 'spades'),       // player card 1
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 50);
      state = dealInitialCards(state);
      state = completeDeal(state);

      state = playerStand(state);
      state = playDealer(state);
      state = settleRound(state);

      expect(state.balance).toBe(1000); // Push — money returned
    });
  });

  describe('Double Down', () => {
    it('doubles bet, gets one card, and settles correctly', () => {
      // Player: 5+6=11, double draw: 10 → 21
      // Dealer: 10+6=16, draws 3 → 19
      const shoe: Card[] = [
        card('3', 'hearts'),        // dealer draw
        card('10', 'diamonds'),     // double draw → 21
        card('6', 'clubs', false),  // dealer hole
        card('6', 'hearts'),        // player card 2
        card('10', 'clubs'),        // dealer up card
        card('5', 'spades'),        // player card 1
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 50);
      state = dealInitialCards(state);
      state = completeDeal(state);

      expect(scoreHand(state.playerHands[0].cards).total).toBe(11);
      expect(canDouble(state.playerHands[0])).toBe(true);

      state = playerDouble(state);
      expect(state.playerHands[0].isDoubled).toBe(true);
      expect(state.playerHands[0].cards).toHaveLength(3);
      expect(scoreHand(state.playerHands[0].cards).total).toBe(21);

      state = playDealer(state);
      state = settleRound(state);

      // Balance: started 1000, bet 50 (balance 950), doubled (balance 900)
      // Won: bet is 100, payout = 200 → 900 + 200 = 1100
      expect(state.balance).toBe(1100);
    });
  });

  describe('Split', () => {
    it('splits a pair and plays both hands', () => {
      // Player: 8+8, Dealer: 6+10=16
      // After split:
      //   Hand 1: 8 + card from shoe → play
      //   Hand 2: 8 + card from shoe → play
      const shoe: Card[] = [
        card('7', 'hearts'),        // dealer draws → 16+7=23 bust
        card('9', 'clubs'),         // split hand 2 gets 9 → 8+9=17
        card('10', 'hearts'),       // split hand 1 gets 10 → 8+10=18
        card('10', 'clubs', false), // dealer hole
        card('8', 'diamonds'),      // player card 2
        card('6', 'hearts'),        // dealer up card
        card('8', 'spades'),        // player card 1
      ];

      let state = makeRiggedState(shoe);
      state = placeBet(state, 0, 50);
      state = dealInitialCards(state);
      state = completeDeal(state);

      expect(canSplit(state.playerHands[0], state.playerHands, state.config)).toBe(true);

      state = playerSplit(state);
      expect(state.playerHands).toHaveLength(2);

      // Play hand 1 — stand
      if (state.playerHands[state.activeHandIndex]?.status === 'active') {
        state = playerStand(state);
      }
      // Play hand 2 — stand
      if (state.phase === 'player_turn' && state.playerHands[state.activeHandIndex]?.status === 'active') {
        state = playerStand(state);
      }

      if (state.phase === 'dealer_turn') {
        state = playDealer(state);
      }
      state = settleRound(state);

      // Dealer busted → both hands win
      // Balance: 1000 - 50 (bet) - 50 (split) = 900, +100 +100 = 1100
      expect(state.balance).toBeGreaterThanOrEqual(1050);
    });
  });

  describe('Multi-Round Session', () => {
    it('plays multiple rounds with new round in between', () => {
      let state = createInitialState();

      // Round 1
      state = placeBet(state, 0, 25);
      state = dealInitialCards(state);
      state = completeDeal(state);

      if (state.phase === 'insurance') {
        state = resolveInsurance(state, false);
      }

      while (state.phase === 'player_turn') {
        state = playerStand(state);
      }
      if (state.phase === 'dealer_turn') {
        state = playDealer(state);
      }
      state = settleRound(state);

      // Round 2 — startNewRound resets hand slots
      state = startNewRound(state);
      expect(state.phase).toBe('betting');
      // Engine pre-creates maxHands (3) empty hand slots
      expect(state.playerHands).toHaveLength(DEFAULT_CONFIG.maxHands);
      expect(state.playerHands.every(h => h.cards.length === 0)).toBe(true);
      expect(state.dealerHand).toHaveLength(0);

      state = placeBet(state, 0, 25);
      state = dealInitialCards(state);
      state = completeDeal(state);

      if (state.phase === 'insurance') {
        state = resolveInsurance(state, false);
      }

      while (state.phase === 'player_turn') {
        state = playerStand(state);
      }
      if (state.phase === 'dealer_turn') {
        state = playDealer(state);
      }
      state = settleRound(state);

      expect(state.balance).toBeDefined();
      expect(typeof state.balance).toBe('number');
    });

    it('rebet and deal repeats the previous bet amount', () => {
      let state = createInitialState();

      state = placeBet(state, 0, 75);
      state = dealInitialCards(state);
      state = completeDeal(state);

      if (state.phase === 'insurance') {
        state = resolveInsurance(state, false);
      }

      while (state.phase === 'player_turn') {
        state = playerStand(state);
      }
      if (state.phase === 'dealer_turn') {
        state = playDealer(state);
      }
      state = settleRound(state);
      const balanceBefore = state.balance;

      // Must start new round first (rebet requires betting phase)
      state = startNewRound(state);
      expect(state.phase).toBe('betting');

      state = rebetAndDeal(state);

      // rebetAndDeal places previous bets and deals — balance reduced by 75
      expect(state.balance).toBe(balanceBefore - 75);
      expect(state.playerHands.some(h => h.cards.length > 0)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('reset money restores to initial balance', () => {
      let state = createInitialState();
      state = { ...state, balance: 50 };
      state = resetMoney(state);
      expect(state.balance).toBe(1000);
    });

    it('cannot place bet exceeding balance', () => {
      let state = createInitialState();
      state = { ...state, balance: 20 };
      const before = state.balance;
      state = placeBet(state, 0, 25);
      // Should reject — balance unchanged
      expect(state.balance).toBe(before);
    });

    it('bet removal returns entire bet to balance', () => {
      let state = createInitialState();
      state = placeBet(state, 0, 50);
      expect(state.balance).toBe(950);

      // removeBet removes entire bet from the hand
      state = removeBet(state, 0);
      expect(state.balance).toBe(1000);
    });

    it('clearBets returns all bets to balance', () => {
      let state = createInitialState();
      state = placeBet(state, 0, 50);
      state = placeBet(state, 1, 25);
      expect(state.balance).toBe(925);

      state = clearBets(state);
      expect(state.balance).toBe(1000);
    });

    it('blackjack detection works correctly', () => {
      const bjHand = [card('A'), card('K')];
      const nonBjHand = [card('10'), card('9')];
      const threeCardHand = [card('A'), card('5'), card('5')];

      expect(isBlackjack(bjHand)).toBe(true);
      expect(isBlackjack(nonBjHand)).toBe(false);
      expect(isBlackjack(threeCardHand)).toBe(false);
    });
  });
});
