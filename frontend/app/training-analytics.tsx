import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import IconButton from '../components/ui/IconButton';
import SegmentedControl from '../components/ui/SegmentedControl';
import { useProgress } from '../training/useProgress';
import { getAllMilestoneStates } from '../training/milestones';
import {
  Milestone,
  WeaknessEvolution,
  CategoryStats,
  TrainingSessionSummary,
} from '../training/types';
import { trainingStore } from '../training/storage';
import { computeSummary, mergeSummaries } from '../training/analytics';

type Tab = 'session' | 'progress' | 'milestones';

export default function TrainingAnalyticsScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('session');
  const progress = useProgress('blackjack');
  const [lifetimeStats, setLifetimeStats] = useState<TrainingSessionSummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<TrainingSessionSummary[]>([]);

  useEffect(() => {
    loadSessionData();
  }, []);

  const loadSessionData = async () => {
    try {
      // Try backend first, fall back to local storage
      let backendSummary: TrainingSessionSummary | null = null;
      if (token) {
        try {
          const resp = await axios.get(`${API_URL}/training/summary?game_type=blackjack`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = resp.data;
          if (data && data.total_decisions > 0) {
            backendSummary = {
              sessionId: 'backend-aggregate',
              gameType: 'blackjack',
              startedAt: Date.now(),
              endedAt: null,
              roundsPlayed: 0,
              totalDecisions: data.total_decisions,
              correctDecisions: data.correct_decisions,
              overallAccuracy: data.overall_accuracy,
              categoryStats: (data.category_stats ?? []).map((cs: any) => ({
                category: cs.category,
                total: cs.total,
                correct: cs.correct,
                accuracy: cs.accuracy,
                scenarioBreakdown: {},
              })),
              currentStreak: 0,
              bestStreak: 0,
              weakestCategories: data.weakest_categories ?? [],
            };
          }
        } catch {
          // Backend unavailable — fall back to local
        }
      }

      const [localLifetime, sessions] = await Promise.all([
        trainingStore.getLifetimeStats('blackjack'),
        trainingStore.listSessions('blackjack', 20),
      ]);

      // Prefer backend summary if it has more data; otherwise use local
      if (backendSummary && backendSummary.totalDecisions >= (localLifetime?.totalDecisions ?? 0)) {
        setLifetimeStats(backendSummary);
      } else {
        setLifetimeStats(localLifetime);
      }
      setRecentSessions(sessions);
    } catch (err) {
      console.warn('Failed to load session data:', err);
    }
  };

  const segments = [
    { value: 'session', label: t('training.thisSession') },
    { value: 'progress', label: t('training.progress') },
    { value: 'milestones', label: t('training.milestones') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            iconColor="#fff"
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>{t('training.analytics')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <SegmentedControl
          options={segments}
          selectedValue={tab}
          onSelect={(v) => setTab(v as Tab)}
          style={styles.segmentedControl}
        />

        {progress.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#11d4c4" size="large" />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {tab === 'session' && (
              <SessionTab lifetimeStats={lifetimeStats} t={t} />
            )}
            {tab === 'progress' && (
              <ProgressTab
                dashboard={progress.dashboard}
                recentSessions={recentSessions}
                t={t}
              />
            )}
            {tab === 'milestones' && (
              <MilestonesTab
                allMilestones={progress.allMilestones}
                t={t}
              />
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// Session Tab
// ============================================================

function SessionTab({
  lifetimeStats,
  t,
}: {
  lifetimeStats: TrainingSessionSummary | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!lifetimeStats || lifetimeStats.totalDecisions === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="psychology" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyText}>{t('training.noDataYet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* Big accuracy circle */}
      <View style={styles.accuracyCircle}>
        <Text style={styles.accuracyValue}>
          {Math.round(lifetimeStats.overallAccuracy * 100)}%
        </Text>
        <Text style={styles.accuracyLabel}>{t('training.accuracy')}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatBox
          label={t('training.decisions')}
          value={lifetimeStats.totalDecisions.toString()}
        />
        <StatBox
          label={t('training.correct')}
          value={lifetimeStats.correctDecisions.toString()}
        />
        <StatBox
          label={t('training.bestStreak')}
          value={lifetimeStats.bestStreak.toString()}
        />
      </View>

      {/* Category breakdown */}
      <Text style={styles.sectionTitle}>{t('training.categoryBreakdown')}</Text>
      {lifetimeStats.categoryStats.map((cs) => (
        <CategoryBar key={cs.category} stats={cs} t={t} />
      ))}

      {/* Weakest areas */}
      {lifetimeStats.weakestCategories.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('training.weakestAreas')}</Text>
          {lifetimeStats.weakestCategories.map((cat) => {
            const cs = lifetimeStats.categoryStats.find(c => c.category === cat);
            return cs ? (
              <View key={cat} style={styles.weaknessRow}>
                <MaterialIcons name="warning" size={16} color="#e53e3e" />
                <Text style={styles.weaknessText}>
                  {formatCategoryName(cat, t)} — {Math.round(cs.accuracy * 100)}%
                </Text>
              </View>
            ) : null;
          })}
        </>
      )}
    </View>
  );
}

// ============================================================
// Progress Tab
// ============================================================

function ProgressTab({
  dashboard,
  recentSessions,
  t,
}: {
  dashboard: import('../training/types').ProgressDashboardData | null;
  recentSessions: TrainingSessionSummary[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!dashboard || dashboard.timeline.snapshots.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="trending-up" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyText}>{t('training.noDataYet')}</Text>
      </View>
    );
  }

  const snapshots = dashboard.timeline.snapshots;

  return (
    <View style={styles.tabContent}>
      {/* Accuracy trend (bar chart) */}
      <Text style={styles.sectionTitle}>{t('training.accuracy')} — {t('training.sessionHistory')}</Text>
      <View style={styles.trendChart}>
        {snapshots.slice(-15).map((snap, i) => {
          const pct = Math.round(snap.overallAccuracy * 100);
          return (
            <View key={i} style={styles.trendBarWrapper}>
              <Text style={styles.trendBarLabel}>{pct}%</Text>
              <View style={[styles.trendBar, { height: Math.max(4, pct * 1.2) }]} />
            </View>
          );
        })}
      </View>

      {/* Weakness evolution */}
      {dashboard.weaknessEvolutions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('training.categoryBreakdown')}</Text>
          {dashboard.weaknessEvolutions.map((we) => (
            <WeaknessEvolutionRow key={we.category} evolution={we} t={t} />
          ))}
        </>
      )}

      {/* Money metrics card */}
      <View style={styles.moneyCard}>
        <Text style={styles.moneyCardTitle}>{t('training.estimatedSavings')}</Text>
        <Text style={styles.moneyCardValue}>
          ${dashboard.moneyMetrics.estimatedSavingsPerHour.toFixed(2)}/hr
        </Text>
        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>{t('training.handsOptimal')}</Text>
          <Text style={styles.moneyValue}>{dashboard.moneyMetrics.totalHandsOptimal}</Text>
        </View>
        {dashboard.handsToMastery !== null && (
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>{t('training.handsToMastery')}</Text>
            <Text style={styles.moneyValue}>~{dashboard.handsToMastery}</Text>
          </View>
        )}
      </View>

      {/* Session history */}
      {recentSessions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('training.sessionHistory')}</Text>
          {recentSessions.slice(0, 10).map((ses, i) => (
            <View key={i} style={styles.sessionHistoryRow}>
              <Text style={styles.sessionDate}>
                {new Date(ses.startedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.sessionAccuracy}>
                {Math.round(ses.overallAccuracy * 100)}%
              </Text>
              <Text style={styles.sessionDecisions}>
                {t('training.decisionsMade', { count: ses.totalDecisions })}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ============================================================
// Milestones Tab
// ============================================================

function MilestonesTab({
  allMilestones,
  t,
}: {
  allMilestones: Milestone[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const milestoneStates = getAllMilestoneStates(allMilestones);
  const unlocked = milestoneStates.filter(m => m.unlockedAt !== null);
  const locked = milestoneStates.filter(m => m.unlockedAt === null);

  return (
    <View style={styles.tabContent}>
      {unlocked.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('training.unlocked')} ({unlocked.length})</Text>
          <View style={styles.milestoneGrid}>
            {unlocked.map((m) => (
              <MilestoneBadge key={m.id} milestone={m} />
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>{t('training.locked')} ({locked.length})</Text>
      <View style={styles.milestoneGrid}>
        {locked.map((m) => (
          <MilestoneBadge key={m.id} milestone={m} />
        ))}
      </View>
    </View>
  );
}

// ============================================================
// Shared Sub-components
// ============================================================

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function CategoryBar({
  stats,
  t,
}: {
  stats: CategoryStats;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const pct = Math.round(stats.accuracy * 100);
  return (
    <View style={styles.categoryBarContainer}>
      <View style={styles.categoryBarHeader}>
        <Text style={styles.categoryBarName}>{formatCategoryName(stats.category, t)}</Text>
        <Text style={styles.categoryBarPct}>{pct}%</Text>
      </View>
      <View style={styles.categoryBarTrack}>
        <View
          style={[
            styles.categoryBarFill,
            { width: `${pct}%` as any },
            pct >= 90 ? styles.barGreen : pct >= 70 ? styles.barYellow : styles.barRed,
          ]}
        />
      </View>
      <Text style={styles.categoryBarCount}>
        {stats.correct}/{stats.total} {t('training.correct').toLowerCase()}
      </Text>
    </View>
  );
}

function WeaknessEvolutionRow({
  evolution,
  t,
}: {
  evolution: WeaknessEvolution;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const points = evolution.dataPoints;
  if (points.length === 0) return null;

  const first = Math.round(points[0].accuracy * 100);
  const last = Math.round(points[points.length - 1].accuracy * 100);

  const trendIcon =
    evolution.trend === 'improving'
      ? 'trending-up'
      : evolution.trend === 'declining'
      ? 'trending-down'
      : 'trending-flat';
  const trendColor =
    evolution.trend === 'improving'
      ? '#48bb78'
      : evolution.trend === 'declining'
      ? '#e53e3e'
      : '#d69e2e';
  const trendLabel =
    evolution.trend === 'improving'
      ? t('training.improving')
      : evolution.trend === 'declining'
      ? t('training.declining')
      : t('training.stable');

  return (
    <View style={styles.evolutionRow}>
      <View style={styles.evolutionLeft}>
        <Text style={styles.evolutionCategory}>{formatCategoryName(evolution.category, t)}</Text>
        <Text style={styles.evolutionRange}>
          {first}% → {last}%
        </Text>
      </View>
      <View style={[styles.evolutionBadge, { backgroundColor: `${trendColor}20` }]}>
        <MaterialIcons name={trendIcon as any} size={14} color={trendColor} />
        <Text style={[styles.evolutionTrend, { color: trendColor }]}>{trendLabel}</Text>
      </View>
    </View>
  );
}

function MilestoneBadge({ milestone }: { milestone: Milestone }) {
  const isUnlocked = milestone.unlockedAt !== null;
  return (
    <View style={[styles.milestoneBadge, !isUnlocked && styles.milestoneLocked]}>
      <MaterialIcons
        name={milestone.icon as any}
        size={28}
        color={isUnlocked ? '#11d4c4' : 'rgba(255,255,255,0.15)'}
      />
      <Text
        style={[styles.milestoneName, !isUnlocked && styles.milestoneNameLocked]}
        numberOfLines={1}
      >
        {milestone.name}
      </Text>
      <Text style={styles.milestoneDesc} numberOfLines={2}>
        {milestone.description}
      </Text>
      {isUnlocked && milestone.unlockedAt && (
        <Text style={styles.milestoneDate}>
          {new Date(milestone.unlockedAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatCategoryName(
  category: string,
  t: (key: string) => string,
): string {
  const map: Record<string, string> = {
    hard_total: t('training.hardTotals'),
    soft_total: t('training.softTotals'),
    pair_split: t('training.pairSplitting'),
    insurance: t('training.insurance'),
  };
  return map[category] ?? category;
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a1a18',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  segmentedControl: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    textAlign: 'center',
  },

  // Session tab
  accuracyCircle: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#11d4c4',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17,212,196,0.08)',
  },
  accuracyValue: {
    color: '#11d4c4',
    fontSize: 36,
    fontWeight: 'bold',
  },
  accuracyLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statBoxValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statBoxLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  categoryBarContainer: {
    gap: 4,
  },
  categoryBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryBarName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBarPct: {
    color: '#11d4c4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  barGreen: {
    backgroundColor: '#48bb78',
  },
  barYellow: {
    backgroundColor: '#d69e2e',
  },
  barRed: {
    backgroundColor: '#e53e3e',
  },
  categoryBarCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  weaknessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(229,62,62,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  weaknessText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },

  // Progress tab
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    paddingBottom: 8,
  },
  trendBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  trendBarLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
  },
  trendBar: {
    width: '80%',
    backgroundColor: '#11d4c4',
    borderRadius: 3,
    minHeight: 4,
  },
  evolutionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  evolutionLeft: {
    gap: 2,
  },
  evolutionCategory: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  evolutionRange: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  evolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  evolutionTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  moneyCard: {
    backgroundColor: 'rgba(17,212,196,0.08)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,212,196,0.2)',
    gap: 10,
  },
  moneyCardTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  moneyCardValue: {
    color: '#11d4c4',
    fontSize: 28,
    fontWeight: 'bold',
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moneyLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  moneyValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sessionHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sessionDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    flex: 1,
  },
  sessionAccuracy: {
    color: '#11d4c4',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  sessionDecisions: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },

  // Milestones tab
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  milestoneBadge: {
    width: '47%',
    backgroundColor: 'rgba(17,212,196,0.06)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(17,212,196,0.15)',
  },
  milestoneLocked: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  milestoneName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  milestoneNameLocked: {
    color: 'rgba(255,255,255,0.25)',
  },
  milestoneDesc: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  milestoneDate: {
    color: 'rgba(17,212,196,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
});
