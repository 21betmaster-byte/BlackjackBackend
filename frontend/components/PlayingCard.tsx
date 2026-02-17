import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from '../game/engine';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: '#e53e3e',
  diamonds: '#e53e3e',
  clubs: '#1a202c',
  spades: '#1a202c',
};

type CardSize = 'sm' | 'md' | 'lg';

const SIZES: Record<CardSize, { width: number; height: number; fontSize: number; suitSize: number }> = {
  sm: { width: 45, height: 63, fontSize: 11, suitSize: 16 },
  md: { width: 60, height: 85, fontSize: 14, suitSize: 22 },
  lg: { width: 80, height: 112, fontSize: 18, suitSize: 28 },
};

type Props = {
  card: Card;
  style?: ViewStyle;
  size?: CardSize;
};

export default function PlayingCard({ card, style, size = 'md' }: Props) {
  const dims = SIZES[size];

  if (!card.faceUp) {
    return (
      <View style={[styles.card, { width: dims.width, height: dims.height, backgroundColor: '#1a365d' }, style]}>
        <View style={styles.cardBack}>
          <View style={styles.cardBackInner}>
            <Text style={styles.cardBackPattern}>♠♥♣♦</Text>
          </View>
        </View>
      </View>
    );
  }

  const suit = SUIT_SYMBOLS[card.suit];
  const color = SUIT_COLORS[card.suit];

  return (
    <View style={[styles.card, { width: dims.width, height: dims.height }, style]}>
      <View style={styles.cardCornerTop}>
        <Text style={[styles.cardRank, { fontSize: dims.fontSize, color }]}>{card.rank}</Text>
        <Text style={[styles.cardSuitSmall, { fontSize: dims.fontSize - 2, color }]}>{suit}</Text>
      </View>
      <Text style={[styles.cardCenterSuit, { fontSize: dims.suitSize, color }]}>{suit}</Text>
      <View style={styles.cardCornerBottom}>
        <Text style={[styles.cardSuitSmall, { fontSize: dims.fontSize - 2, color }]}>{suit}</Text>
        <Text style={[styles.cardRank, { fontSize: dims.fontSize, color }]}>{card.rank}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cardBack: {
    flex: 1,
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardBackInner: {
    flex: 1,
    width: '100%',
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#2b6cb0',
    backgroundColor: '#2c5282',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackPattern: {
    color: '#63b3ed',
    fontSize: 10,
    opacity: 0.6,
  },
  cardCornerTop: {
    position: 'absolute',
    top: 3,
    left: 4,
    alignItems: 'center',
  },
  cardCornerBottom: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  cardRank: {
    fontWeight: 'bold',
    lineHeight: 16,
  },
  cardSuitSmall: {
    lineHeight: 14,
  },
  cardCenterSuit: {
    fontWeight: 'bold',
  },
});
