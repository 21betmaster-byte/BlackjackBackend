// useLearningSession — React hook managing the swipable card deck state.

import { useState, useCallback, useEffect, useRef } from 'react';
import { LearningCard, LearningProgress, SkillLevel } from './types';
import { getProvider } from './registry';
import { saveLearningProgress, loadLearningProgress } from './storage';
import { syncLearningProgress, fetchLearningProgress } from './sync';
import { useAuth } from '../contexts/AuthContext';

export interface UseLearningSessionReturn {
  cards: LearningCard[];
  currentIndex: number;
  currentCard: LearningCard | null;
  progress: LearningProgress;
  totalCards: number;
  completedCount: number;
  isComplete: boolean;
  isLoading: boolean;
  swipeRight: () => void;
  swipeLeft: () => void;
  answerQuiz: (optionIndex: number) => { correct: boolean };
  restart: (level?: SkillLevel) => void;
}

function createEmptyProgress(gameType: string, skillLevel: SkillLevel): LearningProgress {
  return {
    gameType,
    skillLevel,
    completedCardIds: [],
    quizResults: {},
    completed: false,
    startedAt: Date.now(),
    completedAt: null,
  };
}

export function useLearningSession(
  gameType: string,
  skillLevel: SkillLevel,
): UseLearningSessionReturn {
  const { token: authToken } = useAuth();
  const provider = getProvider(gameType);
  const allCards = provider ? provider.getCards(skillLevel) : [];

  const [deck, setDeck] = useState<LearningCard[]>(allCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<LearningProgress>(
    createEmptyProgress(gameType, skillLevel),
  );
  const [isLoading, setIsLoading] = useState(true);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Load saved progress on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadLearningProgress(gameType);
      if (!mounted) return;
      if (saved && saved.skillLevel === skillLevel && !saved.completed) {
        setProgress(saved);
        // Rebuild deck: remove already completed cards from the front
        const remaining = allCards.filter(c => !saved.completedCardIds.includes(c.id));
        setDeck(remaining);
        setCurrentIndex(0);
      }
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, [gameType, skillLevel]);

  const persist = useCallback(async (p: LearningProgress) => {
    try {
      await saveLearningProgress(p);
      // Best-effort backend sync
      if (authToken) {
        syncLearningProgress(p, authToken).catch(() => {});
      }
    } catch {
      // Best-effort persistence
    }
  }, [authToken]);

  const swipeRight = useCallback(() => {
    const card = deck[currentIndex];
    if (!card) return;

    const updated: LearningProgress = {
      ...progressRef.current,
      completedCardIds: [...progressRef.current.completedCardIds, card.id],
    };

    const isLast = currentIndex >= deck.length - 1;
    if (isLast) {
      updated.completed = true;
      updated.completedAt = Date.now();
    }

    setProgress(updated);
    progressRef.current = updated;
    persist(updated);

    if (!isLast) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, deck, persist]);

  const swipeLeft = useCallback(() => {
    const card = deck[currentIndex];
    if (!card) return;
    // Move current card to end of deck
    setDeck(prev => {
      const next = [...prev];
      next.splice(currentIndex, 1);
      next.push(card);
      return next;
    });
    // currentIndex stays the same (next card slides in)
  }, [currentIndex, deck]);

  const answerQuiz = useCallback((optionIndex: number): { correct: boolean } => {
    const card = deck[currentIndex];
    if (!card?.quiz) return { correct: false };

    const correct = optionIndex === card.quiz.correctIndex;
    const updated: LearningProgress = {
      ...progressRef.current,
      quizResults: {
        ...progressRef.current.quizResults,
        [card.id]: { correct, answeredAt: Date.now() },
      },
    };
    setProgress(updated);
    progressRef.current = updated;
    persist(updated);
    return { correct };
  }, [currentIndex, deck, persist]);

  const restart = useCallback((level?: SkillLevel) => {
    const newLevel = level ?? skillLevel;
    const freshCards = provider ? provider.getCards(newLevel) : [];
    const freshProgress = createEmptyProgress(gameType, newLevel);
    setDeck(freshCards);
    setCurrentIndex(0);
    setProgress(freshProgress);
    progressRef.current = freshProgress;
    persist(freshProgress);
  }, [gameType, skillLevel, provider, persist]);

  const currentCard = deck[currentIndex] ?? null;
  const isComplete = progress.completed;
  const completedCount = progress.completedCardIds.length;

  return {
    cards: deck,
    currentIndex,
    currentCard,
    progress,
    totalCards: allCards.length,
    completedCount,
    isComplete,
    isLoading,
    swipeRight,
    swipeLeft,
    answerQuiz,
    restart,
  };
}
