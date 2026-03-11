import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { QuizConfig } from '../../learning/types';

interface Props {
  quiz: QuizConfig;
  onAnswer: (optionIndex: number) => { correct: boolean };
  onAnswered: () => void;
}

export default function QuizCardView({ quiz, onAnswer, onAnswered }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return; // Already answered
    setSelectedIndex(index);
    const result = onAnswer(index);
    setIsCorrect(result.correct);
    onAnswered();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.question, { color: isDark ? '#fff' : '#11181C' }]}>
        {t(quiz.questionKey)}
      </Text>

      <View style={styles.options}>
        {quiz.options.map((option, index) => {
          let bgColor = isDark ? '#1a312e' : '#f1f5f9';
          let borderColor = isDark ? '#2a4a46' : '#e2e8f0';
          let textColor = isDark ? '#fff' : '#11181C';

          if (selectedIndex !== null) {
            if (index === quiz.correctIndex) {
              bgColor = `${Colors.success}26`;
              borderColor = Colors.success;
              textColor = Colors.success;
            } else if (index === selectedIndex && !isCorrect) {
              bgColor = `${Colors.error}26`;
              borderColor = Colors.error;
              textColor = Colors.error;
            }
          }

          return (
            <TouchableOpacity
              key={index}
              style={[styles.option, { backgroundColor: bgColor, borderColor }]}
              onPress={() => handleSelect(index)}
              activeOpacity={0.7}
              disabled={selectedIndex !== null}
            >
              <Text style={[styles.optionText, { color: textColor }]}>
                {t(option.labelKey)}
              </Text>
              {selectedIndex !== null && index === quiz.correctIndex && (
                <MaterialIcons name="check-circle" size={20} color={Colors.success} />
              )}
              {selectedIndex !== null && index === selectedIndex && !isCorrect && index !== quiz.correctIndex && (
                <MaterialIcons name="cancel" size={20} color={Colors.error} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedIndex !== null && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.explanationBox}>
          <MaterialIcons
            name={isCorrect ? 'check-circle' : 'info'}
            size={18}
            color={isCorrect ? Colors.success : Colors.primary}
          />
          <Text style={[styles.explanationText, { color: isDark ? '#9db9b7' : '#64748b' }]}>
            {t(quiz.explanationKey)}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    alignItems: 'stretch',
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 4,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
