// Blackjack Game Engine — Pure TypeScript, no React dependencies

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Card = { suit: Suit; rank: Rank; faceUp: boolean };
export type HandStatus = 'active' | 'stood' | 'busted' | 'blackjack' | 'doubled';
export type Hand = {
  cards: Card[];
  bet: number;
  status: HandStatus;
  isDoubled: boolean;
  splitFrom?: number;
};
export type GamePhase = 'betting' | 'dealing' | 'insurance' | 'player_turn' | 'dealer_turn' | 'settlement' | 'shuffling';
export type HandResult = 'win' | 'loss' | 'push' | 'blackjack' | 'busted';
export type RoundResult = {
  handResults: { handIndex: number; result: HandResult; payout: number }[];
  totalPayout: number;
  mistakes: number;
};

export type GameConfig = {
  deckCount: number;
  startingBalance: number;
  maxBet: number;
  minBet: number;
  maxHands: number;
  blackjackPayout: number;
  reshuffleThreshold: number;
  dealerHitsSoft17: boolean;
};

export const DEFAULT_CONFIG: GameConfig = {
  deckCount: 8,
  startingBalance: 1000,
  maxBet: 100,
  minBet: 5,
  maxHands: 3,
  blackjackPayout: 1.5,
  reshuffleThreshold: 0.25,
  dealerHitsSoft17: false,
};

export type GameState = {
  shoe: Card[];
  discardPile: Card[];
  dealerHand: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  phase: GamePhase;
  balance: number;
  insuranceBet: number;
  roundResult: RoundResult | null;
  config: GameConfig;
};

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createShoe(numDecks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank, faceUp: true });
      }
    }
  }
  return shuffleArray(cards);
}

export function shouldReshuffle(shoe: Card[], config: GameConfig = DEFAULT_CONFIG): boolean {
  const totalCards = config.deckCount * 52;
  return shoe.length < totalCards * config.reshuffleThreshold;
}

export function dealCard(shoe: Card[], faceUp: boolean = true): { card: Card; shoe: Card[] } {
  const newShoe = [...shoe];
  const card = { ...newShoe.pop()!, faceUp };
  return { card, shoe: newShoe };
}

export function scoreHand(cards: Card[]): { total: number; soft: boolean; display: string } {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    const val = cardValue(card.rank);
    total += val;
    if (card.rank === 'A') aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  const soft = aces > 0 && total <= 21;
  const hardTotal = soft ? total - 10 : total;

  let display: string;
  if (soft && hardTotal !== total) {
    display = `${hardTotal} or ${total}`;
  } else {
    display = `${total}`;
  }

  return { total, soft, display };
}

export function isBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  const { total } = scoreHand(cards);
  return total === 21;
}

export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cards[0].rank === cards[1].rank;
}

export function canSplit(hand: Hand, allHands: Hand[], config: GameConfig = DEFAULT_CONFIG): boolean {
  return isPair(hand.cards) && hand.status === 'active' && allHands.length < 4;
}

export function canDouble(hand: Hand): boolean {
  return hand.cards.length === 2 && hand.status === 'active';
}

export function createInitialState(config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    shoe: createShoe(config.deckCount),
    discardPile: [],
    dealerHand: [],
    playerHands: [],
    activeHandIndex: 0,
    phase: 'betting',
    balance: config.startingBalance,
    insuranceBet: 0,
    roundResult: null,
    config,
  };
}

export function placeBet(state: GameState, handIndex: number, amount: number): GameState {
  if (state.phase !== 'betting') return state;
  if (amount > state.balance) return state;
  if (amount > state.config.maxBet) return state;

  const newHands = [...state.playerHands];
  if (handIndex < newHands.length) {
    const newBet = newHands[handIndex].bet + amount;
    if (newBet > state.config.maxBet) return state;
    newHands[handIndex] = { ...newHands[handIndex], bet: newBet };
  } else if (newHands.length < state.config.maxHands) {
    newHands.push({ cards: [], bet: amount, status: 'active', isDoubled: false });
  } else {
    return state;
  }

  return { ...state, playerHands: newHands, balance: state.balance - amount };
}

export function removeBet(state: GameState, handIndex: number): GameState {
  if (state.phase !== 'betting') return state;
  if (handIndex >= state.playerHands.length) return state;

  const hand = state.playerHands[handIndex];
  const newHands = state.playerHands.filter((_, i) => i !== handIndex);
  return { ...state, playerHands: newHands, balance: state.balance + hand.bet };
}

