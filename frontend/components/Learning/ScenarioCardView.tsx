import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import PlayingCard from '../PlayingCard';
import { ScenarioConfig } from '../../learning/types';
import { Card } from '../../game/engine';

interface Props {
  scenario: ScenarioConfig;
}

function toCard(rank: string, suit: string = 'spades'): Card {
  return { rank, suit, faceUp: true };
}

export default function ScenarioCardView({ scenario }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const playerCards = scenario.playerCards.map((r, i) =>
    toCard(r, i % 2 === 0 ? 'spades' : 'hearts'),
  );
  const dealerCard = toCard(scenario.dealerUpCard, 'diamonds');
  const holeCard: Card = { rank: '', suit: 'spades', faceUp: false };

  return (
    <View style={styles.container}>
      {/* Dealer section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: isDark ? '#9db9b7' : '#64748b' }]}>
          {t('game.dealer')}
        </Text>
        <View style={styles.cardRow}>
          <PlayingCard card={dealerCard} size="md" />
          <PlayingCard card={holeCard} size="md" style={{ marginLeft: -16 }} />
        </View>
      </View>

      {/* Felt divider */}
      <View style={[styles.feltDivider, { backgroundColor: isDark ? '#2a4a46' : '#d1e7dd' }]} />

      {/* Player section */}
      <View style={styles.section}>
        <View style={styles.cardRow}>
          {playerCards.map((card, idx) => (
            <PlayingCard
              key={idx}
              card={card}
              size="md"
              style={idx > 0 ? { marginLeft: -16 } : undefined}
            />
          ))}
        </View>
      </View>

      {/* Correct action badge */}
      <View style={[styles.actionBadge, { backgroundColor: 'rgba(17, 212, 196, 0.15)' }]}>
        <Text style={[styles.actionText, { color: Colors.primary }]}>
          {t(scenario.correctActionKey)}
        </Text>
      </View>

      {/* Explanation */}
      <Text style={[styles.explanation, { color: isDark ? '#9db9b7' : '#64748b' }]}>
        {t(scenario.explanationKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  section: {
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feltDivider: {
    width: '60%',
    height: 2,
    borderRadius: 1,
    marginVertical: 4,
  },
  actionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  explanation: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
});
