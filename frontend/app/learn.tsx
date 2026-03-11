import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../constants/theme';
import { SkillLevel } from '../learning/types';
import { useLearningSession } from '../learning/useLearningSession';
import { loadLearningProgress, clearLearningProgress, hasSeenGuide, markGuideSeen } from '../learning/storage';
import IconButton from '../components/ui/IconButton';
import OnboardingFlow from '../components/Learning/OnboardingFlow';
import SwipableCardStack from '../components/Learning/SwipableCardStack';
import SwipeGuideOverlay from '../components/Learning/SwipeGuideOverlay';
import LearningProgressBar from '../components/Learning/LearningProgressBar';
import CompletionScreen from '../components/Learning/CompletionScreen';
import TrainingBridge from '../components/Learning/TrainingBridge';

type Phase = 'loading' | 'onboarding' | 'guide' | 'swiping' | 'completion' | 'bridge';

export default function LearnScreen() {
  const { game = 'blackjack' } = useLocalSearchParams<{ game?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  const [phase, setPhase] = useState<Phase>('loading');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [guideSeen, setGuideSeen] = useState(false);

  const session = useLearningSession(game, skillLevel);

  // Check for existing progress on mount
  useEffect(() => {
    (async () => {
      const saved = await loadLearningProgress(game);
      const seen = await hasSeenGuide();
      setGuideSeen(seen);

      if (saved && saved.completed) {
        setSkillLevel(saved.skillLevel);
        setPhase('bridge');
      } else if (saved && saved.completedCardIds.length > 0) {
        setSkillLevel(saved.skillLevel);
        setPhase('swiping');
      } else {
        setPhase('onboarding');
      }
    })();
  }, [game]);

  // Watch for completion
  useEffect(() => {
    if (session.isComplete && phase === 'swiping') {
      setPhase('completion');
    }
  }, [session.isComplete, phase]);

  const handleOnboardingComplete = useCallback((level: SkillLevel) => {
    setSkillLevel(level);
    session.restart(level);
    if (guideSeen) {
      setPhase('swiping');
    } else {
      setPhase('guide');
    }
  }, [guideSeen, session]);

  const handleGuideDismiss = useCallback(async () => {
    setGuideSeen(true);
    await markGuideSeen();
    setPhase('swiping');
  }, []);

  const handleContinueTobridge = useCallback(() => {
    setPhase('bridge');
  }, []);

  const handleStartTraining = useCallback(() => {
    router.replace('/blackjack-game');
  }, []);

  const handleGoHome = useCallback(() => {
    router.replace('/home-dashboard');
  }, []);

  const handleReviewCards = useCallback(async () => {
    await clearLearningProgress(game);
    session.restart(skillLevel);
    setPhase('swiping');
  }, [game, skillLevel, session]);

  const handleBack = useCallback(() => {
    if (phase === 'swiping' || phase === 'guide') {
      router.back();
    } else if (phase === 'completion') {
      handleContinueTobridge();
    } else {
      router.back();
    }
  }, [phase, handleContinueTobridge]);

  if (phase === 'loading' || session.isLoading) {
    return <View style={[styles.screen, { backgroundColor: themeColors.background }]} />;
  }

  if (phase === 'onboarding') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <IconButton icon="close" onPress={() => router.back()} variant="filled" iconColor={themeColors.text} style={{ backgroundColor: isDark ? '#1c2726' : '#f1f5f9' }} />
        </View>
        <OnboardingFlow gameType={game} onComplete={handleOnboardingComplete} />
      </SafeAreaView>
    );
  }

  if (phase === 'completion') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: themeColors.background }]}>
        <CompletionScreen progress={session.progress} totalCards={session.totalCards} />
        <View style={styles.continueButton}>
          <IconButton icon="arrow-forward" onPress={handleContinueTobridge} variant="primary" size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'bridge') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: themeColors.background }]}>
        <TrainingBridge
          onStartTraining={handleStartTraining}
          onGoHome={handleGoHome}
          onReviewCards={handleReviewCards}
        />
      </SafeAreaView>
    );
  }

  // phase === 'swiping' or 'guide'
  return (
    <GestureHandlerRootView style={styles.screen}>
      <SafeAreaView style={[styles.screen, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="close" onPress={handleBack} variant="filled" iconColor={themeColors.text} style={{ backgroundColor: isDark ? '#1c2726' : '#f1f5f9' }} />
        </View>

        {/* Progress */}
        <LearningProgressBar current={session.completedCount} total={session.totalCards} />

        {/* Card Stack */}
        <SwipableCardStack
          cards={session.cards}
          currentIndex={session.currentIndex}
          onSwipeRight={session.swipeRight}
          onSwipeLeft={session.swipeLeft}
          onQuizAnswer={session.answerQuiz}
        />

        {/* Guide overlay on first visit */}
        {phase === 'guide' && (
          <SwipeGuideOverlay onDismiss={handleGuideDismiss} />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 4,
    paddingBottom: 4,
  },
  continueButton: {
    position: 'absolute',
    bottom: 48,
    right: 24,
  },
});
