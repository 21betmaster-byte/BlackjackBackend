// Learning Framework — Game-agnostic types for the swipable learning card system.

export type SkillLevel = 'beginner' | 'amateur' | 'pro';

export type LearningCardType = 'rule' | 'scenario' | 'tip' | 'quiz' | 'key_concept';

export interface LearningCard {
  id: string;
  type: LearningCardType;
  /** Which levels see this card. Empty array = all levels. */
  levels: SkillLevel[];
  /** Ordering weight (lower = shown first). */
  order: number;
  /** i18n key for card title. */
  titleKey: string;
  /** i18n key for card body text. */
  bodyKey: string;
  /** MaterialIcons name. */
  icon: string;
  /** Accent color override. */
  accentColor?: string;
  /** Scenario-type card config. */
  scenario?: ScenarioConfig;
  /** Quiz-type card config. */
  quiz?: QuizConfig;
}

export interface ScenarioConfig {
  /** Player cards as rank strings (e.g. ['K', '6']). */
  playerCards: string[];
  /** Dealer upcard rank string (e.g. '10'). */
  dealerUpCard: string;
  /** Correct action label i18n key. */
  correctActionKey: string;
  /** i18n key for explanation. */
  explanationKey: string;
}

export interface QuizConfig {
  /** i18n key for the question. */
  questionKey: string;
  /** Answer options. */
  options: QuizOption[];
  /** Index of the correct answer. */
  correctIndex: number;
  /** i18n key for explanation after answering. */
  explanationKey: string;
}

export interface QuizOption {
  /** i18n key for option label. */
  labelKey: string;
}

export interface LearningContentProvider {
  /** Game identifier (matches GameAdapter.gameType). */
  gameType: string;
  /** i18n key for game name. */
  gameNameKey: string;
  /** MaterialIcons icon name. */
  icon: string;
  /** Get cards filtered and ordered for a given skill level. */
  getCards(level: SkillLevel): LearningCard[];
  /** Get all cards. */
  getAllCards(): LearningCard[];
}

export interface LearningProgress {
  gameType: string;
  skillLevel: SkillLevel;
  /** Card IDs the user has swiped right on. */
  completedCardIds: string[];
  /** Quiz results keyed by card ID. */
  quizResults: Record<string, { correct: boolean; answeredAt: number }>;
  /** Whether the full deck is completed. */
  completed: boolean;
  startedAt: number;
  completedAt: number | null;
}
