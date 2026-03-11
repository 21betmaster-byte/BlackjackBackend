import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import SkillLevelPicker from './SkillLevelPicker';
import { SkillLevel } from '../../learning/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  gameType: string;
  onComplete: (level: SkillLevel) => void;
}

type Step = 'welcome' | 'how_it_works' | 'pick_level';

export default function OnboardingFlow({ gameType, onComplete }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [step, setStep] = useState<Step>('welcome');

  if (step === 'welcome') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(17, 212, 196, 0.1)' }]}>
            <MaterialIcons name="school" size={80} color={Colors.primary} />
          </View>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C' }]}>
            {t('learn.onboarding.welcomeTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9db9b7' : '#64748b' }]}>
            {t('learn.onboarding.welcomeSubtitle')}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.buttonContainer}>
          <Button
            title={t('learn.onboarding.getStarted')}
            onPress={() => setStep('how_it_works')}
            variant="primary"
            size="lg"
            fullWidth
            icon="arrow-forward"
            iconPosition="right"
          />
        </Animated.View>
      </View>
    );
  }

  if (step === 'how_it_works') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
          <View style={styles.swipeDemo}>
            <View style={[styles.demoCard, { backgroundColor: isDark ? '#1c2726' : 'white', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
              <MaterialIcons name="style" size={48} color={Colors.primary} />
            </View>
            <View style={styles.arrowRow}>
              <View style={styles.arrowLabel}>
                <MaterialIcons name="arrow-back" size={28} color={isDark ? '#9db9b7' : '#94a3b8'} />
                <Text style={[styles.arrowText, { color: isDark ? '#9db9b7' : '#94a3b8' }]}>
                  {t('learn.onboarding.reviewLater')}
                </Text>
              </View>
              <View style={styles.arrowLabel}>
                <Text style={[styles.arrowText, { color: Colors.primary }]}>
                  {t('learn.onboarding.gotIt')}
                </Text>
                <MaterialIcons name="arrow-forward" size={28} color={Colors.primary} />
              </View>
            </View>
          </View>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C' }]}>
            {t('learn.onboarding.howItWorksTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#9db9b7' : '#64748b' }]}>
            {t('learn.onboarding.howItWorksSubtitle')}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.buttonContainer}>
          <Button
            title={t('common.continue')}
            onPress={() => setStep('pick_level')}
            variant="primary"
            size="lg"
            fullWidth
            icon="arrow-forward"
            iconPosition="right"
          />
        </Animated.View>
      </View>
    );
  }

  // pick_level
  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.levelContent}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C', marginBottom: 8 }]}>
          {t('learn.onboarding.pickLevelTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#9db9b7' : '#64748b', marginBottom: 32 }]}>
          {t('learn.onboarding.pickLevelSubtitle')}
        </Text>
        <SkillLevelPicker onSelect={onComplete} />
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
  },
  levelContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    paddingHorizontal: 0,
  },
  swipeDemo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  demoCard: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.35,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  arrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH * 0.7,
  },
  arrowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
