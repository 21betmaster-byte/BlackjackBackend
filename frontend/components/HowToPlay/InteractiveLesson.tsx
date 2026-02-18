import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import PlayingCard from '../PlayingCard';
import Button from '../ui/Button';
import { Card, Suit, Rank, scoreHand } from '../../game/engine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LessonScenario {
  playerCards: Card[];
  dealerUpCard: Card;
  dealerHoleCard: Card;
  actions: string[];
  hitCards: Card[];
  outcomeKey: string;
  outcomeValues?: Record<string, string | number>;
}

function makeCard(rank: Rank, suit: Suit, faceUp = true): Card {
  return { rank, suit, faceUp };
}

const SCENARIOS: LessonScenario[] = [
  {
    // Lesson 1: Player 8+5 vs Dealer 6, Hit to get 7 -> 20, then Stand
    playerCards: [makeCard('8', 'hearts'), makeCard('5', 'diamonds')],
    dealerUpCard: makeCard('6', 'spades'),
    dealerHoleCard: makeCard('10', 'hearts', false),
    actions: ['hit', 'stand'],
    hitCards: [makeCard('7', 'clubs')],
    outcomeKey: 'howToPlay.dealerBusts',
  },
  {
    // Lesson 2: Player K+6 vs Dealer 9, Hit to get Q -> bust
    playerCards: [makeCard('K', 'spades'), makeCard('6', 'hearts')],
    dealerUpCard: makeCard('9', 'diamonds'),
    dealerHoleCard: makeCard('8', 'clubs', false),
    actions: ['hit'],
    hitCards: [makeCard('Q', 'hearts')],
    outcomeKey: 'howToPlay.youBusted',
  },
  {
    // Lesson 3: Player 6+7 vs Dealer 5, Hit to get 6 -> 19, Stand
    playerCards: [makeCard('6', 'clubs'), makeCard('7', 'diamonds')],
    dealerUpCard: makeCard('5', 'hearts'),
    dealerHoleCard: makeCard('9', 'spades', false),
    actions: ['hit', 'stand'],
    hitCards: [makeCard('6', 'spades')],
    outcomeKey: 'howToPlay.youWinWith',
    outcomeValues: { total: 19 },
  },
  {
    // Lesson 4: Player 4+7 vs Dealer K, Double to get 10 -> 21
    playerCards: [makeCard('4', 'diamonds'), makeCard('7', 'clubs')],
    dealerUpCard: makeCard('K', 'hearts'),
    dealerHoleCard: makeCard('7', 'spades', false),
    actions: ['double'],
    hitCards: [makeCard('10', 'spades')],
    outcomeKey: 'howToPlay.doublePayout',
    outcomeValues: { total: 21 },
  },
  {
    // Lesson 5: Player 8+8 vs Dealer 6, Split
    playerCards: [makeCard('8', 'hearts'), makeCard('8', 'spades')],
    dealerUpCard: makeCard('6', 'clubs'),
    dealerHoleCard: makeCard('10', 'diamonds', false),
    actions: ['split'],
    hitCards: [makeCard('2', 'hearts'), makeCard('A', 'diamonds')],
    outcomeKey: 'howToPlay.youWinWith',
    outcomeValues: { total: '18 & 21' },
  },
  {
    // Lesson 6: Player A+K = Blackjack (auto)
    playerCards: [makeCard('A', 'spades'), makeCard('K', 'diamonds')],
    dealerUpCard: makeCard('7', 'hearts'),
    dealerHoleCard: makeCard('9', 'clubs', false),
    actions: [],
    hitCards: [],
    outcomeKey: 'howToPlay.naturalBlackjack',
  },
];

const ACTION_PROMPTS: Record<string, string> = {
  hit: 'howToPlay.hitToReceive',
  stand: 'howToPlay.standToKeep',
  double: 'howToPlay.doubleToDouble',
  split: 'howToPlay.splitToSplit',
};

interface Props {
  onComplete: () => void;
}

