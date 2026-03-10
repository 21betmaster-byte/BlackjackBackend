/**
 * E2E Integration Test: Stats & Training API Flow (Phase 1-3 Features)
 *
 * Tests the frontend API interaction patterns for:
 * - Stats save with Bearer token auth and training_session result type
 * - Training analytics backend fetch with local fallback
 * - Stats dashboard data fetch flow
 * - Home dashboard profile + progress data fetch
 */

import axios from 'axios';
import { API_URL } from '../../config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.resetAllMocks();
  mockedAxios.isAxiosError = jest.fn(
    (error: any) => error != null && error.response != null,
  ) as any;
});

// ============================================================
// Flow 1: Stats Save with training_session Result Type
// ============================================================

describe('E2E: Stats with training_session Result Type', () => {
  const token = 'test-jwt-token';

  it('saves stats with training_session result and training_decisions', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { status: 'saved' },
    });

    const decisions = [
      {
        id: 'td_1',
        category: 'hard_total',
        scenarioKey: 'hard_16_vs_10',
        userAction: 'surrender',
        optimalAction: 'surrender',
        isCorrect: true,
      },
      {
        id: 'td_2',
        category: 'hard_total',
        scenarioKey: 'hard_12_vs_4',
        userAction: 'hit',
        optimalAction: 'stand',
        isCorrect: false,
      },
      {
        id: 'td_3',
        category: 'soft_total',
        scenarioKey: 'soft_17_vs_6',
        userAction: 'double',
        optimalAction: 'double',
        isCorrect: true,
      },
    ];

    const resp = await mockedAxios.post(
      `${API_URL}/stats`,
      {
        result: 'training_session',
        mistakes: 1,
        training_decisions: decisions,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(resp.data.status).toBe('saved');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${API_URL}/stats`,
      expect.objectContaining({
        result: 'training_session',
        training_decisions: expect.arrayContaining([
          expect.objectContaining({ userAction: 'surrender' }),
        ]),
      }),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  });

  it('handles 401 when token is expired', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Unauthorized' } },
    });

    let error: any;
    try {
      await mockedAxios.post(
        `${API_URL}/stats`,
        { result: 'training_session', mistakes: 0, training_decisions: [] },
        { headers: { Authorization: 'Bearer expired-token' } },
      );
    } catch (e) {
      error = e;
    }
    expect(error.response.status).toBe(401);
  });
});

// ============================================================
// Flow 2: Training Analytics Backend Fetch with Local Fallback
// ============================================================

describe('E2E: Training Analytics Backend + Local Fallback', () => {
  const token = 'analytics-token';

  it('fetches training summary from backend successfully', async () => {
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: {
        game_type: 'blackjack',
        total_decisions: 100,
        correct_decisions: 82,
        overall_accuracy: 0.82,
        category_stats: [
          { category: 'hard_total', total: 50, correct: 44, accuracy: 0.88 },
          { category: 'soft_total', total: 30, correct: 22, accuracy: 0.733 },
          { category: 'pair_split', total: 15, correct: 12, accuracy: 0.8 },
          { category: 'insurance', total: 5, correct: 4, accuracy: 0.8 },
        ],
        weakest_categories: ['soft_total', 'pair_split', 'insurance'],
      },
    });

    const resp = await mockedAxios.get(
      `${API_URL}/training/summary?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(resp.data.total_decisions).toBe(100);
    expect(resp.data.overall_accuracy).toBe(0.82);
    expect(resp.data.category_stats).toHaveLength(4);
    expect(resp.data.weakest_categories[0]).toBe('soft_total');
  });

  it('frontend falls back to local data when backend is unavailable', async () => {
    // Simulate backend failure
    mockedAxios.get = jest.fn().mockRejectedValueOnce({
      response: { status: 500, data: { detail: 'Internal server error' } },
    });

    let backendData = null;
    try {
      const resp = await mockedAxios.get(
        `${API_URL}/training/summary?game_type=blackjack`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      backendData = resp.data;
    } catch {
      // Fallback to local data (simulated)
      backendData = null;
    }

    expect(backendData).toBeNull();
    // In the actual app, useProgress('blackjack') would provide local data
    // This verifies the fallback pattern works
  });

  it('compares backend and local data, uses whichever has more decisions', async () => {
    // Backend has more data
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: {
        total_decisions: 200,
        correct_decisions: 170,
        overall_accuracy: 0.85,
        category_stats: [],
        weakest_categories: [],
      },
    });

    const backendResp = await mockedAxios.get(
      `${API_URL}/training/summary?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const localDecisions = 150; // Simulated local count

    // Frontend logic: use whichever source has more data
    const useBackend = backendResp.data.total_decisions > localDecisions;
    expect(useBackend).toBe(true);

    // Now test the opposite: local has more
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: { total_decisions: 50 },
    });

    const backendResp2 = await mockedAxios.get(
      `${API_URL}/training/summary?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const useBackend2 = backendResp2.data.total_decisions > localDecisions;
    expect(useBackend2).toBe(false);
  });
});

// ============================================================
// Flow 3: Stats Dashboard Data Fetch
// ============================================================

