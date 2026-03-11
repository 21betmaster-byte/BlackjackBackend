import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { LearningCard } from '../../learning/types';
import ScenarioCardView from './ScenarioCardView';
import QuizCardView from './QuizCardView';

interface Props {
  card: LearningCard;
  onQuizAnswer: (optionIndex: number) => { correct: boolean };
  onQuizAnswered: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  rule: 'learn.cardType.rule',
  key_concept: 'learn.cardType.keyConcept',
  scenario: 'learn.cardType.scenario',
  tip: 'learn.cardType.tip',
  quiz: 'learn.cardType.quiz',
};

const TYPE_COLORS: Record<string, string> = {
  rule: Colors.learn.rule,
  key_concept: Colors.learn.keyConcept,
  scenario: Colors.learn.scenario,
  tip: Colors.learn.tip,
  quiz: Colors.learn.quiz,
};

export default function LearningCardView({ card, onQuizAnswer, onQuizAnswered }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const typeColor = card.accentColor || TYPE_COLORS[card.type] || Colors.primary;

  return (
    <View style={[styles.card, {
      backgroundColor: isDark ? '#1c2726' : 'white',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    }]}>
      {/* Type badge */}
      <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
        <Text style={[styles.typeBadgeText, { color: typeColor }]}>
          {t(TYPE_LABELS[card.type] || card.type)}
        </Text>
      </View>

      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: `${typeColor}15` }]}>
        <MaterialIcons name={card.icon as any} size={36} color={typeColor} />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C' }]}>
        {t(card.titleKey)}
      </Text>

      {/* Body — varies by type */}
      {card.type === 'scenario' && card.scenario ? (
        <ScenarioCardView scenario={card.scenario} />
      ) : card.type === 'quiz' && card.quiz ? (
        <QuizCardView quiz={card.quiz} onAnswer={onQuizAnswer} onAnswered={onQuizAnswered} />
      ) : (
        <>
          <Text style={[styles.body, { color: isDark ? '#9db9b7' : '#64748b' }]}>
            {t(card.bodyKey)}
          </Text>
          {card.type === 'tip' && (
            <View style={[styles.tipBadge, { backgroundColor: `${Colors.learn.tip}1a` }]}>
              <MaterialIcons name="lightbulb" size={14} color={Colors.learn.tip} />
              <Text style={{ color: Colors.learn.tip, fontSize: 12, fontWeight: '600' }}>
                {t('learn.cardType.tip')}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    gap: 14,
    minHeight: 380,
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 4,
  },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
});
