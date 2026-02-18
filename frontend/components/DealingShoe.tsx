import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DealingShoeProps {
  cardsRemaining: number;
}

export default function DealingShoe({ cardsRemaining }: DealingShoeProps) {
  return (
    <View style={styles.container}>
      {/* Stacked card backs */}
      <View style={styles.cardStack}>
        <View style={[styles.cardBack, styles.cardBack3]} />
        <View style={[styles.cardBack, styles.cardBack2]} />
        <View style={[styles.cardBack, styles.cardBack1]} />
      </View>
      <View style={styles.countContainer}>
        <MaterialIcons name="style" size={12} color="rgba(255,255,255,0.5)" />
        <Text style={styles.countText}>{cardsRemaining}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  cardStack: {
    width: 36,
    height: 48,
    position: 'relative',
  },
  cardBack: {
    position: 'absolute',
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#1a365d',
    borderWidth: 1,
    borderColor: '#2b6cb0',
  },
  cardBack1: {
    top: 0,
    left: 2,
    zIndex: 3,
  },
  cardBack2: {
    top: -2,
    left: 1,
    zIndex: 2,
    opacity: 0.7,
  },
  cardBack3: {
    top: -4,
    left: 0,
    zIndex: 1,
    opacity: 0.4,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  countText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
});
