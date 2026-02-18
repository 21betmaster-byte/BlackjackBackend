import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import PlayingCard from './PlayingCard';
import { Card } from '../game/engine';

type CardSize = 'sm' | 'md' | 'lg';

interface AnimatedPlayingCardProps {
  card: Card;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  rotate: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  flipProgress: SharedValue<number>;
  size?: CardSize;
  style?: ViewStyle;
}

export default function AnimatedPlayingCard({
  card,
  translateX,
  translateY,
  rotate,
  scale,
  opacity,
  flipProgress,
  size = 'md',
  style,
}: AnimatedPlayingCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Flip: scaleX goes 1 -> 0 -> 1, card face toggles at midpoint
    const flipScale = interpolate(
      flipProgress.value,
      [0, 0.5, 1],
      [1, 0, 1]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
        { scale: scale.value },
        { scaleX: flipScale },
      ],
      opacity: opacity.value,
    };
  });

  // Show card front when flip is past midpoint
  const showFront = card.faceUp;

  const displayCard: Card = {
    ...card,
    faceUp: showFront,
  };

  return (
    <Animated.View style={[{ position: 'absolute' }, animatedStyle, style]}>
      <PlayingCard card={displayCard} size={size} />
    </Animated.View>
  );
}
