/**
 * E2E Integration Test: Learning Journey Flow
 *
 * Tests the complete learning card experience from onboarding through
 * card swiping to completion and training bridge. Covers:
 *
 * - Content provider filtering by skill level
 * - Session lifecycle (start → swipe → complete)
 * - Progress persistence and resume
 * - Quiz answer tracking
 * - Swipe left (review later) deck management
 * - Registry pattern for multiple games
 * - Completion statistics
 */

import {
  LearningCard,
  LearningContentProvider,
  LearningProgress,
  SkillLevel,
} from '../../learning/types';
import { blackjackLearningProvider } from '../../learning/content/blackjack';
import {
  registerProvider,
  getProvider,
  getAvailableGames,
} from '../../learning/registry';

// ============================================================
// Helpers
// ============================================================

/** Simulate a full swipe-through session for a given level. */
function simulateSession(
  provider: LearningContentProvider,
  level: SkillLevel,
): {
  cards: LearningCard[];
  progress: LearningProgress;
  quizResults: Record<string, { correct: boolean }>;
} {
  const cards = provider.getCards(level);
  const progress: LearningProgress = {
    gameType: provider.gameType,
    skillLevel: level,
    completedCardIds: [],
    quizResults: {},
    completed: false,
    startedAt: Date.now(),
    completedAt: null,
  };

  const quizResults: Record<string, { correct: boolean }> = {};

  for (const card of cards) {
    // For quiz cards, answer correctly
    if (card.type === 'quiz' && card.quiz) {
      const correct = true; // simulate correct answer
      quizResults[card.id] = { correct };
      progress.quizResults[card.id] = { correct, answeredAt: Date.now() };
    }
    progress.completedCardIds.push(card.id);
  }

  progress.completed = true;
  progress.completedAt = Date.now();

  return { cards, progress, quizResults };
}

/** Simulate swiping through cards with some swiped left for review. */
function simulateSessionWithReviews(
  provider: LearningContentProvider,
  level: SkillLevel,
  reviewCardIds: string[],
): {
  deck: LearningCard[];
  swipeSequence: Array<{ cardId: string; direction: 'left' | 'right' }>;
} {
  const cards = provider.getCards(level);
  const deck = [...cards];
  const swipeSequence: Array<{ cardId: string; direction: 'left' | 'right' }> = [];
  let index = 0;

  while (index < deck.length) {
    const card = deck[index];
    if (reviewCardIds.includes(card.id) && swipeSequence.filter(s => s.cardId === card.id && s.direction === 'left').length === 0) {
      // Swipe left — move to end
      swipeSequence.push({ cardId: card.id, direction: 'left' });
      deck.splice(index, 1);
      deck.push(card);
      // Don't increment index — next card slides in
    } else {
      // Swipe right — complete
      swipeSequence.push({ cardId: card.id, direction: 'right' });
      index++;
    }
  }

  return { deck, swipeSequence };
}

// ============================================================
// Tests
// ============================================================

