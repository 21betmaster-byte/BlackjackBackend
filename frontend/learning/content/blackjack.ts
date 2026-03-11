// Blackjack Learning Content — ~27 cards covering rules, concepts, scenarios, tips, quizzes.

import { LearningCard, LearningContentProvider, SkillLevel } from '../types';

const cards: LearningCard[] = [
  // ── Rules (beginner + amateur) ──
  {
    id: 'bj_rule_goal',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 1,
    titleKey: 'learn.blackjack.goalTitle',
    bodyKey: 'learn.blackjack.goalBody',
    icon: 'flag',
  },
  {
    id: 'bj_rule_card_values',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 2,
    titleKey: 'learn.blackjack.cardValuesTitle',
    bodyKey: 'learn.blackjack.cardValuesBody',
    icon: 'style',
  },
  {
    id: 'bj_rule_round',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 3,
    titleKey: 'learn.blackjack.roundTitle',
    bodyKey: 'learn.blackjack.roundBody',
    icon: 'loop',
  },
  {
    id: 'bj_rule_hit_stand',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 4,
    titleKey: 'learn.blackjack.hitStandTitle',
    bodyKey: 'learn.blackjack.hitStandBody',
    icon: 'touch-app',
  },
  {
    id: 'bj_rule_blackjack',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 5,
    titleKey: 'learn.blackjack.blackjackTitle',
    bodyKey: 'learn.blackjack.blackjackBody',
    icon: 'star',
  },
  {
    id: 'bj_rule_dealer',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 6,
    titleKey: 'learn.blackjack.dealerRulesTitle',
    bodyKey: 'learn.blackjack.dealerRulesBody',
    icon: 'person',
  },
  {
    id: 'bj_rule_double',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 7,
    titleKey: 'learn.blackjack.doubleDownTitle',
    bodyKey: 'learn.blackjack.doubleDownBody',
    icon: 'add-circle',
  },
  {
    id: 'bj_rule_split',
    type: 'rule',
    levels: ['beginner', 'amateur'],
    order: 8,
    titleKey: 'learn.blackjack.splittingTitle',
    bodyKey: 'learn.blackjack.splittingBody',
    icon: 'call-split',
  },

  // ── Key Concepts (beginner only) ──
  {
    id: 'bj_concept_hard_soft',
    type: 'key_concept',
    levels: ['beginner'],
    order: 10,
    titleKey: 'learn.blackjack.hardSoftTitle',
    bodyKey: 'learn.blackjack.hardSoftBody',
    icon: 'swap-horiz',
  },
  {
    id: 'bj_concept_busting',
    type: 'key_concept',
    levels: ['beginner'],
    order: 11,
    titleKey: 'learn.blackjack.bustingTitle',
    bodyKey: 'learn.blackjack.bustingBody',
    icon: 'dangerous',
  },
  {
    id: 'bj_concept_push',
    type: 'key_concept',
    levels: ['beginner'],
    order: 12,
    titleKey: 'learn.blackjack.pushTitle',
    bodyKey: 'learn.blackjack.pushBody',
    icon: 'handshake',
  },

  // ── Scenarios ──
  {
    id: 'bj_scenario_easy_hit',
    type: 'scenario',
    levels: ['beginner', 'amateur'],
    order: 20,
    titleKey: 'learn.blackjack.easyHitTitle',
    bodyKey: 'learn.blackjack.easyHitBody',
    icon: 'casino',
    scenario: {
      playerCards: ['3', '5'],
      dealerUpCard: '10',
      correctActionKey: 'learn.blackjack.actionHit',
      explanationKey: 'learn.blackjack.easyHitExplanation',
    },
  },
  {
    id: 'bj_scenario_stand_strong',
    type: 'scenario',
    levels: ['beginner', 'amateur'],
    order: 21,
    titleKey: 'learn.blackjack.standStrongTitle',
    bodyKey: 'learn.blackjack.standStrongBody',
    icon: 'casino',
    scenario: {
      playerCards: ['10', '9'],
      dealerUpCard: '6',
      correctActionKey: 'learn.blackjack.actionStand',
      explanationKey: 'learn.blackjack.standStrongExplanation',
    },
  },
  {
    id: 'bj_scenario_tough_16',
    type: 'scenario',
    levels: [],
    order: 22,
    titleKey: 'learn.blackjack.tough16Title',
    bodyKey: 'learn.blackjack.tough16Body',
    icon: 'casino',
    scenario: {
      playerCards: ['10', '6'],
      dealerUpCard: '10',
      correctActionKey: 'learn.blackjack.actionHit',
      explanationKey: 'learn.blackjack.tough16Explanation',
    },
  },
  {
    id: 'bj_scenario_double_11',
    type: 'scenario',
    levels: ['amateur', 'pro'],
    order: 23,
    titleKey: 'learn.blackjack.double11Title',
    bodyKey: 'learn.blackjack.double11Body',
    icon: 'casino',
    scenario: {
      playerCards: ['5', '6'],
      dealerUpCard: '6',
      correctActionKey: 'learn.blackjack.actionDouble',
      explanationKey: 'learn.blackjack.double11Explanation',
    },
  },
  {
    id: 'bj_scenario_split_8s',
    type: 'scenario',
    levels: ['amateur', 'pro'],
    order: 24,
    titleKey: 'learn.blackjack.split8sTitle',
    bodyKey: 'learn.blackjack.split8sBody',
    icon: 'casino',
    scenario: {
      playerCards: ['8', '8'],
      dealerUpCard: '5',
      correctActionKey: 'learn.blackjack.actionSplit',
      explanationKey: 'learn.blackjack.split8sExplanation',
    },
  },
  {
    id: 'bj_scenario_never_split_10s',
    type: 'scenario',
    levels: ['amateur', 'pro'],
    order: 25,
    titleKey: 'learn.blackjack.neverSplit10sTitle',
    bodyKey: 'learn.blackjack.neverSplit10sBody',
    icon: 'casino',
    scenario: {
      playerCards: ['10', '10'],
      dealerUpCard: '7',
      correctActionKey: 'learn.blackjack.actionStand',
      explanationKey: 'learn.blackjack.neverSplit10sExplanation',
    },
  },
  {
    id: 'bj_scenario_soft_18',
    type: 'scenario',
    levels: ['pro'],
    order: 26,
    titleKey: 'learn.blackjack.soft18Title',
    bodyKey: 'learn.blackjack.soft18Body',
    icon: 'casino',
    scenario: {
      playerCards: ['A', '7'],
      dealerUpCard: '9',
      correctActionKey: 'learn.blackjack.actionHit',
      explanationKey: 'learn.blackjack.soft18Explanation',
    },
  },
  {
    id: 'bj_scenario_surrender',
    type: 'scenario',
    levels: ['pro'],
    order: 27,
    titleKey: 'learn.blackjack.surrenderTitle',
    bodyKey: 'learn.blackjack.surrenderBody',
    icon: 'casino',
    scenario: {
      playerCards: ['10', '6'],
      dealerUpCard: 'A',
      correctActionKey: 'learn.blackjack.actionSurrender',
      explanationKey: 'learn.blackjack.surrenderExplanation',
    },
  },

  // ── Tips ──
  {
    id: 'bj_tip_insurance',
    type: 'tip',
    levels: [],
    order: 30,
    titleKey: 'learn.blackjack.tipInsuranceTitle',
    bodyKey: 'learn.blackjack.tipInsuranceBody',
    icon: 'lightbulb',
  },
  {
    id: 'bj_tip_aces_eights',
    type: 'tip',
    levels: ['amateur', 'pro'],
    order: 31,
    titleKey: 'learn.blackjack.tipAcesEightsTitle',
    bodyKey: 'learn.blackjack.tipAcesEightsBody',
    icon: 'lightbulb',
  },
  {
    id: 'bj_tip_basic_strategy',
    type: 'tip',
    levels: [],
    order: 32,
    titleKey: 'learn.blackjack.tipBasicStrategyTitle',
    bodyKey: 'learn.blackjack.tipBasicStrategyBody',
    icon: 'lightbulb',
  },
  {
    id: 'bj_tip_bankroll',
    type: 'tip',
    levels: ['pro'],
    order: 33,
    titleKey: 'learn.blackjack.tipBankrollTitle',
    bodyKey: 'learn.blackjack.tipBankrollBody',
    icon: 'lightbulb',
  },

  // ── Quizzes ──
  {
    id: 'bj_quiz_total',
    type: 'quiz',
    levels: ['beginner'],
    order: 40,
    titleKey: 'learn.blackjack.quizTotalTitle',
    bodyKey: 'learn.blackjack.quizTotalBody',
    icon: 'quiz',
    quiz: {
      questionKey: 'learn.blackjack.quizTotalQuestion',
      options: [
        { labelKey: 'learn.blackjack.quizTotal17' },
        { labelKey: 'learn.blackjack.quizTotal18' },
        { labelKey: 'learn.blackjack.quizTotal27' },
      ],
      correctIndex: 0,
      explanationKey: 'learn.blackjack.quizTotalExplanation',
    },
  },
  {
    id: 'bj_quiz_13_vs_6',
    type: 'quiz',
    levels: [],
    order: 41,
    titleKey: 'learn.blackjack.quiz13vs6Title',
    bodyKey: 'learn.blackjack.quiz13vs6Body',
    icon: 'quiz',
    quiz: {
      questionKey: 'learn.blackjack.quiz13vs6Question',
      options: [
        { labelKey: 'learn.blackjack.quizOptionHit' },
        { labelKey: 'learn.blackjack.quizOptionStand' },
        { labelKey: 'learn.blackjack.quizOptionDouble' },
      ],
      correctIndex: 1,
      explanationKey: 'learn.blackjack.quiz13vs6Explanation',
    },
  },
  {
    id: 'bj_quiz_split_aces',
    type: 'quiz',
    levels: ['amateur', 'pro'],
    order: 42,
    titleKey: 'learn.blackjack.quizSplitAcesTitle',
    bodyKey: 'learn.blackjack.quizSplitAcesBody',
    icon: 'quiz',
    quiz: {
      questionKey: 'learn.blackjack.quizSplitAcesQuestion',
      options: [
        { labelKey: 'learn.blackjack.quizOptionSplit' },
        { labelKey: 'learn.blackjack.quizOptionHit' },
        { labelKey: 'learn.blackjack.quizOptionStand' },
      ],
      correctIndex: 0,
      explanationKey: 'learn.blackjack.quizSplitAcesExplanation',
    },
  },
  {
    id: 'bj_quiz_12_vs_2',
    type: 'quiz',
    levels: ['pro'],
    order: 43,
    titleKey: 'learn.blackjack.quiz12vs2Title',
    bodyKey: 'learn.blackjack.quiz12vs2Body',
    icon: 'quiz',
    quiz: {
      questionKey: 'learn.blackjack.quiz12vs2Question',
      options: [
        { labelKey: 'learn.blackjack.quizOptionHit' },
        { labelKey: 'learn.blackjack.quizOptionStand' },
      ],
      correctIndex: 0,
      explanationKey: 'learn.blackjack.quiz12vs2Explanation',
    },
  },
];

function filterAndSort(level: SkillLevel): LearningCard[] {
  return cards
    .filter(c => c.levels.length === 0 || c.levels.includes(level))
    .sort((a, b) => a.order - b.order);
}

export const blackjackLearningProvider: LearningContentProvider = {
  gameType: 'blackjack',
  gameNameKey: 'learn.blackjack.gameName',
  icon: 'casino',

  getCards(level: SkillLevel): LearningCard[] {
    return filterAndSort(level);
  },

  getAllCards(): LearningCard[] {
    return [...cards].sort((a, b) => a.order - b.order);
  },
};