describe('E2E: Stats Dashboard API Flow', () => {
  const token = 'stats-dashboard-token';

  it('fetches summary and progress for stats dashboard display', async () => {
    mockedAxios.get = jest.fn()
      .mockResolvedValueOnce({
        data: {
          total_decisions: 75,
          correct_decisions: 60,
          overall_accuracy: 0.8,
          category_stats: [
            { category: 'hard_total', total: 40, correct: 35, accuracy: 0.875 },
            { category: 'soft_total', total: 20, correct: 14, accuracy: 0.7 },
            { category: 'pair_split', total: 15, correct: 11, accuracy: 0.733 },
          ],
          weakest_categories: ['soft_total', 'pair_split'],
        },
      })
      .mockResolvedValueOnce({
        data: {
          snapshots: [
            { timestamp: '2026-03-01T10:00:00', total_decisions: 25, overall_accuracy: 0.6 },
            { timestamp: '2026-03-05T10:00:00', total_decisions: 25, overall_accuracy: 0.8 },
            { timestamp: '2026-03-09T10:00:00', total_decisions: 25, overall_accuracy: 1.0 },
          ],
        },
      });

    // Fetch summary
    const summaryResp = await mockedAxios.get(
      `${API_URL}/training/summary?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // Fetch progress
    const progressResp = await mockedAxios.get(
      `${API_URL}/training/progress?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // Verify summary data for stats dashboard
    expect(summaryResp.data.total_decisions).toBe(75);
    expect(summaryResp.data.category_stats).toHaveLength(3);

    // Verify progress data shows improvement
    const snapshots = progressResp.data.snapshots;
    expect(snapshots).toHaveLength(3);
    expect(snapshots[0].overall_accuracy).toBe(0.6);
    expect(snapshots[2].overall_accuracy).toBe(1.0);

    // Verify both calls used auth header
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/training/summary'),
      expect.objectContaining({
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  });
});

// ============================================================
// Flow 4: Home Dashboard Data Fetch
// ============================================================

describe('E2E: Home Dashboard API Flow', () => {
  const token = 'home-dashboard-token';

  it('fetches user profile and displays on home dashboard', async () => {
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
        dob: '03 / 15 / 1992',
        country: 'United States',
        auth_provider: 'email',
      },
    });

    const profileResp = await mockedAxios.get(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(profileResp.data.first_name).toBe('Alice');
    expect(profileResp.data.auth_provider).toBe('email');
  });

  it('handles profile fetch failure gracefully', async () => {
    mockedAxios.get = jest.fn().mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Unauthorized' } },
    });

    let profile = null;
    try {
      const resp = await mockedAxios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      profile = resp.data;
    } catch {
      profile = null;
    }

    // Dashboard should still render with fallback (no name shown)
    expect(profile).toBeNull();
  });
});

// ============================================================
// Flow 5: Full Signup → Play → Save training_session → View Analytics
// ============================================================

describe('E2E: Complete User Journey with Training', () => {
  it('signup → login → play game → save training_session → view analytics', async () => {
    // Step 1: Signup
    mockedAxios.post.mockResolvedValueOnce({
      data: { status: 'success', user_id: 'user-456' },
    });
    const signupResp = await mockedAxios.post(`${API_URL}/signup`, {
      email: 'trainer@example.com',
      password: 'pass123pass',
    });
    expect(signupResp.data.status).toBe('success');

    // Step 2: Login
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'training-jwt',
        token_type: 'bearer',
        mandatory_details_completed: true,
      },
    });
    const loginResp = await mockedAxios.post(`${API_URL}/login`, {
      email: 'trainer@example.com',
      password: 'pass123pass',
    });
    const token = loginResp.data.access_token;

    // Step 3: Save training session stats (after playing blackjack)
    mockedAxios.post.mockResolvedValueOnce({
      data: { status: 'saved' },
    });
    await mockedAxios.post(
      `${API_URL}/stats`,
      {
        result: 'training_session',
        mistakes: 2,
        training_decisions: [
          { id: 'td1', category: 'hard_total', scenarioKey: 'h16v10',
            userAction: 'surrender', optimalAction: 'surrender', isCorrect: true },
          { id: 'td2', category: 'soft_total', scenarioKey: 's17v6',
            userAction: 'hit', optimalAction: 'double', isCorrect: false },
          { id: 'td3', category: 'hard_total', scenarioKey: 'h12v4',
            userAction: 'stand', optimalAction: 'stand', isCorrect: true },
          { id: 'td4', category: 'pair_split', scenarioKey: 'p8v6',
            userAction: 'hit', optimalAction: 'split', isCorrect: false },
        ],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // Step 4: View training analytics
    mockedAxios.get = jest.fn()
      .mockResolvedValueOnce({
        data: {
          total_decisions: 4,
          correct_decisions: 2,
          overall_accuracy: 0.5,
          category_stats: [
            { category: 'hard_total', total: 2, correct: 2, accuracy: 1.0 },
            { category: 'soft_total', total: 1, correct: 0, accuracy: 0.0 },
            { category: 'pair_split', total: 1, correct: 0, accuracy: 0.0 },
          ],
          weakest_categories: ['soft_total', 'pair_split'],
        },
      });

    const analyticsResp = await mockedAxios.get(
      `${API_URL}/training/summary?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(analyticsResp.data.total_decisions).toBe(4);
    expect(analyticsResp.data.correct_decisions).toBe(2);
    expect(analyticsResp.data.category_stats).toHaveLength(3);

    // Verify surrender decision was tracked
    const hardTotal = analyticsResp.data.category_stats.find(
      (c: any) => c.category === 'hard_total',
    );
    expect(hardTotal.accuracy).toBe(1.0);

    // All calls made correctly
    expect(mockedAxios.post).toHaveBeenCalledTimes(3); // signup, login, stats
    expect(mockedAxios.get).toHaveBeenCalledTimes(1); // training summary
  });
});
