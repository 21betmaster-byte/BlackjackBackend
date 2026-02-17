import React, { useReducer, useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
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
import { API_URL } from '../config';
import PlayingCard from '../components/PlayingCard';
import BettingCircle from '../components/BettingCircle';
import {
  GameState,
  GamePhase,
  GameConfig,
  DEFAULT_CONFIG,
  createInitialState,
  placeBet,
  removeBet,
  dealInitialCards,
  checkDealerPeek,
  resolveInsurance,
  playerHit,
  playerStand,
  playerDouble,
  playerSplit,
  playDealer,
  settleRound,
  startNewRound,
  scoreHand,
  canSplit,
  canDouble,
  shouldReshuffle,
  formatCardShort,
} from '../game/engine';
import { useTrainer } from '../game/useTrainer';
import { DEFAULT_CHIPS, ChipConfig } from '../game/types';

// Reducer
type GameAction =
  | { type: 'PLACE_BET'; handIndex: number; amount: number }
  | { type: 'REMOVE_BET'; handIndex: number }
  | { type: 'DEAL' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'DOUBLE' }
  | { type: 'SPLIT' }
  | { type: 'INSURANCE'; accepted: boolean }
  | { type: 'PLAY_DEALER' }
  | { type: 'SETTLE'; mistakes: number }
  | { type: 'NEW_ROUND' }
  | { type: 'RESET'; config?: GameConfig };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_BET':
      return placeBet(state, action.handIndex, action.amount);
    case 'REMOVE_BET':
      return removeBet(state, action.handIndex);
    case 'DEAL': {
      let newState = dealInitialCards(state);
      // Check for dealer peek
      const peek = checkDealerPeek(newState);
      if (peek.offerInsurance) {
        newState = { ...newState, phase: 'insurance' };
      } else if (peek.hasBlackjack) {
        // Dealer has blackjack with 10 showing, go straight to settlement
        newState = { ...newState, phase: 'dealer_turn' };
        newState = playDealer(newState);
      }
      return newState;
    }
    case 'HIT':
      return playerHit(state);
    case 'STAND':
      return playerStand(state);
    case 'DOUBLE':
      return playerDouble(state);
    case 'SPLIT':
      return playerSplit(state);
    case 'INSURANCE':
      return resolveInsurance(state, action.accepted);
    case 'PLAY_DEALER':
      return playDealer(state);
    case 'SETTLE':
      return settleRound(state, action.mistakes);
    case 'NEW_ROUND':
      return startNewRound(state);
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
  trainerEnabled = true,
}: BlackjackGameProps = {}) {
  const colorScheme = useColorScheme();
  const { token: authToken } = useAuth();
  const toast = useToast();

  const config: GameConfig = { ...DEFAULT_CONFIG, ...gameConfig };

  const [gameState, dispatch] = useReducer(
    gameReducer,
    config,
    (cfg) => createInitialState(cfg),
  );
  const [selectedChip, setSelectedChip] = useState<number>(chips[2]?.value ?? 25);
  const [showResult, setShowResult] = useState(false);

  const trainer = useTrainer(gameState, trainerEnabled);

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
    trainer.checkAction(action);
    dispatch(dispatchAction);
  };

  const handleNewRound = () => {
    trainer.resetRound();
    setShowResult(false);
    dispatch({ type: 'NEW_ROUND' });
  };

  const handlePlaceBet = (handIndex: number) => {
    if (gameState.phase !== 'betting') return;
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
  const dealerScore = gameState.dealerHand.length > 0 ? scoreHand(gameState.dealerHand) : null;
  const shoeCount = gameState.shoe.length;

  const chipColors: Record<number, string> = {};
  for (const chip of chips) {
    chipColors[chip.value] = chip.color;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.balanceText}>${gameState.balance.toLocaleString()}</Text>
          <View style={styles.shoeIndicator}>
            <MaterialIcons name="style" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.shoeText}>{shoeCount}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table rules text */}
          <Text style={styles.tableRulesText}>BLACKJACK PAYS 3 TO 2</Text>

          {/* Shuffling indicator */}
          {shouldReshuffle(gameState.shoe, gameState.config) && gameState.phase === 'betting' && (
            <Animated.View entering={FadeIn} style={styles.shufflingBanner}>
              <Text style={styles.shufflingText}>SHUFFLING...</Text>
            </Animated.View>
          )}

          {/* Dealer area */}
          <View style={styles.dealerArea}>
            <Text style={styles.dealerLabel}>DEALER</Text>
            <View style={styles.dealerCards}>
              {gameState.dealerHand.map((card, i) => (
                <Animated.View key={i} entering={FadeIn.delay(i * 150)} style={{ marginLeft: i > 0 ? -20 : 0, zIndex: i }}>
                  <PlayingCard card={card} size="md" />
                </Animated.View>
              ))}
            </View>
            {dealerScore && gameState.dealerHand.some(c => c.faceUp) && (
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
                    onPress={() => {
                      if (gameState.playerHands[i]) {
                        handleRemoveBet(i);
                      } else {
                        handlePlaceBet(i);
                      }
                    }}
                    betAmount={gameState.playerHands[i]?.bet || 0}
                    handLabel={`Hand ${i + 1}`}
                  />
                ))}
              </View>
            ) : (
              // Active hands
              <View style={styles.bettingCircles}>
                {gameState.playerHands.map((hand, i) => (
                  <BettingCircle
                    key={i}
                    hand={hand}
                    isActive={gameState.phase === 'player_turn' && i === gameState.activeHandIndex}
                    onPress={() => {}}
                    betAmount={hand.bet}
                    handLabel={gameState.playerHands.length > 1 ? `Hand ${i + 1}` : undefined}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Best play hint (only when trainer is enabled) */}
          {trainerEnabled && trainer.bestPlay && gameState.phase === 'player_turn' && (
            <Animated.View entering={FadeIn} style={styles.hintContainer}>
              <MaterialIcons name="lightbulb" size={14} color="#d69e2e" />
              <Text style={styles.hintText}>Best play: {trainer.bestPlay.action.toUpperCase()}</Text>
            </Animated.View>
          )}

          {/* Mistake flash (only when trainer is enabled) */}
          {trainerEnabled && trainer.lastAction && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.mistakeFlash}>
              <Text style={styles.mistakeText}>Optimal was: {trainer.lastAction.toUpperCase()}</Text>
            </Animated.View>
          )}
        </View>

        {/* Insurance modal */}
        {gameState.phase === 'insurance' && (
          <Animated.View entering={SlideInDown} style={styles.insuranceOverlay}>
            <View style={styles.insuranceModal}>
              <Text style={styles.insuranceTitle}>Insurance?</Text>
              <Text style={styles.insuranceDesc}>
                Dealer shows Ace. Take insurance for ${Math.floor((gameState.playerHands[0]?.bet || 0) / 2)}?
              </Text>
              <View style={styles.insuranceButtons}>
                <TouchableOpacity
                  style={[styles.insuranceBtn, styles.insuranceBtnNo]}
                  onPress={() => dispatch({ type: 'INSURANCE', accepted: false })}
                >
                  <Text style={styles.insuranceBtnText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.insuranceBtn, styles.insuranceBtnYes]}
                  onPress={() => dispatch({ type: 'INSURANCE', accepted: true })}
                >
                  <Text style={styles.insuranceBtnText}>Yes</Text>
                </TouchableOpacity>
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
                  ? 'You Win!'
                  : gameState.roundResult.totalPayout === totalBets()
                  ? 'Push'
                  : 'Dealer Wins'}
              </Text>
              <View style={styles.resultDetails}>
                {gameState.roundResult.handResults.map((hr, i) => (
                  <Text key={i} style={styles.resultLine}>
                    Hand {i + 1}: {hr.result.toUpperCase()} {hr.payout > 0 ? `+$${hr.payout}` : '$0'}
                  </Text>
                ))}
              </View>
              {trainerEnabled && gameState.roundResult.mistakes > 0 && (
                <Text style={styles.mistakesResult}>
                  Strategy mistakes: {gameState.roundResult.mistakes}
                </Text>
              )}
              <Text style={styles.payoutText}>
                Net: {gameState.roundResult.totalPayout >= totalBets() ? '+' : ''}
                ${gameState.roundResult.totalPayout - totalBets()}
              </Text>
              <TouchableOpacity style={styles.newRoundBtn} onPress={handleNewRound}>
                <Text style={styles.newRoundBtnText}>New Hand</Text>
              </TouchableOpacity>
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
                  <TouchableOpacity
                    key={chip.value}
                    style={[
                      styles.chipButton,
                      { backgroundColor: chip.color },
                      selectedChip === chip.value && styles.chipButtonSelected,
                    ]}
                    onPress={() => setSelectedChip(chip.value)}
                  >
                    <Text style={styles.chipButtonText}>${chip.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.dealButton, !canDeal && styles.dealButtonDisabled]}
                onPress={() => dispatch({ type: 'DEAL' })}
                disabled={!canDeal}
              >
                <Text style={styles.dealButtonText}>DEAL</Text>
              </TouchableOpacity>
            </>
          )}

          {gameState.phase === 'player_turn' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, !canHit && styles.actionBtnDisabled, trainerEnabled && trainer.bestPlay?.action === 'hit' && styles.actionBtnRecommended]}
                onPress={() => handleAction('hit', { type: 'HIT' })}
                disabled={!canHit}
              >
                <Text style={styles.actionBtnText}>HIT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, !canStand && styles.actionBtnDisabled, trainerEnabled && trainer.bestPlay?.action === 'stand' && styles.actionBtnRecommended]}
                onPress={() => handleAction('stand', { type: 'STAND' })}
                disabled={!canStand}
              >
                <Text style={styles.actionBtnText}>STAND</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, !canDbl && styles.actionBtnDisabled, trainerEnabled && trainer.bestPlay?.action === 'double' && styles.actionBtnRecommended]}
                onPress={() => handleAction('double', { type: 'DOUBLE' })}
                disabled={!canDbl}
              >
                <Text style={styles.actionBtnText}>DOUBLE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, !canSpl && styles.actionBtnDisabled, trainerEnabled && trainer.bestPlay?.action === 'split' && styles.actionBtnRecommended]}
                onPress={() => handleAction('split', { type: 'SPLIT' })}
                disabled={!canSpl}
              >
                <Text style={styles.actionBtnText}>SPLIT</Text>
              </TouchableOpacity>
            </View>
          )}

          {gameState.phase === 'dealer_turn' && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>Dealer playing...</Text>
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
    fontSize: 14,
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
  insuranceBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insuranceBtnNo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  insuranceBtnYes: {
    backgroundColor: '#11d4c4',
  },
  insuranceBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  newRoundBtn: {
    backgroundColor: '#11d4c4',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newRoundBtnText: {
    color: '#0a1a18',
    fontSize: 16,
    fontWeight: 'bold',
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
  dealButton: {
    backgroundColor: '#11d4c4',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#11d4c4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dealButtonDisabled: {
    backgroundColor: 'rgba(17, 212, 196, 0.3)',
    shadowOpacity: 0,
  },
  dealButtonText: {
    color: '#0a1a18',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionBtnDisabled: {
    opacity: 0.3,
  },
  actionBtnRecommended: {
    borderColor: '#d69e2e',
    borderWidth: 2,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
});