export function dealInitialCards(state: GameState): GameState {
  if (state.phase !== 'betting') return state;
  if (state.playerHands.length === 0 || state.playerHands.every(h => h.bet === 0)) return state;

  let shoe = [...state.shoe];
  const hands = state.playerHands.map(h => ({ ...h, cards: [] as Card[] }));
  const dealerHand: Card[] = [];

  // Deal two rounds
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < hands.length; i++) {
      const result = dealCard(shoe);
      hands[i].cards.push(result.card);
      shoe = result.shoe;
    }
    // Dealer: first card face up, second face down
    const dealerResult = dealCard(shoe, round === 0);
    dealerHand.push(dealerResult.card);
    shoe = dealerResult.shoe;
  }

  // Check for player blackjacks
  for (let i = 0; i < hands.length; i++) {
    if (isBlackjack(hands[i].cards)) {
      hands[i].status = 'blackjack';
    }
  }

  let phase: GamePhase = 'player_turn';
  let activeHandIndex = 0;

  // Skip hands that have blackjack
  while (activeHandIndex < hands.length && hands[activeHandIndex].status !== 'active') {
    activeHandIndex++;
  }

  // If all hands are blackjack, go to dealer turn
  if (activeHandIndex >= hands.length) {
    phase = 'dealer_turn';
    activeHandIndex = 0;
  }

  return { ...state, shoe, dealerHand, playerHands: hands, phase, activeHandIndex };
}

export function checkDealerPeek(state: GameState): { hasBlackjack: boolean; offerInsurance: boolean } {
  if (state.dealerHand.length < 2) return { hasBlackjack: false, offerInsurance: false };

  const upCard = state.dealerHand[0];
  const holeCard = state.dealerHand[1];

  if (upCard.rank === 'A') {
    // Check hole card for blackjack
    const revealedHand = state.dealerHand.map(c => ({ ...c, faceUp: true }));
    return { hasBlackjack: isBlackjack(revealedHand), offerInsurance: true };
  }

  if (cardValue(upCard.rank) === 10) {
    const revealedHand = state.dealerHand.map(c => ({ ...c, faceUp: true }));
    return { hasBlackjack: isBlackjack(revealedHand), offerInsurance: false };
  }

  return { hasBlackjack: false, offerInsurance: false };
}

export function resolveInsurance(state: GameState, accepted: boolean): GameState {
  if (!accepted) return { ...state, phase: 'player_turn', insuranceBet: 0 };

  // Insurance costs half the original bet of the first hand
  const insuranceCost = Math.floor(state.playerHands[0].bet / 2);
  if (insuranceCost > state.balance) return { ...state, phase: 'player_turn', insuranceBet: 0 };

  return {
    ...state,
    balance: state.balance - insuranceCost,
    insuranceBet: insuranceCost,
    phase: 'player_turn',
  };
}

function advanceToNextHand(state: GameState): GameState {
  let nextIndex = state.activeHandIndex + 1;
  while (nextIndex < state.playerHands.length && state.playerHands[nextIndex].status !== 'active') {
    nextIndex++;
  }

  if (nextIndex >= state.playerHands.length) {
    return { ...state, activeHandIndex: 0, phase: 'dealer_turn' };
  }

  return { ...state, activeHandIndex: nextIndex };
}

export function playerHit(state: GameState): GameState {
  if (state.phase !== 'player_turn') return state;
  const hand = state.playerHands[state.activeHandIndex];
  if (hand.status !== 'active') return state;

  const { card, shoe } = dealCard(state.shoe);
  const newCards = [...hand.cards, card];
  const { total } = scoreHand(newCards);

  const newHands = [...state.playerHands];
  newHands[state.activeHandIndex] = {
    ...hand,
    cards: newCards,
    status: total > 21 ? 'busted' : total === 21 ? 'stood' : 'active',
  };

  let newState = { ...state, shoe, playerHands: newHands };

  if (newHands[state.activeHandIndex].status !== 'active') {
    newState = advanceToNextHand(newState);
  }

  return newState;
}

export function playerStand(state: GameState): GameState {
  if (state.phase !== 'player_turn') return state;
  const hand = state.playerHands[state.activeHandIndex];
  if (hand.status !== 'active') return state;

  const newHands = [...state.playerHands];
  newHands[state.activeHandIndex] = { ...hand, status: 'stood' };

  return advanceToNextHand({ ...state, playerHands: newHands });
}

export function playerDouble(state: GameState): GameState {
  if (state.phase !== 'player_turn') return state;
  const hand = state.playerHands[state.activeHandIndex];
  if (!canDouble(hand)) return state;
  if (hand.bet > state.balance) return state;

  const { card, shoe } = dealCard(state.shoe);
  const newCards = [...hand.cards, card];
  const { total } = scoreHand(newCards);

  const newHands = [...state.playerHands];
  newHands[state.activeHandIndex] = {
    ...hand,
    cards: newCards,
    bet: hand.bet * 2,
    isDoubled: true,
    status: total > 21 ? 'busted' : 'doubled',
  };

  let newState = { ...state, shoe, playerHands: newHands, balance: state.balance - hand.bet };
  return advanceToNextHand(newState);
}

