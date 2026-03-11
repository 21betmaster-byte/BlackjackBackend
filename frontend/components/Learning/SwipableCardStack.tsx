import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LearningCard } from '../../learning/types';
import LearningCardView from './LearningCardView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

interface Props {
  cards: LearningCard[];
  currentIndex: number;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onQuizAnswer: (optionIndex: number) => { correct: boolean };
}

export default function SwipableCardStack({
  cards,
  currentIndex,
  onSwipeRight,
  onSwipeLeft,
  onQuizAnswer,
}: Props) {
  const translateX = useSharedValue(0);
  const [swipeEnabled, setSwipeEnabled] = useState(true);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  // For quiz cards, disable swipe until answered
  const isQuiz = currentCard?.type === 'quiz';
  const canSwipe = swipeEnabled || !isQuiz;

  const handleSwipeRight = useCallback(() => {
    setSwipeEnabled(true);
    onSwipeRight();
  }, [onSwipeRight]);

  const handleSwipeLeft = useCallback(() => {
    setSwipeEnabled(true);
    onSwipeLeft();
  }, [onSwipeLeft]);

  const handleQuizAnswered = useCallback(() => {
    setSwipeEnabled(true);
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(canSwipe)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(handleSwipeRight)();
          translateX.value = 0;
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(handleSwipeLeft)();
          translateX.value = 0;
        });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-15, 0, 15],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH * 0.8],
      [1, 0.5],
      Extrapolation.CLAMP,
    ),
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          Math.abs(translateX.value),
          [0, SWIPE_THRESHOLD],
          [0.95, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0.5, 1],
      Extrapolation.CLAMP,
    ),
  }));

  if (!currentCard) return null;

  // Reset swipe enabled when card changes to a quiz
  if (isQuiz && swipeEnabled) {
    // Will be set to false on next render when quiz card detected
    setTimeout(() => setSwipeEnabled(false), 0);
  }

  return (
    <View style={styles.container}>
      {/* Next card (behind) */}
      {nextCard && (
        <Animated.View style={[styles.cardWrapper, nextCardStyle]} pointerEvents="none">
          <LearningCardView
            card={nextCard}
            onQuizAnswer={() => ({ correct: false })}
            onQuizAnswered={() => {}}
          />
        </Animated.View>
      )}

      {/* Current card (top) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrapper, topCardStyle]}>
          <LearningCardView
            card={currentCard}
            onQuizAnswer={onQuizAnswer}
            onQuizAnswered={handleQuizAnswered}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardWrapper: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
  },
});