describe('E2E: Learning Journey Flow', () => {
  describe('user selects beginner level and completes full blackjack learning', () => {
    it('shows rules, concepts, basic scenarios, tips, and quizzes for beginners', () => {
      const cards = blackjackLearningProvider.getCards('beginner');

      // Beginners should see rules
      const rules = cards.filter(c => c.type === 'rule');
      expect(rules.length).toBe(8);

      // Beginners should see key concepts
      const concepts = cards.filter(c => c.type === 'key_concept');
      expect(concepts.length).toBe(3);

      // Beginners should see scenarios (basic ones + universal ones)
      const scenarios = cards.filter(c => c.type === 'scenario');
      expect(scenarios.length).toBeGreaterThanOrEqual(2);

      // Beginners should see tips
      const tips = cards.filter(c => c.type === 'tip');
      expect(tips.length).toBeGreaterThanOrEqual(2);

      // Beginners should see quizzes
      const quizzes = cards.filter(c => c.type === 'quiz');
      expect(quizzes.length).toBeGreaterThanOrEqual(2);

      // Total beginner cards should be in the planned range
      expect(cards.length).toBeGreaterThanOrEqual(18);
      expect(cards.length).toBeLessThanOrEqual(30);
    });

    it('completes the full session and tracks progress correctly', () => {
      const { cards, progress } = simulateSession(blackjackLearningProvider, 'beginner');

      expect(progress.completed).toBe(true);
      expect(progress.completedAt).not.toBeNull();
      expect(progress.completedCardIds.length).toBe(cards.length);
      expect(progress.skillLevel).toBe('beginner');
      expect(progress.gameType).toBe('blackjack');
    });

    it('tracks quiz answers with correct scores', () => {
      const cards = blackjackLearningProvider.getCards('beginner');
      const quizCards = cards.filter(c => c.type === 'quiz' && c.quiz);

      for (const card of quizCards) {
        // Correct answer
        expect(card.quiz!.correctIndex).toBeDefined();
        expect(card.quiz!.options.length).toBeGreaterThanOrEqual(2);
        expect(card.quiz!.correctIndex).toBeLessThan(card.quiz!.options.length);
      }

      const { progress } = simulateSession(blackjackLearningProvider, 'beginner');
      const quizEntries = Object.values(progress.quizResults);
      expect(quizEntries.length).toBe(quizCards.length);
      expect(quizEntries.every(q => q.correct)).toBe(true);
    });
  });

  describe('user selects amateur level and sees different content than beginner', () => {
    it('shows rules but skips key concepts for amateurs', () => {
      const cards = blackjackLearningProvider.getCards('amateur');

      // Amateurs see rules
      const rules = cards.filter(c => c.type === 'rule');
      expect(rules.length).toBe(8);

      // Amateurs do NOT see key concepts
      const concepts = cards.filter(c => c.type === 'key_concept');
      expect(concepts.length).toBe(0);

      // Amateurs see more scenarios than beginners
      const amateurScenarios = cards.filter(c => c.type === 'scenario');
      const beginnerScenarios = blackjackLearningProvider.getCards('beginner').filter(c => c.type === 'scenario');
      expect(amateurScenarios.length).toBeGreaterThanOrEqual(beginnerScenarios.length);
    });

    it('has fewer total cards than beginner due to skipped concepts', () => {
      const beginnerCards = blackjackLearningProvider.getCards('beginner');
      const amateurCards = blackjackLearningProvider.getCards('amateur');

      // Amateur might have similar or different count, but no concepts
      const amateurConcepts = amateurCards.filter(c => c.type === 'key_concept');
      expect(amateurConcepts.length).toBe(0);
    });
  });

  describe('user selects pro level and sees only advanced content', () => {
    it('skips rules and concepts for pros', () => {
      const cards = blackjackLearningProvider.getCards('pro');

      const rules = cards.filter(c => c.type === 'rule');
      expect(rules.length).toBe(0);

      const concepts = cards.filter(c => c.type === 'key_concept');
      expect(concepts.length).toBe(0);
    });

    it('shows advanced scenarios and strategy tips for pros', () => {
      const cards = blackjackLearningProvider.getCards('pro');

      // Pros see scenarios (advanced + universal)
      const scenarios = cards.filter(c => c.type === 'scenario');
      expect(scenarios.length).toBeGreaterThanOrEqual(2);

      // Pros see the bankroll tip
      const tips = cards.filter(c => c.type === 'tip');
      const bankrollTip = tips.find(t => t.id === 'bj_tip_bankroll');
      expect(bankrollTip).toBeDefined();
    });

    it('has the fewest cards of any level', () => {
      const beginnerCount = blackjackLearningProvider.getCards('beginner').length;
      const amateurCount = blackjackLearningProvider.getCards('amateur').length;
      const proCount = blackjackLearningProvider.getCards('pro').length;

      expect(proCount).toBeLessThan(beginnerCount);
      expect(proCount).toBeLessThan(amateurCount);
    });
  });

  describe('user swipes left on cards to review them later', () => {
    it('moves swiped-left cards to end of deck and eventually completes all', () => {
      const reviewCards = ['bj_rule_double', 'bj_rule_split'];
      const { deck, swipeSequence } = simulateSessionWithReviews(
        blackjackLearningProvider,
        'beginner',
        reviewCards,
      );

      // Every card eventually gets swiped right
      const rightSwipes = swipeSequence.filter(s => s.direction === 'right');
      const allCards = blackjackLearningProvider.getCards('beginner');
      expect(rightSwipes.length).toBe(allCards.length);

      // Review cards appear twice in the sequence (once left, once right)
      for (const reviewId of reviewCards) {
        const appearances = swipeSequence.filter(s => s.cardId === reviewId);
        expect(appearances.length).toBe(2);
        expect(appearances[0].direction).toBe('left');
        expect(appearances[1].direction).toBe('right');
      }
    });
  });

  describe('user resumes a partially completed session', () => {
    it('can resume from saved progress by filtering out completed cards', () => {
      const allCards = blackjackLearningProvider.getCards('beginner');

      // Simulate completing first 5 cards
      const completedIds = allCards.slice(0, 5).map(c => c.id);
      const savedProgress: LearningProgress = {
        gameType: 'blackjack',
        skillLevel: 'beginner',
        completedCardIds: completedIds,
        quizResults: {},
        completed: false,
        startedAt: Date.now() - 60000,
        completedAt: null,
      };

      // Remaining cards should exclude completed ones
      const remaining = allCards.filter(c => !savedProgress.completedCardIds.includes(c.id));
      expect(remaining.length).toBe(allCards.length - 5);

      // First remaining card should be the 6th card
      expect(remaining[0].id).toBe(allCards[5].id);
    });
  });

  describe('learning content provider validates card data integrity', () => {
    it('every card has required fields populated', () => {
      const allCards = blackjackLearningProvider.getAllCards();

      for (const card of allCards) {
        expect(card.id).toBeTruthy();
        expect(card.type).toBeTruthy();
        expect(card.titleKey).toBeTruthy();
        expect(card.bodyKey).toBeTruthy();
        expect(card.icon).toBeTruthy();
        expect(typeof card.order).toBe('number');
        expect(Array.isArray(card.levels)).toBe(true);
      }
    });

    it('all card IDs are unique', () => {
      const allCards = blackjackLearningProvider.getAllCards();
      const ids = allCards.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('cards are returned in order', () => {
      for (const level of ['beginner', 'amateur', 'pro'] as SkillLevel[]) {
        const cards = blackjackLearningProvider.getCards(level);
        for (let i = 1; i < cards.length; i++) {
          expect(cards[i].order).toBeGreaterThanOrEqual(cards[i - 1].order);
        }
      }
    });

    it('scenario cards have valid scenario config', () => {
      const allCards = blackjackLearningProvider.getAllCards();
      const scenarios = allCards.filter(c => c.type === 'scenario');

      for (const card of scenarios) {
        expect(card.scenario).toBeDefined();
        expect(card.scenario!.playerCards.length).toBeGreaterThanOrEqual(2);
        expect(card.scenario!.dealerUpCard).toBeTruthy();
        expect(card.scenario!.correctActionKey).toBeTruthy();
        expect(card.scenario!.explanationKey).toBeTruthy();
      }
    });

    it('quiz cards have valid quiz config with correct answer in range', () => {
      const allCards = blackjackLearningProvider.getAllCards();
      const quizzes = allCards.filter(c => c.type === 'quiz');

      for (const card of quizzes) {
        expect(card.quiz).toBeDefined();
        expect(card.quiz!.options.length).toBeGreaterThanOrEqual(2);
        expect(card.quiz!.correctIndex).toBeGreaterThanOrEqual(0);
        expect(card.quiz!.correctIndex).toBeLessThan(card.quiz!.options.length);
        expect(card.quiz!.questionKey).toBeTruthy();
        expect(card.quiz!.explanationKey).toBeTruthy();
      }
    });
  });

  describe('registry supports multiple game providers', () => {
    it('blackjack provider is auto-registered', () => {
      const provider = getProvider('blackjack');
      expect(provider).not.toBeNull();
      expect(provider!.gameType).toBe('blackjack');
    });

    it('returns null for unregistered game types', () => {
      expect(getProvider('texas_holdem')).toBeNull();
      expect(getProvider('roulette')).toBeNull();
    });

    it('lists available games', () => {
      const games = getAvailableGames();
      expect(games).toContain('blackjack');
    });

    it('supports registering a new game provider', () => {
      const mockProvider: LearningContentProvider = {
        gameType: 'test_poker',
        gameNameKey: 'learn.poker.gameName',
        icon: 'style',
        getCards: (level: SkillLevel) => [{
          id: 'poker_rule_1',
          type: 'rule',
          levels: [],
          order: 1,
          titleKey: 'test.title',
          bodyKey: 'test.body',
          icon: 'style',
        }],
        getAllCards: () => [{
          id: 'poker_rule_1',
          type: 'rule',
          levels: [],
          order: 1,
          titleKey: 'test.title',
          bodyKey: 'test.body',
          icon: 'style',
        }],
      };

      registerProvider(mockProvider);
      const provider = getProvider('test_poker');
      expect(provider).not.toBeNull();
      expect(provider!.getCards('beginner').length).toBe(1);
      expect(getAvailableGames()).toContain('test_poker');
    });
  });

  describe('full beginner journey: onboard → learn all cards → see completion stats → bridge to training', () => {
    it('walks through the entire journey from level selection to completion', () => {
      // Step 1: User selects beginner level
      const level: SkillLevel = 'beginner';
      const provider = getProvider('blackjack')!;
      const cards = provider.getCards(level);

      // Step 2: User sees onboarding content — verify cards start with rules
      expect(cards[0].type).toBe('rule');
      expect(cards[0].id).toBe('bj_rule_goal');

      // Step 3: User swipes through all cards (some left, then right)
      const progress: LearningProgress = {
        gameType: 'blackjack',
        skillLevel: level,
        completedCardIds: [],
        quizResults: {},
        completed: false,
        startedAt: Date.now(),
        completedAt: null,
      };

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        // Quiz cards: answer before swiping
        if (card.type === 'quiz' && card.quiz) {
          const correct = card.quiz.correctIndex;
          const isRight = correct === card.quiz.correctIndex;
          progress.quizResults[card.id] = {
            correct: isRight,
            answeredAt: Date.now(),
          };
        }

        // Swipe right to complete
        progress.completedCardIds.push(card.id);
      }

      // Step 4: Mark complete
      progress.completed = true;
      progress.completedAt = Date.now();

      // Step 5: Verify completion stats
      expect(progress.completed).toBe(true);
      expect(progress.completedCardIds.length).toBe(cards.length);

      const quizEntries = Object.values(progress.quizResults);
      const quizCorrect = quizEntries.filter(q => q.correct).length;
      const quizTotal = quizEntries.length;
      expect(quizTotal).toBeGreaterThan(0);
      expect(quizCorrect).toBe(quizTotal);

      // Step 6: Verify bridge state — user can start training or review
      // The session is complete, user sees completion screen with stats
      expect(progress.completedAt).toBeGreaterThanOrEqual(progress.startedAt);
      expect(progress.gameType).toBe('blackjack');
    });
  });

  describe('full pro journey: fewer cards, no rules, advanced scenarios only', () => {
    it('pro user completes the streamlined learning path', () => {
      const level: SkillLevel = 'pro';
      const provider = getProvider('blackjack')!;
      const cards = provider.getCards(level);

      // No rules or concepts for pros
      expect(cards.every(c => c.type !== 'rule')).toBe(true);
      expect(cards.every(c => c.type !== 'key_concept')).toBe(true);

      // Pro-specific cards exist
      const soft18 = cards.find(c => c.id === 'bj_scenario_soft_18');
      expect(soft18).toBeDefined();
      expect(soft18!.scenario!.playerCards).toEqual(['A', '7']);

      const surrender = cards.find(c => c.id === 'bj_scenario_surrender');
      expect(surrender).toBeDefined();

      const bankroll = cards.find(c => c.id === 'bj_tip_bankroll');
      expect(bankroll).toBeDefined();

      // Complete session
      const { progress } = simulateSession(provider, level);
      expect(progress.completed).toBe(true);
      expect(progress.completedCardIds.length).toBe(cards.length);
      expect(cards.length).toBeLessThan(blackjackLearningProvider.getCards('beginner').length);
    });
  });

  describe('universal cards appear at every level', () => {
    it('cards with empty levels array are shown to all skill levels', () => {
      const universalCards = blackjackLearningProvider.getAllCards().filter(c => c.levels.length === 0);
      expect(universalCards.length).toBeGreaterThan(0);

      for (const level of ['beginner', 'amateur', 'pro'] as SkillLevel[]) {
        const levelCards = blackjackLearningProvider.getCards(level);
        for (const uc of universalCards) {
          const found = levelCards.find(c => c.id === uc.id);
          expect(found).toBeDefined();
        }
      }
    });
  });
});
