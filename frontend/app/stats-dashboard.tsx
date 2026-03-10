import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useProgress } from '../training/useProgress';
import IconButton from '../components/ui/IconButton';
import BottomNav from '../components/ui/BottomNav';

interface StatsItem {
  result: string;
  mistakes: number;
  net_payout?: number;
  hands_played?: number;
  timestamp: string;
}

export default function StatsDashboardScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { token } = useAuth();
  const progress = useProgress('blackjack');

  const [stats, setStats] = useState<StatsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const resp = await axios.get(`${API_URL}/training/summary?game_type=blackjack`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // We also try to fetch progress for timeline
      const progressResp = await axios.get(`${API_URL}/training/progress?game_type=blackjack`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Store the backend data
      setStats(progressResp.data?.snapshots ?? []);
    } catch {
      // Fall back to local data
    } finally {
      setLoading(false);
    }
  };

  const dashboard = progress.dashboard;
  const timeline = dashboard?.timeline?.snapshots ?? [];
  const totalDecisions = timeline.reduce((sum, s) => sum + (s.totalDecisions ?? 0), 0);
  const totalCorrect = timeline.reduce((sum, s) => sum + (s.totalCorrect ?? 0), 0);
  const overallAccuracy = totalDecisions > 0 ? Math.round((totalCorrect / totalDecisions) * 100) : 0;

  const cardBg = isDark ? '#1c2726' : 'white';
  const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const subtextColor = isDark ? '#9db9b7' : '#64748b';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        <View style={[styles.header, { borderColor: cardBorder }]}>
          <IconButton icon="arrow-back-ios-new" onPress={() => router.back()} iconColor={themeColors.text} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('stats.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading || progress.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Overview Cards */}
            <View style={styles.overviewGrid}>
              <View style={[styles.overviewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <MaterialIcons name="school" size={24} color={Colors.primary} />
                <Text style={[styles.overviewValue, { color: themeColors.text }]}>{totalDecisions}</Text>
                <Text style={[styles.overviewLabel, { color: subtextColor }]}>{t('training.decisions')}</Text>
              </View>
              <View style={[styles.overviewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <MaterialIcons name="check-circle" size={24} color="#48bb78" />
                <Text style={[styles.overviewValue, { color: themeColors.text }]}>{overallAccuracy}%</Text>
                <Text style={[styles.overviewLabel, { color: subtextColor }]}>{t('stats.trainingAccuracy')}</Text>
              </View>
              <View style={[styles.overviewCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <MaterialIcons name="timeline" size={24} color="#d69e2e" />
                <Text style={[styles.overviewValue, { color: themeColors.text }]}>{timeline.length}</Text>
                <Text style={[styles.overviewLabel, { color: subtextColor }]}>{t('training.sessionHistory')}</Text>
              </View>
            </View>

            {/* Accuracy Trend */}
            {timeline.length > 0 && (
              <View style={[styles.trendCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('training.accuracy')} — {t('training.sessionHistory')}</Text>
                <View style={styles.trendChart}>
                  {timeline.slice(-15).map((snap, i) => {
                    const pct = Math.round(snap.overallAccuracy * 100);
                    return (
                      <View key={i} style={styles.trendBarWrapper}>
                        <Text style={[styles.trendBarLabel, { color: subtextColor }]}>{pct}%</Text>
                        <View style={[styles.trendBar, { height: Math.max(4, pct * 1.2) }]} />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Weakness Evolution */}
            {dashboard?.weaknessEvolutions && dashboard.weaknessEvolutions.length > 0 && (
              <View style={[styles.trendCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('training.categoryBreakdown')}</Text>
                {dashboard.weaknessEvolutions.map((we) => {
                  const points = we.dataPoints;
                  if (points.length === 0) return null;
                  const last = Math.round(points[points.length - 1].accuracy * 100);
                  const trendColor = we.trend === 'improving' ? '#48bb78' : we.trend === 'declining' ? '#e53e3e' : '#d69e2e';
                  const trendIcon = we.trend === 'improving' ? 'trending-up' : we.trend === 'declining' ? 'trending-down' : 'trending-flat';
                  return (
                    <View key={we.category} style={styles.weaknessRow}>
                      <View>
                        <Text style={[styles.weaknessCategory, { color: themeColors.text }]}>{we.category.replace('_', ' ')}</Text>
                        <Text style={[styles.weaknessAccuracy, { color: subtextColor }]}>{last}%</Text>
                      </View>
                      <View style={[styles.trendBadge, { backgroundColor: `${trendColor}20` }]}>
                        <MaterialIcons name={trendIcon as any} size={14} color={trendColor} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Money Metrics */}
            {dashboard?.moneyMetrics && (
              <View style={[styles.moneyCard, { backgroundColor: 'rgba(17,212,196,0.08)', borderColor: 'rgba(17,212,196,0.2)' }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('training.estimatedSavings')}</Text>
                <Text style={styles.moneyValue}>${dashboard.moneyMetrics.estimatedSavingsPerHour.toFixed(2)}/hr</Text>
                {dashboard.handsToMastery !== null && (
                  <Text style={[styles.moneySubtext, { color: subtextColor }]}>
                    {t('training.handsToMastery')}: ~{dashboard.handsToMastery}
                  </Text>
                )}
              </View>
            )}

            {totalDecisions === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="leaderboard" size={48} color={subtextColor} />
                <Text style={[styles.emptyText, { color: subtextColor }]}>{t('stats.noGames')}</Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
      <BottomNav activeTab="stats" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, gap: 16 },
  overviewGrid: { flexDirection: 'row', gap: 10 },
  overviewCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  overviewValue: { fontSize: 24, fontWeight: 'bold' },
  overviewLabel: { fontSize: 11, textAlign: 'center' },
  trendCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold' },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 120,
  },
  trendBarWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  trendBarLabel: { fontSize: 8 },
  trendBar: { width: '80%', backgroundColor: Colors.primary, borderRadius: 3, minHeight: 4 },
  weaknessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  weaknessCategory: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  weaknessAccuracy: { fontSize: 12, marginTop: 2 },
  trendBadge: { padding: 6, borderRadius: 12 },
  moneyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  moneyValue: { color: Colors.primary, fontSize: 28, fontWeight: 'bold' },
  moneySubtext: { fontSize: 13 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});
