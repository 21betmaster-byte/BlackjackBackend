import React, { useReducer, useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  Platform,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import PlayingCard from '../components/PlayingCard';
import BettingCircle from '../components/BettingCircle';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import {
  GameState,
  GamePhase,
  GameConfig,
  DEFAULT_CONFIG,
  createInitialState,
  placeBet,
  removeBet,
  dealInitialCards,
  completeDeal,
  clearBets,
  resolveInsurance,
  playerHit,
  playerStand,
  playerDouble,
  playerSplit,
  playDealer,
  settleRound,
  startNewRound,
  rebetAndDeal,
  resetMoney,
  scoreHand,
  canSplit,
  canDouble,
  canSurrender,
  playerSurrender,
  shouldReshuffle,
  formatCardShort,
} from '../game/engine';
import { useTrainer } from '../game/useTrainer';
import { DEFAULT_CHIPS, ChipConfig } from '../game/types';
import {
  incrementRoundCounter,
  resetRoundCounter,
} from '../training/adapters/BlackjackAdapter';

// Reducer
type GameAction =
  | { type: 'PLACE_BET'; handIndex: number; amount: number }
  | { type: 'REMOVE_BET'; handIndex: number }
  | { type: 'DEAL' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE' }
  | { type: 'SPLIT' }
  | { type: 'SURRENDER' }
  | { type: 'INSURANCE'; accepted: boolean }
  | { type: 'PLAY_DEALER' }
  | { type: 'SETTLE'; mistakes: number }
  | { type: 'NEW_ROUND' }
  | { type: 'REBET_AND_DEAL' }
  | { type: 'DEALING_COMPLETE' }
  | { type: 'CLEAR_BETS' }
  | { type: 'RESET_MONEY' }
  | { type: 'RESET'; config?: GameConfig };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_BET':
      return placeBet(state, action.handIndex, action.amount);
    case 'REMOVE_BET':
      return removeBet(state, action.handIndex);
    case 'DEAL':
      return dealInitialCards(state);
    case 'HIT':
      return playerHit(state);
    case 'STAND':
      return playerStand(state);
    case 'DOUBLE':
      return playerDouble(state);
    case 'SPLIT':
      return playerSplit(state);
    case 'SURRENDER':
      return playerSurrender(state);
    case 'INSURANCE':
      return resolveInsurance(state, action.accepted);
    case 'PLAY_DEALER':
      return playDealer(state);
    case 'SETTLE':
      return settleRound(state, action.mistakes);
    case 'NEW_ROUND':
      return startNewRound(state);
    case 'REBET_AND_DEAL':
      return rebetAndDeal(state);
    case 'DEALING_COMPLETE':
      return completeDeal(state);
    case 'CLEAR_BETS':
      return clearBets(state);
    case 'RESET_MONEY':
      return resetMoney(state);
    case 'RESET':
      return createInitialState(action.config ?? state.config);
    default:
      return state;
  }
}

type BlackjackGameProps = {
  gameConfig?: Partial<GameConfig>;
  chips?: ChipConfig[];
  trainerEnabled?: boolean;
};

