import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Hand, scoreHand } from '../game/engine';
import PlayingCard from './PlayingCard';
import { useTranslation } from 'react-i18next';

type Props = {
  hand?: Hand;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  betAmount: number;
  handLabel?: string;
  chipConfigs?: { value: number; color: string }[];
};

export default function BettingCircle({ hand, isActive, onPress, onLongPress, betAmount, handLabel, chipConfigs }: Props) {
  const { t } = useTranslation();
  const hasCards = hand && hand.cards.length > 0;
  const score = hasCards ? scoreHand(hand.cards) : null;

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7} style={styles.container}>
      {/* Cards */}
      {hasCards && (
        <View style={styles.cardsContainer}>
          {hand.cards.map((card, i) => (
            <View key={i} style={{ marginLeft: i > 0 ? -25 : 0, zIndex: i }}>
              <PlayingCard card={card} size="sm" />
            </View>
          ))}
        </View>
      )}

      {/* Score bubble */}
      {score && (
        <View style={[
          styles.scoreBubble,
          hand?.status === 'busted' && styles.scoreBubbleBusted,
          hand?.status === 'blackjack' && styles.scoreBubbleBlackjack,
        ]}>
          <Text style={[
            styles.scoreText,
            hand?.status === 'busted' && styles.scoreTextBusted,
            hand?.status === 'blackjack' && styles.scoreTextBlackjack,
          ]}>
            {hand?.status === 'busted' ? t('game.bust') : hand?.status === 'blackjack' ? t('game.bj') : score.display}
          </Text>
        </View>
      )}

      {/* Betting circle */}
      <View style={[styles.circle, isActive && styles.circleActive]}>
        {betAmount > 0 ? (
          <View style={styles.chipStack}>
            {decomposeChips(betAmount, chipConfigs).map((chip, idx, arr) => (
              <View
                key={idx}
                style={[
                  styles.chip,
                  { backgroundColor: chip.color, marginTop: idx > 0 ? -6 : 0, zIndex: idx },
                ]}
              >
                {idx === arr.length - 1 && (
                  <Text style={styles.chipText}>${betAmount}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('game.bet')}</Text>
        )}
      </View>

      {handLabel && <Text style={styles.handLabel}>{handLabel}</Text>}
    </TouchableOpacity>
  );
}

const DEFAULT_CHIP_CONFIGS = [
  { value: 100, color: '#1a202c' },
  { value: 50, color: '#dd6b20' },
  { value: 25, color: '#276749' },
  { value: 10, color: '#2b6cb0' },
  { value: 5, color: '#c53030' },
];

function decomposeChips(amount: number, configs?: { value: number; color: string }[]): { value: number; color: string }[] {
  const chips = configs && configs.length > 0
    ? [...configs].sort((a, b) => b.value - a.value)
    : DEFAULT_CHIP_CONFIGS;
  const result: { value: number; color: string }[] = [];
  let remaining = amount;

  for (const chip of chips) {
    while (remaining >= chip.value && result.length < 8) {
      result.push(chip);
      remaining -= chip.value;
    }
  }

  return result.length > 0 ? result : [{ value: amount, color: '#c53030' }];
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 63,
    alignItems: 'center',
  },
  scoreBubble: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 44,
    alignItems: 'center',
  },
  scoreBubbleBusted: {
    backgroundColor: 'rgba(229, 62, 62, 0.9)',
  },
  scoreBubbleBlackjack: {
    backgroundColor: 'rgba(214, 158, 46, 0.9)',
  },
  scoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreTextBusted: {
    color: '#fff',
  },
  scoreTextBlackjack: {
    color: '#fff',
  },
  circle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: {
    borderColor: '#11d4c4',
    borderStyle: 'solid',
    shadowColor: '#11d4c4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  chipStack: {
    alignItems: 'center',
  },
  chip: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  handLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
});