export default function InteractiveLesson({ onComplete }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [lessonIndex, setLessonIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [showOutcome, setShowOutcome] = useState(false);

  const scenario = SCENARIOS[lessonIndex];
  const isLastLesson = lessonIndex === SCENARIOS.length - 1;

  const setupLesson = useCallback(() => {
    setActionIndex(0);
    setPlayerCards([...SCENARIOS[lessonIndex].playerCards]);
    setShowOutcome(SCENARIOS[lessonIndex].actions.length === 0);
  }, [lessonIndex]);

  useEffect(() => {
    setupLesson();
  }, [setupLesson]);

  const handleAction = (action: string) => {
    const expected = scenario.actions[actionIndex];
    if (action !== expected) return;

    if (action === 'hit' || action === 'double') {
      const newCard = scenario.hitCards[actionIndex] || scenario.hitCards[0];
      setPlayerCards(prev => [...prev, newCard]);
    }

    const nextActionIndex = actionIndex + 1;
    if (nextActionIndex >= scenario.actions.length) {
      setShowOutcome(true);
    } else {
      setActionIndex(nextActionIndex);
    }
  };

  const handleNext = () => {
    if (isLastLesson) {
      onComplete();
    } else {
      setLessonIndex(prev => prev + 1);
      setShowOutcome(false);
    }
  };

  const currentAction = scenario.actions[actionIndex];
  const playerScore = scoreHand(playerCards);

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={[styles.lessonLabel, { color: isDark ? '#9db9b7' : '#64748b' }]}>
          {t('howToPlay.lesson', { num: lessonIndex + 1, total: SCENARIOS.length })}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: isDark ? '#1c2726' : '#e2e8f0' }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${((lessonIndex + 1) / SCENARIOS.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Mini table */}
      <View style={[styles.table, { backgroundColor: '#0d5e3c' }]}>
        {/* Dealer */}
        <View style={styles.dealerSection}>
          <Text style={styles.sectionLabel}>{t('game.dealer')}</Text>
          <View style={styles.cardRow}>
            <PlayingCard card={scenario.dealerUpCard} size="md" />
            <View style={{ marginLeft: -16 }}>
              <PlayingCard card={showOutcome ? { ...scenario.dealerHoleCard, faceUp: true } : scenario.dealerHoleCard} size="md" />
            </View>
          </View>
          {showOutcome && (
            <View style={styles.scoreBubble}>
              <Text style={styles.scoreText}>
                {scoreHand([scenario.dealerUpCard, { ...scenario.dealerHoleCard, faceUp: true }]).display}
              </Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.tableDivider} />

        {/* Player */}
        <View style={styles.playerSection}>
          <Text style={styles.sectionLabel}>YOU</Text>
          <View style={styles.cardRow}>
            {playerCards.map((card, i) => (
              <Animated.View key={i} entering={i >= 2 ? FadeIn.delay(200) : undefined} style={{ marginLeft: i > 0 ? -16 : 0, zIndex: i }}>
                <PlayingCard card={card} size="md" />
              </Animated.View>
            ))}
          </View>
          <View style={[
            styles.scoreBubble,
            playerScore.total > 21 && styles.scoreBubbleBust,
            playerScore.total === 21 && playerCards.length === 2 && styles.scoreBubbleBJ,
          ]}>
            <Text style={styles.scoreText}>
              {playerScore.total > 21 ? t('game.bust') : playerScore.display}
            </Text>
          </View>
        </View>
      </View>

      {/* Action prompt or outcome */}
      <View style={styles.actionArea}>
        {showOutcome ? (
          <Animated.View entering={FadeIn} style={styles.outcomeContainer}>
            <Text style={[styles.outcomeText, { color: Colors.primary }]}>
              {t(scenario.outcomeKey, scenario.outcomeValues)}
            </Text>
            <Button
              title={isLastLesson ? t('howToPlay.complete') : t('howToPlay.nextLesson')}
              onPress={handleNext}
              variant="primary"
              size="lg"
              fullWidth
              icon={isLastLesson ? 'check-circle' : 'arrow-forward'}
              iconPosition="right"
            />
          </Animated.View>
        ) : (
          <View style={styles.promptContainer}>
            {currentAction && (
              <Text style={[styles.promptText, { color: isDark ? '#9db9b7' : '#64748b' }]}>
                {t(ACTION_PROMPTS[currentAction] || '')}
              </Text>
            )}
            <View style={styles.actionButtons}>
              {['hit', 'stand', 'double', 'split'].map(action => {
                const isExpected = action === currentAction;
                return (
                  <TouchableOpacity
                    key={action}
                    style={[
                      styles.actionBtn,
                      !isExpected && styles.actionBtnDisabled,
                      isExpected && styles.actionBtnHighlighted,
                    ]}
                    onPress={() => handleAction(action)}
                    disabled={!isExpected}
                  >
                    <Text style={[styles.actionBtnText, isExpected && { color: Colors.dark.background }]}>
                      {t(`game.${action}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  lessonLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  table: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#8B6914',
    justifyContent: 'space-between',
  },
  dealerSection: {
    alignItems: 'center',
    gap: 8,
  },
  playerSection: {
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  scoreBubble: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 44,
    alignItems: 'center',
  },
  scoreBubbleBust: {
    backgroundColor: 'rgba(229, 62, 62, 0.9)',
  },
  scoreBubbleBJ: {
    backgroundColor: 'rgba(214, 158, 46, 0.9)',
  },
  scoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionArea: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  promptContainer: {
    gap: 16,
  },
  promptText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnHighlighted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  outcomeContainer: {
    gap: 16,
    alignItems: 'center',
  },
  outcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