export default function BlackjackGameScreen({
  gameConfig,
  chips = DEFAULT_CHIPS,
  trainerEnabled: initialTrainerEnabled = true,
}: BlackjackGameProps = {}) {
  const colorScheme = useColorScheme();
  const { token: authToken } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const haptics = useHaptics();
  const config: GameConfig = { ...DEFAULT_CONFIG, ...gameConfig };

  const [gameState, dispatch] = useReducer(
    gameReducer,
    config,
    (cfg) => createInitialState(cfg),
  );
  const [selectedChip, setSelectedChip] = useState<number>(chips[2]?.value ?? 25);
  const [showResult, setShowResult] = useState(false);
  const [visibleCardCount, setVisibleCardCount] = useState(0);
  const [trainingEnabled, setTrainingEnabled] = useState(initialTrainerEnabled);

  const trainer = useTrainer(gameState, trainingEnabled);

  // End training session and reset round counter on unmount
  useEffect(() => {
    resetRoundCounter();
    return () => {
      trainer.training.end(authToken ?? undefined).catch(() => {});
    };
  }, []);

  // Dealing animation: reveal cards one at a time
  useEffect(() => {
    if (gameState.phase !== 'dealing') {
      setVisibleCardCount(0);
      return;
    }
    const activeHands = gameState.playerHands;
    const totalCards = (activeHands.length * 2) + 2; // 2 per player hand + 2 dealer
    setVisibleCardCount(0);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCardCount(count);
      if (count >= totalCards) {
        clearInterval(interval);
        setTimeout(() => dispatch({ type: 'DEALING_COMPLETE' }), 200);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [gameState.phase]);

  // Auto-play dealer when entering dealer_turn
  useEffect(() => {
    if (gameState.phase === 'dealer_turn') {
      const timer = setTimeout(() => {
        dispatch({ type: 'PLAY_DEALER' });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase]);

  // Auto-settle after dealer plays
  useEffect(() => {
    if (gameState.phase === 'settlement' && !gameState.roundResult) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SETTLE', mistakes: trainer.mistakes });
        setShowResult(true);
        haptics.medium();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.roundResult]);

  // Send stats to backend after settlement
  useEffect(() => {
    if (gameState.roundResult && authToken) {
      sendStats();
    }
  }, [gameState.roundResult]);

  const sendStats = async () => {
    if (!gameState.roundResult || !authToken) return;
    const rr = gameState.roundResult;
    const overallResult = rr.totalPayout > totalBets() ? 'win' : rr.totalPayout === totalBets() ? 'push' : 'loss';

    try {
      await axios.post(
        `${API_URL}/stats`,
        {
          result: overallResult,
          mistakes: rr.mistakes,
          net_payout: rr.totalPayout - totalBets(),
          hands_played: gameState.playerHands.length,
          details: {
            hands: gameState.playerHands.map(h => ({
              cards: h.cards.map(formatCardShort),
              result: h.status,
              bet: h.bet,
            })),
            dealer_cards: gameState.dealerHand.map(formatCardShort),
            actions_taken: [],
          },
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (err) {
      // Stats save is best-effort, don't interrupt gameplay
      console.warn('Failed to save stats:', err);
    }
  };

  const totalBets = () => gameState.playerHands.reduce((sum, h) => sum + h.bet, 0);

  const handleAction = (action: string, dispatchAction: GameAction) => {
    haptics.light();
    trainer.checkAction(action);
    dispatch(dispatchAction);
  };

  const handleNewRound = () => {
    incrementRoundCounter();
    trainer.resetRound();
    setShowResult(false);
    dispatch({ type: 'NEW_ROUND' });
  };

  const toggleTraining = () => {
    setTrainingEnabled(prev => !prev);
  };

  const handlePlaceBet = (handIndex: number) => {
    if (gameState.phase !== 'betting') return;
    haptics.light();
    dispatch({ type: 'PLACE_BET', handIndex, amount: selectedChip });
  };

  const handleRemoveBet = (handIndex: number) => {
    if (gameState.phase !== 'betting') return;
    dispatch({ type: 'REMOVE_BET', handIndex });
  };

  const canDeal = gameState.phase === 'betting' && gameState.playerHands.some(h => h.bet > 0);
  const activeHand = gameState.phase === 'player_turn' ? gameState.playerHands[gameState.activeHandIndex] : null;
  const canHit = activeHand?.status === 'active';
  const canStand = activeHand?.status === 'active';
  const canDbl = activeHand ? canDouble(activeHand) && activeHand.bet <= gameState.balance : false;
  const canSpl = activeHand ? canSplit(activeHand, gameState.playerHands, gameState.config) && activeHand.bet <= gameState.balance : false;
  const canSur = activeHand ? canSurrender(activeHand) : false;
  const dealerScore = gameState.dealerHand.length > 0 ? scoreHand(gameState.dealerHand) : null;
  const shoeCount = gameState.shoe.length;

  // Build deal order for animation: round 1 (player hands then dealer), round 2 (player hands then dealer)
  const dealOrder: { type: 'player' | 'dealer'; handIdx: number; cardIdx: number }[] = [];
  if (gameState.phase === 'dealing') {
    for (let round = 0; round < 2; round++) {
      for (let h = 0; h < gameState.playerHands.length; h++) {
        dealOrder.push({ type: 'player', handIdx: h, cardIdx: round });
      }
      dealOrder.push({ type: 'dealer', handIdx: 0, cardIdx: round });
    }
  }

  // Determine visible cards for each area during dealing
  const getVisibleDealerCards = () => {
    if (gameState.phase !== 'dealing') return gameState.dealerHand.length;
    let count = 0;
    for (let i = 0; i < Math.min(visibleCardCount, dealOrder.length); i++) {
      if (dealOrder[i].type === 'dealer') count++;
    }
    return count;
  };

  const getVisiblePlayerCards = (handIdx: number) => {
    if (gameState.phase !== 'dealing') return gameState.playerHands[handIdx]?.cards.length ?? 0;
    let count = 0;
    for (let i = 0; i < Math.min(visibleCardCount, dealOrder.length); i++) {
      if (dealOrder[i].type === 'player' && dealOrder[i].handIdx === handIdx) count++;
    }
    return count;
  };

  const isDealing = gameState.phase === 'dealing';

  const chipColors: Record<number, string> = {};
  for (const chip of chips) {
    chipColors[chip.value] = chip.color;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon="arrow-back" onPress={() => router.back()} iconColor="#fff" style={styles.backButton} />
          <Text style={styles.balanceText}>${gameState.balance.toLocaleString()}</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon="bar-chart"
              onPress={() => router.push('/training-analytics')}
              iconColor="rgba(255,255,255,0.7)"
              size="sm"
              style={styles.helpButton}
            />
            <TouchableOpacity onPress={toggleTraining} style={styles.trainingToggle}>
              <MaterialIcons
                name={trainingEnabled ? 'school' : 'school'}
                size={18}
                color={trainingEnabled ? '#11d4c4' : 'rgba(255,255,255,0.4)'}
              />
              <Text style={[styles.trainingToggleText, trainingEnabled && styles.trainingToggleActive]}>
                {trainingEnabled ? t('training.trainingOn') : t('training.trainingOff')}
              </Text>
            </TouchableOpacity>
            <IconButton icon="help-outline" onPress={() => router.push('/how-to-play')} iconColor="rgba(255,255,255,0.7)" size="sm" style={styles.helpButton} />
            <View style={styles.shoeIndicator}>
              <MaterialIcons name="style" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.shoeText}>{shoeCount}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table rules text */}
          <Text style={styles.tableRulesText}>{t('game.blackjackPays')}</Text>

          {/* Shuffling indicator */}
          {shouldReshuffle(gameState.shoe, gameState.config) && gameState.phase === 'betting' && (
            <Animated.View entering={FadeIn} style={styles.shufflingBanner}>
              <Text style={styles.shufflingText}>{t('game.shuffling')}</Text>
            </Animated.View>
          )}

          {/* Dealer area */}
          <View style={styles.dealerArea}>
            <Text style={styles.dealerLabel}>{t('game.dealer')}</Text>
            <View style={styles.dealerCards}>
              {gameState.dealerHand.slice(0, getVisibleDealerCards()).map((card, i) => (
                <Animated.View key={i} entering={SlideInDown.duration(250).springify()} style={{ marginLeft: i > 0 ? -20 : 0, zIndex: i }}>
                  <PlayingCard card={card} size="md" />
                </Animated.View>
              ))}
            </View>
            {dealerScore && !isDealing && gameState.dealerHand.some(c => c.faceUp) && (
              <View style={styles.dealerScoreBubble}>
                <Text style={styles.dealerScoreText}>
                  {gameState.phase === 'settlement' || gameState.phase === 'dealer_turn'
                    ? dealerScore.display
                    : scoreHand(gameState.dealerHand.filter(c => c.faceUp)).display}
                </Text>
              </View>
            )}
          </View>

          {/* Player hands */}
          <View style={styles.playerArea}>
            {gameState.phase === 'betting' ? (
              // Betting circles
              <View style={styles.bettingCircles}>
                {Array.from({ length: gameState.config.maxHands }, (_, i) => (
                  <BettingCircle
                    key={i}
                    hand={gameState.playerHands[i]}
                    isActive={false}
                    onPress={() => handlePlaceBet(i)}
                    onLongPress={() => handleRemoveBet(i)}
                    betAmount={gameState.playerHands[i]?.bet || 0}
                    handLabel={t('game.hand', { num: i + 1 })}
                    chipConfigs={chips}
                  />
                ))}
              </View>
            ) : (
              // Active hands
              <View style={styles.bettingCircles}>
                {gameState.playerHands.map((hand, i) => {
                  const visCards = getVisiblePlayerCards(i);
                  const visibleHand = isDealing
                    ? { ...hand, cards: hand.cards.slice(0, visCards) }
                    : hand;
                  return (
                    <BettingCircle
                      key={i}
                      hand={visibleHand}
                      isActive={gameState.phase === 'player_turn' && i === gameState.activeHandIndex}
                      onPress={() => {}}
                      betAmount={hand.bet}
                      handLabel={gameState.playerHands.length > 1 ? t('game.hand', { num: i + 1 }) : undefined}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* Best play hint (only when trainer is enabled) */}
          {trainingEnabled && trainer.bestPlay && gameState.phase === 'player_turn' && (
            <Animated.View entering={FadeIn} style={styles.hintContainer}>
              <MaterialIcons name="lightbulb" size={14} color="#d69e2e" />
              <Text style={styles.hintText}>{t('game.bestPlay', { action: trainer.bestPlay.action.toUpperCase() })}</Text>
            </Animated.View>
          )}

          {/* Mistake flash (only when trainer is enabled) */}
          {trainingEnabled && trainer.lastAction && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.mistakeFlash}>
              <Text style={styles.mistakeText}>{t('game.optimalWas', { action: trainer.lastAction.toUpperCase() })}</Text>
            </Animated.View>
          )}
        </View>

        {/* Insurance modal */}
        {gameState.phase === 'insurance' && (
          <Animated.View entering={SlideInDown} style={styles.insuranceOverlay}>
            <View style={styles.insuranceModal}>
              <Text style={styles.insuranceTitle}>{t('game.insurance')}</Text>
              <Text style={styles.insuranceDesc}>
                {t('game.insuranceDesc', { amount: Math.floor((gameState.playerHands[0]?.bet || 0) / 2) })}
              </Text>
              {trainingEnabled && (
                <View style={styles.insuranceHint}>
                  <MaterialIcons name="lightbulb" size={14} color="#d69e2e" />
                  <Text style={styles.insuranceHintText}>{t('training.insuranceDecline')}</Text>
                </View>
              )}
              <View style={styles.insuranceButtons}>
                <Button
                  title={t('common.no')}
                  onPress={() => {
                    trainer.checkAction('insurance_no');
                    dispatch({ type: 'INSURANCE', accepted: false });
                  }}
                  variant="outline"
                  size="md"
                  style={{ flex: 1 }}
                  highlighted={trainingEnabled}
                />
                <Button
                  title={t('common.yes')}
                  onPress={() => {
                    trainer.checkAction('insurance_yes');
                    dispatch({ type: 'INSURANCE', accepted: true });
                  }}
                  variant="primary"
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Settlement result overlay */}
        {showResult && gameState.roundResult && (
          <Animated.View entering={FadeIn} style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                {gameState.roundResult.totalPayout > totalBets()
                  ? t('game.youWin')
                  : gameState.roundResult.totalPayout === totalBets()
                  ? t('game.push')
                  : t('game.dealerWins')}
              </Text>
              <View style={styles.resultDetails}>
                {gameState.roundResult.handResults.map((hr, i) => (
                  <Text key={i} style={styles.resultLine}>
                    {t('game.hand', { num: i + 1 })}: {hr.result.toUpperCase()} {hr.payout > 0 ? `+$${hr.payout}` : '$0'}
                  </Text>
                ))}
              </View>

              {/* Training: per-decision breakdown */}
              {trainingEnabled && trainer.training.roundDecisions.length > 0 && (
                <View style={styles.decisionBreakdown}>
                  <Text style={styles.decisionBreakdownTitle}>{t('training.roundDecisions')}</Text>
                  {trainer.training.roundDecisions.map((d, i) => (
                    <View key={i} style={styles.decisionRow}>
                      <MaterialIcons
                        name={d.isCorrect ? 'check-circle' : 'cancel'}
                        size={16}
                        color={d.isCorrect ? '#48bb78' : '#e53e3e'}
                      />
                      <Text style={styles.decisionText} numberOfLines={1}>
                        {d.isCorrect
                          ? t('training.youChose', { action: d.userAction.toUpperCase() })
                          : `${t('training.youChose', { action: d.userAction.toUpperCase() })} — ${t('training.optimalWas', { action: d.optimalAction.toUpperCase() })}`}
                      </Text>
                    </View>
                  ))}
                  {trainer.training.roundDecisions.every(d => d.isCorrect) && (
                    <Text style={styles.perfectRound}>{t('training.perfectRound')}</Text>
                  )}
                </View>
              )}

              {/* Training: compact session stats strip */}
              {trainingEnabled && trainer.training.summary && (
                <View style={styles.sessionStatsStrip}>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{t('training.accuracy')}</Text>
                    <Text style={styles.statChipValue}>
                      {Math.round(trainer.training.summary.overallAccuracy * 100)}%
                    </Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{t('training.streak')}</Text>
                    <Text style={styles.statChipValue}>{trainer.training.currentStreak}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{t('training.decisions')}</Text>
                    <Text style={styles.statChipValue}>{trainer.training.summary.totalDecisions}</Text>
                  </View>
                </View>
              )}

              {!trainingEnabled && gameState.roundResult.mistakes > 0 && (
                <Text style={styles.mistakesResult}>
                  {t('game.strategyMistakes', { count: gameState.roundResult.mistakes })}
                </Text>
              )}
              <Text style={styles.payoutText}>
                {t('game.net')}: {gameState.roundResult.totalPayout >= totalBets() ? '+' : ''}
                ${gameState.roundResult.totalPayout - totalBets()}
              </Text>
              <Button
                title={t('game.newHand')}
                onPress={handleNewRound}
                variant="primary"
                size="md"
              />
            </View>
          </Animated.View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {gameState.phase === 'betting' && (
            <>
              {/* Chip selector */}
              <View style={styles.chipSelector}>
                {chips.map(chip => (
                  <Button
                    key={chip.value}
                    title={`$${chip.value}`}
                    onPress={() => setSelectedChip(chip.value)}
                    variant="action"
                    size="sm"
                    style={[
                      styles.chipButton,
                      { backgroundColor: chip.color },
                      selectedChip === chip.value && styles.chipButtonSelected,
                    ]}
                    textStyle={styles.chipButtonText}
                  />
                ))}
              </View>
              <View style={styles.dealButtonRow}>
                {gameState.playerHands.some(h => h.bet > 0) && (
                  <Button
                    title={t('game.clearBets')}
                    onPress={() => dispatch({ type: 'CLEAR_BETS' })}
                    variant="outline"
                    size="lg"
                  />
                )}
                {gameState.previousBets.some(b => b > 0) && (
                  <Button
                    title={t('game.rebetAndDeal')}
                    onPress={() => {
                      incrementRoundCounter();
                      trainer.resetRound();
                      dispatch({ type: 'REBET_AND_DEAL' });
                    }}
                    variant="action"
                    size="lg"
                  />
                )}
                <Button
                  title={t('game.deal')}
                  onPress={() => dispatch({ type: 'DEAL' })}
                  variant="primary"
                  size="lg"
                  disabled={!canDeal}
                  style={{ flex: 1 }}
                />
              </View>
              {gameState.balance === 0 && (
                <Button
                  title={t('game.resetMoney')}
                  onPress={() => dispatch({ type: 'RESET_MONEY' })}
                  variant="destructive"
                  size="md"
                  fullWidth
                  style={{ marginTop: 8 }}
                />
              )}
            </>
          )}

          {gameState.phase === 'dealing' && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>{t('game.dealing')}</Text>
            </View>
          )}

          {gameState.phase === 'player_turn' && (
            <View style={styles.actionButtons}>
              <Button
                title={t('game.hit')}
                onPress={() => handleAction('hit', { type: 'HIT' })}
                variant="action"
                size="md"
                disabled={!canHit}
                highlighted={trainerEnabled && trainer.bestPlay?.action === 'hit'}
                style={{ flex: 1 }}
              />
              <Button
                title={t('game.stand')}
                onPress={() => handleAction('stand', { type: 'STAND' })}
                variant="action"
                size="md"
                disabled={!canStand}
                highlighted={trainerEnabled && trainer.bestPlay?.action === 'stand'}
                style={{ flex: 1 }}
              />
              <Button
                title={t('game.double')}
                onPress={() => handleAction('double', { type: 'DOUBLE' })}
                variant="action"
                size="md"
                disabled={!canDbl}
                highlighted={trainerEnabled && trainer.bestPlay?.action === 'double'}
                style={{ flex: 1 }}
              />
              <Button
                title={t('game.split')}
                onPress={() => handleAction('split', { type: 'SPLIT' })}
                variant="action"
                size="md"
                disabled={!canSpl}
                highlighted={trainerEnabled && trainer.bestPlay?.action === 'split'}
                style={{ flex: 1 }}
              />
              {canSur && (
                <Button
                  title={t('game.surrender')}
                  onPress={() => handleAction('surrender', { type: 'SURRENDER' })}
                  variant="action"
                  size="md"
                  highlighted={trainerEnabled && trainer.bestPlay?.action === 'surrender'}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}

          {gameState.phase === 'dealer_turn' && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>{t('game.dealerPlaying')}</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a1a18',
  },
  container: {
    flex: 1,
    backgroundColor: '#0a1a18',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceText: {
    color: '#11d4c4',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shoeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  table: {
    flex: 1,
    backgroundColor: '#0d5e3c',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    marginHorizontal: 8,
    marginTop: 4,
    paddingTop: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#8B6914',
  },
  tableRulesText: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 8,
  },
  shufflingBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 10,
  },
  shufflingText: {
    color: '#11d4c4',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  dealerArea: {
    alignItems: 'center',
    paddingTop: 16,
    minHeight: 140,
  },
  dealerLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  dealerCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 85,
    alignItems: 'center',
  },
  dealerScoreBubble: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  dealerScoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  bettingCircles: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hintText: {
    color: '#d69e2e',
    fontSize: 12,
    fontWeight: '600',
  },
  mistakeFlash: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(229, 62, 62, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mistakeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  insuranceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  insuranceModal: {
    backgroundColor: '#1c2726',
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH * 0.8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b5452',
  },
  insuranceTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insuranceDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  insuranceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  resultCard: {
    backgroundColor: '#1c2726',
    borderRadius: 20,
    padding: 28,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b5452',
  },
  resultTitle: {
    color: '#11d4c4',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultDetails: {
    width: '100%',
    gap: 6,
    marginBottom: 12,
  },
  resultLine: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  mistakesResult: {
    color: '#e53e3e',
    fontSize: 13,
    marginBottom: 8,
  },
  payoutText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  chipSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipButtonSelected: {
    borderColor: '#11d4c4',
    transform: [{ scale: 1.1 }],
    shadowColor: '#11d4c4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  chipButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dealButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  waitingContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  trainingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  trainingToggleText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  trainingToggleActive: {
    color: '#11d4c4',
  },
  insuranceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(214,158,46,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  insuranceHintText: {
    color: '#d69e2e',
    fontSize: 12,
    fontWeight: '600',
  },
  decisionBreakdown: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  decisionBreakdownTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  decisionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
  },
  perfectRound: {
    color: '#48bb78',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  sessionStatsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(17,212,196,0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statChipLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
  },
  statChipValue: {
    color: '#11d4c4',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
