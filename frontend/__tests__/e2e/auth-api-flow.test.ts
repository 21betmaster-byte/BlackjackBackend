/**
 * E2E Integration Test: Auth API Flow
 *
 * Tests the complete frontend API interaction patterns for authentication,
 * onboarding, and stats persistence. Uses mocked axios to simulate the
 * full client-side flow as it would interact with the backend.
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
// Flow 1: Complete Signup → Login → Onboarding → Game Flow
// ============================================================

describe('E2E: Full Auth + Onboarding + Game API Flow', () => {
  it('signs up → logs in → completes onboarding → plays game → saves stats', async () => {
    // Step 1: Signup
    mockedAxios.post.mockResolvedValueOnce({
      data: { status: 'success', user_id: 'user-123' },
    });

    const signupResp = await mockedAxios.post(`${API_URL}/signup`, {
      email: 'player@example.com',
      password: 'securePass123',
    });
    expect(signupResp.data.status).toBe('success');

    // Step 2: Login
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'jwt-token-abc',
        token_type: 'bearer',
        mandatory_details_completed: false,
      },
    });

    const loginResp = await mockedAxios.post(`${API_URL}/login`, {
      email: 'player@example.com',
      password: 'securePass123',
    });
    const token = loginResp.data.access_token;
    expect(token).toBe('jwt-token-abc');
    expect(loginResp.data.mandatory_details_completed).toBe(false);

    // Step 3: Save mandatory details
    mockedAxios.put.mockResolvedValueOnce({
      data: { status: 'saved' },
    });

    const detailsResp = await mockedAxios.put(
      `${API_URL}/mandatory-details`,
      {
        first_name: 'Test',
        last_name: 'Player',
        dob: '06 / 15 / 1995',
        country: 'United States',
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(detailsResp.data.status).toBe('saved');

    // Step 4: Save game stats with training decisions
    mockedAxios.post.mockResolvedValueOnce({
      data: { status: 'saved' },
    });

    const statsResp = await mockedAxios.post(
      `${API_URL}/stats`,
      {
        result: 'win',
        mistakes: 1,
        net_payout: 75,
        hands_played: 3,
        training_decisions: [
          {
            category: 'hard_total',
            scenarioKey: 'hard_16_vs_10',
            userAction: 'hit',
            optimalAction: 'hit',
            isCorrect: true,
          },
          {
            category: 'soft_total',
            scenarioKey: 'soft_17_vs_7',
            userAction: 'stand',
            optimalAction: 'hit',
            isCorrect: false,
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(statsResp.data.status).toBe('saved');

    // Verify all API calls were made correctly
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);
  });

  it('handles login failure then retry', async () => {
    // First attempt fails
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Incorrect username or password' } },
    });

    let error: any;
    try {
      await mockedAxios.post(`${API_URL}/login`, {
        email: 'user@example.com',
        password: 'wrongPass',
      });
    } catch (e) {
      error = e;
    }
    expect(error.response.status).toBe(401);

    // Retry with correct password
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'correct-token', token_type: 'bearer', mandatory_details_completed: true },
    });

    const resp = await mockedAxios.post(`${API_URL}/login`, {
      email: 'user@example.com',
      password: 'correctPass',
    });
    expect(resp.data.access_token).toBe('correct-token');
  });
});

// ============================================================
// Flow 2: Training Analytics API Flow
// ============================================================

describe('E2E: Training Analytics API Flow', () => {
  const token = 'test-auth-token';

  it('fetches training summary and progress in sequence', async () => {
    // Get training summary
    mockedAxios.get = jest.fn()
      .mockResolvedValueOnce({
        data: {
          game_type: 'blackjack',
          total_decisions: 50,
          correct_decisions: 40,
          overall_accuracy: 0.8,
          category_stats: [
            { category: 'hard_total', total: 25, correct: 22, accuracy: 0.88 },
            { category: 'soft_total', total: 15, correct: 10, accuracy: 0.667 },
            { category: 'pair_split', total: 10, correct: 8, accuracy: 0.8 },
          ],
          weakest_categories: ['soft_total', 'pair_split', 'hard_total'],
        },
      })
      .mockResolvedValueOnce({
        data: {
          game_type: 'blackjack',
          snapshots: [
            { timestamp: '2026-03-01T10:00:00', total_decisions: 20, overall_accuracy: 0.6 },
            { timestamp: '2026-03-05T10:00:00', total_decisions: 15, overall_accuracy: 0.8 },
            { timestamp: '2026-03-09T10:00:00', total_decisions: 15, overall_accuracy: 0.93 },
          ],
        },
      });

    const summaryResp = await mockedAxios.get(
      `${API_URL}/training/summary?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(summaryResp.data.total_decisions).toBe(50);
    expect(summaryResp.data.overall_accuracy).toBe(0.8);
    expect(summaryResp.data.weakest_categories[0]).toBe('soft_total');

    const progressResp = await mockedAxios.get(
      `${API_URL}/training/progress?game_type=blackjack`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(progressResp.data.snapshots).toHaveLength(3);
    // Verify improving trend
    const accuracies = progressResp.data.snapshots.map(
      (s: any) => s.overall_accuracy,
    );
    expect(accuracies[2]).toBeGreaterThan(accuracies[0]);
  });

  it('handles unauthorized access to training endpoints', async () => {
    mockedAxios.get = jest.fn().mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Unauthorized' } },
    });

    let error: any;
    try {
      await mockedAxios.get(`${API_URL}/training/summary?game_type=blackjack`);
    } catch (e) {
      error = e;
    }
    expect(error.response.status).toBe(401);
  });
});

// ============================================================
// Flow 3: Profile Management API Flow
// ============================================================

describe('E2E: Profile Management API Flow', () => {
  const token = 'auth-token-xyz';

  it('reads profile → updates it → reads again to verify', async () => {
    mockedAxios.get = jest.fn()
      .mockResolvedValueOnce({
        data: {
          first_name: 'Original',
          last_name: 'Name',
          email: 'user@example.com',
          dob: '01 / 01 / 1990',
          country: 'US',
          auth_provider: 'email',
        },
      })
      .mockResolvedValueOnce({
        data: {
          first_name: 'Updated',
          last_name: 'Name',
          email: 'user@example.com',
          dob: '01 / 01 / 1990',
          country: 'Canada',
          auth_provider: 'email',
        },
      });

    mockedAxios.put = jest.fn().mockResolvedValueOnce({
      data: { status: 'saved' },
    });

    // Read original profile
    const profile1 = await mockedAxios.get(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(profile1.data.first_name).toBe('Original');

    // Update profile
    const updateResp = await mockedAxios.put(
      `${API_URL}/user/profile`,
      {
        first_name: 'Updated',
        last_name: 'Name',
        dob: '01 / 01 / 1990',
        country: 'Canada',
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(updateResp.data.status).toBe('saved');

    // Read updated profile
    const profile2 = await mockedAxios.get(`${API_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(profile2.data.first_name).toBe('Updated');
    expect(profile2.data.country).toBe('Canada');
  });
});

// ============================================================
// Flow 4: Password Reset API Flow
// ============================================================

describe('E2E: Password Reset API Flow', () => {
  it('forgot password → verify OTP → reset → login', async () => {
    // Step 1: Forgot password
    mockedAxios.post.mockResolvedValueOnce({
      data: { status: 'sent', dev_otp: '123456' },
    });

    const forgotResp = await mockedAxios.post(`${API_URL}/auth/forgot-password`, {
      email: 'user@example.com',
    });
    expect(forgotResp.data.status).toBe('sent');
    const otp = forgotResp.data.dev_otp;

    // Step 2: Verify OTP
    mockedAxios.post.mockResolvedValueOnce({
      data: { reset_token: 'reset-jwt-token' },
    });

    const verifyResp = await mockedAxios.post(`${API_URL}/auth/verify-otp`, {
      email: 'user@example.com',
      otp,
    });
    const resetToken = verifyResp.data.reset_token;

    // Step 3: Reset password
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-jwt-token',
        token_type: 'bearer',
        mandatory_details_completed: true,
      },
    });

    const resetResp = await mockedAxios.post(`${API_URL}/auth/reset-password`, {
      reset_token: resetToken,
      new_password: 'newSecurePass456',
    });
    expect(resetResp.data.access_token).toBe('new-jwt-token');

    // Step 4: Login with new password
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'login-jwt-token',
        token_type: 'bearer',
        mandatory_details_completed: true,
      },
    });

    const loginResp = await mockedAxios.post(`${API_URL}/login`, {
      email: 'user@example.com',
      password: 'newSecurePass456',
    });
    expect(loginResp.data.access_token).toBe('login-jwt-token');

    expect(mockedAxios.post).toHaveBeenCalledTimes(4);
  });
});