export function playerSplit(state: GameState): GameState {
  if (state.phase !== 'player_turn') return state;
  const hand = state.playerHands[state.activeHandIndex];
  if (!canSplit(hand, state.playerHands, state.config)) return state;
  if (hand.bet > state.balance) return state;

  let shoe = state.shoe;

  // Create two new hands from the pair
  const { card: card1, shoe: shoe1 } = dealCard(shoe);
  shoe = shoe1;
  const { card: card2, shoe: shoe2 } = dealCard(shoe);
  shoe = shoe2;

  const hand1: Hand = {
    cards: [hand.cards[0], card1],
    bet: hand.bet,
    status: 'active',
    isDoubled: false,
    splitFrom: state.activeHandIndex,
  };

  const hand2: Hand = {
    cards: [hand.cards[1], card2],
    bet: hand.bet,
    status: 'active',
    isDoubled: false,
    splitFrom: state.activeHandIndex,
  };

  // Check for 21 on split hands (not blackjack, just 21)
  if (scoreHand(hand1.cards).total === 21) hand1.status = 'stood';
  if (scoreHand(hand2.cards).total === 21) hand2.status = 'stood';

  const newHands = [...state.playerHands];
  newHands.splice(state.activeHandIndex, 1, hand1, hand2);

  let newState = {
    ...state,
    shoe,
    playerHands: newHands,
    balance: state.balance - hand.bet,
  };

  // If current hand is stood (21), advance
  if (newHands[state.activeHandIndex].status !== 'active') {
    newState = advanceToNextHand(newState);
  }

  return newState;
}

export function playDealer(state: GameState): GameState {
  if (state.phase !== 'dealer_turn') return state;

  // Flip hole card
  let dealerHand = state.dealerHand.map(c => ({ ...c, faceUp: true }));
  let shoe = [...state.shoe];

  // Check if all player hands busted — dealer doesn't need to draw
  const allBusted = state.playerHands.every(h => h.status === 'busted');
  if (allBusted) {
    return { ...state, dealerHand, phase: 'settlement' };
  }

  // Dealer draws until 17+
  let score = scoreHand(dealerHand);
  while (score.total < 17 || (state.config.dealerHitsSoft17 && score.total === 17 && score.soft)) {
    const result = dealCard(shoe);
    dealerHand = [...dealerHand, result.card];
    shoe = result.shoe;
    score = scoreHand(dealerHand);
  }

  return { ...state, dealerHand, shoe, phase: 'settlement' };
}

export function settleRound(state: GameState, mistakes: number = 0): GameState {
  if (state.phase !== 'settlement') return state;

  const dealerScore = scoreHand(state.dealerHand).total;
  const dealerBusted = dealerScore > 21;
  const dealerBlackjack = isBlackjack(state.dealerHand);

  const handResults: RoundResult['handResults'] = [];
  let totalPayout = 0;

  for (let i = 0; i < state.playerHands.length; i++) {
    const hand = state.playerHands[i];
    const playerScore = scoreHand(hand.cards).total;

    let result: HandResult;
    let payout = 0;

    if (hand.status === 'busted') {
      result = 'busted';
      payout = 0; // Bet already lost
    } else if (hand.status === 'blackjack') {
      if (dealerBlackjack) {
        result = 'push';
        payout = hand.bet; // Return bet
      } else {
        result = 'blackjack';
        payout = hand.bet + Math.floor(hand.bet * state.config.blackjackPayout); // Configurable payout
      }
    } else if (dealerBusted) {
      result = 'win';
      payout = hand.bet * 2; // 1:1 payout
    } else if (playerScore > dealerScore) {
      result = 'win';
      payout = hand.bet * 2;
    } else if (playerScore === dealerScore) {
      result = 'push';
      payout = hand.bet;
    } else {
      result = 'loss';
      payout = 0;
    }

    handResults.push({ handIndex: i, result, payout });
    totalPayout += payout;
  }

  // Insurance payout: if dealer has blackjack and player took insurance
  if (dealerBlackjack && state.insuranceBet > 0) {
    totalPayout += state.insuranceBet * 3; // 2:1 pays back original + 2x
  }

  const roundResult: RoundResult = { handResults, totalPayout, mistakes };

  // Move dealt cards to discard pile
  let discardPile = [...state.discardPile];
  for (const hand of state.playerHands) {
    discardPile.push(...hand.cards);
  }
  discardPile.push(...state.dealerHand);

  return {
    ...state,
    balance: state.balance + totalPayout,
    roundResult,
    discardPile,
    phase: 'settlement',
  };
}

export function startNewRound(state: GameState): GameState {
  let shoe = state.shoe;
  let discardPile = state.discardPile;

  if (shouldReshuffle(shoe, state.config)) {
    shoe = createShoe(state.config.deckCount);
    discardPile = [];
  }

  return {
    ...state,
    shoe,
    discardPile,
    dealerHand: [],
    playerHands: [],
    activeHandIndex: 0,
    phase: 'betting',
    insuranceBet: 0,
    roundResult: null,
  };
}

export function formatCardShort(card: Card): string {
  const suitMap: Record<Suit, string> = { hearts: 'h', diamonds: 'd', clubs: 'c', spades: 's' };
  return `${card.rank}${suitMap[card.suit]}`;
}
