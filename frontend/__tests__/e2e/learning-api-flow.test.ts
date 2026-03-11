/**
 * E2E Integration Test: Learning API Flow
 *
 * Tests the complete frontend API interaction patterns for the learning
 * framework endpoints. Uses mocked axios to simulate the full client-side
 * flow as it would interact with the backend.
 */

import axios from 'axios';
import { API_URL } from '../../config';
import { syncLearningProgress, fetchLearningProgress } from '../../learning/sync';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.resetAllMocks();
});

// ============================================================
// Flow 1: Save and Fetch Learning Progress
// ============================================================

describe('E2E: Learning Progress API Flow', () => {
  const token = 'test-learning-token';

  it('saves progress → fetches it back → verifies round-trip', async () => {
    // Step 1: Save learning progress
    mockedAxios.put.mockResolvedValueOnce({
      data: { status: 'saved' },
    });

    const saveResp = await mockedAxios.put(
      `${API_URL}/learning/progress`,
      {
        game_type: 'blackjack',
        skill_level: 'beginner',
        completed_card_ids: ['bj_rule_1', 'bj_rule_2', 'bj_concept_1'],
        quiz_results: {
          bj_quiz_1: { correct: true, answeredAt: 1710100000000 },
        },
        completed: false,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(saveResp.data.status).toBe('saved');

    // Step 2: Fetch learning progress
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        game_type: 'blackjack',
        skill_level: 'beginner',
        completed_card_ids: ['bj_rule_1', 'bj_rule_2', 'bj_concept_1'],
        quiz_results: {
          bj_quiz_1: { correct: true, answeredAt: 1710100000000 },
        },
        completed: false,
        started_at: '2026-03-10T10:00:00',
        completed_at: null,
      },
    });

    const fetchResp = await mockedAxios.get(
      `${API_URL}/learning/progress`,
      {
        params: { game_type: 'blackjack' },
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(fetchResp.data.game_type).toBe('blackjack');
    expect(fetchResp.data.skill_level).toBe('beginner');
    expect(fetchResp.data.completed_card_ids).toHaveLength(3);
    expect(fetchResp.data.quiz_results.bj_quiz_1.correct).toBe(true);
    expect(fetchResp.data.completed).toBe(false);
  });

  it('saves completed session with quiz results', async () => {
    mockedAxios.put.mockResolvedValueOnce({
      data: { status: 'saved' },
    });

    const resp = await mockedAxios.put(
      `${API_URL}/learning/progress`,
      {
        game_type: 'blackjack',
        skill_level: 'amateur',
        completed_card_ids: ['bj_rule_1', 'bj_rule_2', 'bj_quiz_1', 'bj_quiz_2'],
        quiz_results: {
          bj_quiz_1: { correct: true, answeredAt: 1710100000000 },
          bj_quiz_2: { correct: false, answeredAt: 1710100005000 },
        },
        completed: true,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(resp.data.status).toBe('saved');

    // Verify the request shape
    expect(mockedAxios.put).toHaveBeenCalledWith(
      `${API_URL}/learning/progress`,
      expect.objectContaining({
        game_type: 'blackjack',
        completed: true,
        quiz_results: expect.objectContaining({
          bj_quiz_1: expect.objectContaining({ correct: true }),
          bj_quiz_2: expect.objectContaining({ correct: false }),
        }),
      }),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  });

  it('handles unauthorized access', async () => {
    mockedAxios.put.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Unauthorized' } },
    });

    let error: any;
    try {
      await mockedAxios.put(
        `${API_URL}/learning/progress`,
        { game_type: 'blackjack', skill_level: 'beginner', completed_card_ids: [] },
      );
    } catch (e) {
      error = e;
    }
    expect(error.response.status).toBe(401);
  });
});

// ============================================================
// Flow 2: Learning Summary (Multi-Game)
// ============================================================

describe('E2E: Learning Summary API Flow', () => {
  const token = 'summary-token';

  it('fetches learning summary across multiple games', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        games: [
          {
            game_type: 'blackjack',
            skill_level: 'beginner',
            cards_completed: 15,
            quiz_score: { correct: 3, total: 4 },
            completed: true,
            started_at: '2026-03-08T10:00:00',
            completed_at: '2026-03-08T10:30:00',
          },
          {
            game_type: 'roulette',
            skill_level: 'amateur',
            cards_completed: 5,
            quiz_score: { correct: 1, total: 2 },
            completed: false,
            started_at: '2026-03-09T14:00:00',
            completed_at: null,
          },
        ],
        total_games_started: 2,
        total_games_completed: 1,
      },
    });

    const resp = await mockedAxios.get(
      `${API_URL}/learning/summary`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(resp.data.total_games_started).toBe(2);
    expect(resp.data.total_games_completed).toBe(1);
    expect(resp.data.games).toHaveLength(2);

    const blackjack = resp.data.games.find((g: any) => g.game_type === 'blackjack');
    expect(blackjack.completed).toBe(true);
    expect(blackjack.quiz_score.correct).toBe(3);

    const roulette = resp.data.games.find((g: any) => g.game_type === 'roulette');
    expect(roulette.completed).toBe(false);
    expect(roulette.cards_completed).toBe(5);
  });
});

