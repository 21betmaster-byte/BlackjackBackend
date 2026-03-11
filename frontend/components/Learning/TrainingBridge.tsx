import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

interface Props {
  onStartTraining: () => void;
  onGoHome: () => void;
  onReviewCards: () => void;
}

export default function TrainingBridge({ onStartTraining, onGoHome, onReviewCards }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(400)} style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(17, 212, 196, 0.12)' }]}>
          <MaterialIcons name="fitness-center" size={56} color={Colors.primary} />
        </View>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C' }]}>
          {t('learn.bridge.title')}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#9db9b7' : '#64748b' }]}>
          {t('learn.bridge.subtitle')}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.buttons}>
        <Button
          title={t('learn.bridge.startTraining')}
          onPress={onStartTraining}
          variant="primary"
          size="lg"
          fullWidth
          icon="play-arrow"
        />
        <Button
          title={t('learn.bridge.backToHome')}
          onPress={onGoHome}
          variant="outline"
          size="lg"
          fullWidth
          icon="home"
        />
        <Text
          style={[styles.reviewLink, { color: Colors.primary }]}
          onPress={onReviewCards}
        >
          {t('learn.bridge.reviewCards')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  buttons: {
    gap: 12,
    alignItems: 'center',
  },
  reviewLink: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});
