import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

export interface DealTarget {
  x: number;
  y: number;
  rotation?: number;
  faceUp?: boolean;
}

export interface DealAnimationConfig {
  targets: DealTarget[];
  originX?: number;
  originY?: number;
  delayBetweenCards?: number;
  dealDuration?: number;
  onCardDealt?: (index: number) => void;
  onComplete?: () => void;
}

export interface CardAnimValues {
  translateX: ReturnType<typeof useSharedValue>;
  translateY: ReturnType<typeof useSharedValue>;
  rotate: ReturnType<typeof useSharedValue>;
  scale: ReturnType<typeof useSharedValue>;
  opacity: ReturnType<typeof useSharedValue>;
  flipProgress: ReturnType<typeof useSharedValue>;
}

const MAX_CARDS = 12;

const DEAL_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

export function useCardDealAnimation() {
  const cards: CardAnimValues[] = [];

  for (let i = 0; i < MAX_CARDS; i++) {
    cards.push({
      translateX: useSharedValue(0),
      translateY: useSharedValue(0),
      rotate: useSharedValue(0),
      scale: useSharedValue(0.5),
      opacity: useSharedValue(0),
      flipProgress: useSharedValue(0),
    });
  }

  const isAnimating = useRef(false);

  const resetAll = useCallback(() => {
    for (let i = 0; i < MAX_CARDS; i++) {
      cards[i].translateX.value = 0;
      cards[i].translateY.value = 0;
      cards[i].rotate.value = 0;
      cards[i].scale.value = 0.5;
      cards[i].opacity.value = 0;
      cards[i].flipProgress.value = 0;
    }
    isAnimating.current = false;
  }, []);

  const startDeal = useCallback((config: DealAnimationConfig) => {
    const {
      targets,
      originX = 300,
      originY = -100,
      delayBetweenCards = 200,
      dealDuration = 300,
      onCardDealt,
      onComplete,
    } = config;

    isAnimating.current = true;

    // Set initial positions at origin
    for (let i = 0; i < targets.length && i < MAX_CARDS; i++) {
      cards[i].translateX.value = originX;
      cards[i].translateY.value = originY;
      cards[i].rotate.value = 0;
      cards[i].scale.value = 0.5;
      cards[i].opacity.value = 0;
      cards[i].flipProgress.value = 0;
    }

    // Animate each card to its target
    for (let i = 0; i < targets.length && i < MAX_CARDS; i++) {
      const target = targets[i];
      const delay = i * delayBetweenCards;
      const isLast = i === targets.length - 1;

      // Opacity: appear
      cards[i].opacity.value = withDelay(
        delay,
        withTiming(1, { duration: dealDuration * 0.3 })
      );

      // Scale up
      cards[i].scale.value = withDelay(
        delay,
        withTiming(1, { duration: dealDuration, easing: DEAL_EASING })
      );

      // Position
      cards[i].translateX.value = withDelay(
        delay,
        withTiming(target.x, { duration: dealDuration, easing: DEAL_EASING })
      );

      cards[i].translateY.value = withDelay(
        delay,
        withTiming(target.y, {
          duration: dealDuration,
          easing: DEAL_EASING,
        }, (finished) => {
          if (finished) {
            if (onCardDealt) {
              runOnJS(onCardDealt)(i);
            }
            if (isLast && onComplete) {
              runOnJS(onComplete)();
            }
          }
        })
      );

      // Rotation
      cards[i].rotate.value = withDelay(
        delay,
        withTiming(target.rotation ?? 0, { duration: dealDuration, easing: DEAL_EASING })
      );

      // Flip if face up (0 = back, 1 = front)
      if (target.faceUp !== false) {
        cards[i].flipProgress.value = withDelay(
          delay + dealDuration * 0.4,
          withTiming(1, { duration: dealDuration * 0.6, easing: DEAL_EASING })
        );
      }
    }
  }, []);

  const flipCard = useCallback((index: number, duration: number = 300) => {
    if (index >= MAX_CARDS) return;
    cards[index].flipProgress.value = withTiming(1, {
      duration,
      easing: DEAL_EASING,
    });
  }, []);

  return {
    cards,
    startDeal,
    resetAll,
    flipCard,
    isAnimating: isAnimating.current,
    MAX_CARDS,
  };
}
