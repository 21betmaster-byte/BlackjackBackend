import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, BounceIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { LearningProgress, SkillLevel } from '../../learning/types';

interface Props {
  progress: LearningProgress;
  totalCards: number;
}

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'learn.levels.beginnerTitle',
  amateur: 'learn.levels.amateurTitle',
  pro: 'learn.levels.proTitle',
};

export default function CompletionScreen({ progress, totalCards }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const quizEntries = Object.values(progress.quizResults);
  const quizCorrect = quizEntries.filter(q => q.correct).length;
  const quizTotal = quizEntries.length;

  return (
    <View style={styles.container}>
      <Animated.View entering={BounceIn.delay(200).duration(600)} style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(17, 212, 196, 0.15)' }]}>
          <MaterialIcons name="emoji-events" size={80} color={Colors.primary} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.textContainer}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C' }]}>
          {t('learn.completion.title')}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#9db9b7' : '#64748b' }]}>
          {t('learn.completion.subtitle', { level: t(LEVEL_LABELS[progress.skillLevel]) })}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(700).duration(400)} style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: isDark ? '#1c2726' : '#f1f5f9' }]}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{totalCards}</Text>
          <Text style={[styles.statLabel, { color: isDark ? '#9db9b7' : '#64748b' }]}>
            {t('learn.completion.cardsReviewed')}
          </Text>
        </View>
        {quizTotal > 0 && (
          <View style={[styles.statBox, { backgroundColor: isDark ? '#1c2726' : '#f1f5f9' }]}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{quizCorrect}/{quizTotal}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#9db9b7' : '#64748b' }]}>
              {t('learn.completion.quizScore')}
            </Text>
          </View>
        )}
      </Animated.View>

      {quizTotal > 0 && quizCorrect < quizTotal && (
        <Animated.View entering={FadeInUp.delay(900).duration(400)}>
          <Text style={[styles.hint, { color: isDark ? '#9db9b7' : '#94a3b8' }]}>
            {t('learn.completion.reviewHint')}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 120,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