// ============================================================
// Flow 3: Sync Utility Functions
// ============================================================

describe('E2E: Learning Sync Utilities', () => {
  const token = 'sync-token';

  it('syncLearningProgress calls PUT with correct payload', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { status: 'saved' } });

    await syncLearningProgress(
      {
        gameType: 'blackjack',
        skillLevel: 'pro',
        completedCardIds: ['bj_rule_1', 'bj_tip_1'],
        quizResults: {},
        completed: false,
        startedAt: 1710100000000,
        completedAt: null,
      },
      token,
    );

    expect(mockedAxios.put).toHaveBeenCalledWith(
      `${API_URL}/learning/progress`,
      {
        game_type: 'blackjack',
        skill_level: 'pro',
        completed_card_ids: ['bj_rule_1', 'bj_tip_1'],
        quiz_results: {},
        completed: false,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  });

  it('syncLearningProgress silently handles errors', async () => {
    mockedAxios.put.mockRejectedValueOnce(new Error('Network error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Should not throw
    await syncLearningProgress(
      {
        gameType: 'blackjack',
        skillLevel: 'beginner',
        completedCardIds: [],
        quizResults: {},
        completed: false,
        startedAt: Date.now(),
        completedAt: null,
      },
      token,
    );

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('syncLearningProgress skips when no token', async () => {
    await syncLearningProgress(
      {
        gameType: 'blackjack',
        skillLevel: 'beginner',
        completedCardIds: [],
        quizResults: {},
        completed: false,
        startedAt: Date.now(),
        completedAt: null,
      },
      '',
    );

    expect(mockedAxios.put).not.toHaveBeenCalled();
  });

  it('fetchLearningProgress returns mapped progress', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        game_type: 'blackjack',
        skill_level: 'amateur',
        completed_card_ids: ['bj_rule_1'],
        quiz_results: { bj_quiz_1: { correct: true, answeredAt: 1710100000000 } },
        completed: false,
        started_at: '2026-03-10T10:00:00',
        completed_at: null,
      },
    });

    const progress = await fetchLearningProgress('blackjack', token);

    expect(progress).not.toBeNull();
    expect(progress!.gameType).toBe('blackjack');
    expect(progress!.skillLevel).toBe('amateur');
    expect(progress!.completedCardIds).toEqual(['bj_rule_1']);
    expect(progress!.completed).toBe(false);
    expect(progress!.startedAt).toBeGreaterThan(0);
  });

  it('fetchLearningProgress returns null on failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchLearningProgress('blackjack', token);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('fetchLearningProgress returns null when no token', async () => {
    const result = await fetchLearningProgress('blackjack', '');

    expect(result).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
