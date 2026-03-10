// Training Framework — Game-Agnostic Type Definitions
// All interfaces and types used across the training system.
// No implementation code — this is the contract layer.

// ============================================================
// Decision Tracking
// ============================================================

/** Category of a training decision. Game adapters define their own string values. */
export type DecisionCategory = string;

/** A single decision point during gameplay. */
export interface TrainingDecision {
  /** Unique identifier */
  id: string;
  /** When the decision was made */
  timestamp: number;
  /** Game-specific category (e.g., 'hard_total', 'pair_split') */
  category: DecisionCategory;
  /** Canonical key for grouping identical scenarios (e.g., 'hard_16_vs_10') */
  scenarioKey: string;
  /** Human-readable scenario description (e.g., 'Hard 16 vs Dealer 10') */
  scenarioDescription: string;
  /** What the player chose */
  userAction: string;
  /** What basic strategy recommends */
  optimalAction: string;
  /** Whether the player chose correctly */
  isCorrect: boolean;
  /** Explanation of why the optimal action is correct */
  explanation: string;
  /** Game-specific context data (cards, hand details, round info) */
  context: Record<string, unknown>;
}

// ============================================================
// Session Analytics
// ============================================================

/** Aggregated stats for a single decision category within a session. */
export interface CategoryStats {
  category: DecisionCategory;
  total: number;
  correct: number;
  accuracy: number; // 0–1
  /** Breakdown by specific scenario within this category */
  scenarioBreakdown: Record<string, { total: number; correct: number }>;
}

/** Summary of an entire training session. */
export interface TrainingSessionSummary {
  sessionId: string;
  gameType: string;
  startedAt: number;
  endedAt: number | null;
  roundsPlayed: number;
  totalDecisions: number;
  correctDecisions: number;
  overallAccuracy: number; // 0–1
  categoryStats: CategoryStats[];
  currentStreak: number;
  bestStreak: number;
  /** Top 3 weakest categories, sorted worst-first */
  weakestCategories: DecisionCategory[];
}

/** Internal session state. Mutable over the lifetime of a session. */
export interface TrainingSessionState {
  sessionId: string;
  gameType: string;
  startedAt: number;
  endedAt: number | null;
  decisions: TrainingDecision[];
  currentStreak: number;
  bestStreak: number;
}

// ============================================================
// Progress Tracking (cross-session)
// ============================================================

/** A point-in-time accuracy snapshot taken at the end of a session. */
export interface ProgressSnapshot {
  timestamp: number;
  sessionId: string;
  overallAccuracy: number;
  /** Per-category accuracy at this point in time */
  categoryAccuracies: Record<DecisionCategory, number>;
  totalDecisions: number;
  totalCorrect: number;
}

/** Timeline of progress snapshots for a game type. */
export interface ProgressTimeline {
  gameType: string;
  /** Ordered chronologically (oldest first) */
  snapshots: ProgressSnapshot[];
}

/** Tracks how a single category's accuracy evolves over time. */
export interface WeaknessEvolution {
  category: DecisionCategory;
  dataPoints: Array<{
    timestamp: number;
    accuracy: number;
    sampleSize: number;
  }>;
  /** Computed trend: improving (>5% gain), declining (>5% loss), or stable */
  trend: 'improving' | 'declining' | 'stable';
}

/** Money-related performance metrics. */
export interface MoneyMetrics {
  /** Estimated dollars saved per hour by playing closer to optimal strategy */
  estimatedSavingsPerHour: number;
  /** Total hands where every decision was correct */
  totalHandsOptimal: number;
  /** EV improvement as a decimal (e.g., 0.02 = 2% improvement in expected value) */
  expectedValueImprovement: number;
}

/** Full dashboard data for the progress view. */
export interface ProgressDashboardData {
  timeline: ProgressTimeline;
  milestones: Milestone[];
  weaknessEvolutions: WeaknessEvolution[];
  moneyMetrics: MoneyMetrics;
  /** Estimated hands remaining until 95%+ accuracy (null if already there or insufficient data) */
  handsToMastery: number | null;
}

// ============================================================
// Milestones / Achievements
// ============================================================

export type MilestoneType =
  | 'first_perfect_round'
  | 'accuracy_50'
  | 'accuracy_75'
  | 'accuracy_90'
  | 'accuracy_95'
  | 'streak_10'
  | 'streak_25'
  | 'streak_50'
  | 'streak_100'
  | 'hands_100'
  | 'hands_500'
  | 'hands_1000'
  | 'category_mastered'
  | 'zero_mistakes_session'
  | 'comeback'
  | 'consistency';

export interface Milestone {
  id: string;
  type: MilestoneType;
  name: string;
  description: string;
  /** MaterialIcons name for display */
  icon: string;
  /** When the milestone was unlocked (null if locked) */
  unlockedAt: number | null;
  /** Optional: extra context (e.g., which category was mastered) */
  detail?: string;
}

// ============================================================
// Game Adapter Interface
// ============================================================

/**
 * Interface each game must implement to integrate with the training framework.
 * The adapter translates game-specific state and actions into the generic
 * training decision protocol.
 *
 * TGameState: the game's state type (e.g., GameState from engine.ts)
 * TAction: the game's action type (e.g., 'hit' | 'stand' | 'double' | 'split')
 */
export interface GameAdapter<TGameState = unknown, TAction = string> {
  /** Unique game identifier (e.g., 'blackjack', 'texas_holdem') */
  gameType: string;

  /** Is the current game state a decision point that should be evaluated? */
  isDecisionPoint(gameState: TGameState): boolean;

  /**
   * Given the current game state, return the optimal action and all metadata
   * needed to create a TrainingDecision. Returns null if not a decision point.
   */
  getOptimalAction(gameState: TGameState): {
    action: TAction;
    category: DecisionCategory;
    scenarioKey: string;
    scenarioDescription: string;
    explanation: string;
    context: Record<string, unknown>;
  } | null;

  /** Convert a game-specific action to the canonical string used for comparison. */
  normalizeAction(action: TAction): string;
}

// ============================================================
// Storage Interface
// ============================================================

export interface TrainingStore {
  saveSession(session: TrainingSessionState): Promise<void>;
  loadSession(sessionId: string): Promise<TrainingSessionState | null>;
  listSessions(gameType: string, limit?: number): Promise<TrainingSessionSummary[]>;
  getLifetimeStats(gameType: string): Promise<TrainingSessionSummary | null>;
  saveProgressSnapshot(snapshot: ProgressSnapshot, gameType: string): Promise<void>;
  getProgressTimeline(gameType: string): Promise<ProgressTimeline>;
  saveMilestones(milestones: Milestone[]): Promise<void>;
  getMilestones(): Promise<Milestone[]>;
  clearAll(): Promise<void>;
}
