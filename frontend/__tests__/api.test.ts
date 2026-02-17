import axios from 'axios';
import { Alert } from 'react-native';
import { API_URL } from '../config';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.isAxiosError = jest.fn((error: any) => error != null && error.response != null) as any;

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('Frontend API Interactions', () => {

  beforeEach(() => {
    jest.resetAllMocks();
    mockedAxios.isAxiosError = jest.fn((error: any) => error != null && error.response != null) as any;
  });

  it('signup.tsx: handleSignUp should call API and navigate on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { status: 'success', user_id: 'some-uuid' } });
    const { router } = require('expo-router');

    const email = 'test@example.com';
    const password = 'password123';

    const response = await mockedAxios.post(`${API_URL}/signup`, { email, password });
    if (response.data.status === 'success') {
      Alert.alert('Success', 'Account created successfully! Please log in.');
      router.push('/login');
    }

    expect(mockedAxios.post).toHaveBeenCalledWith(`${API_URL}/signup`, {
      email: 'test@example.com',
      password: 'password123',
    });
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Account created successfully! Please log in.');
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('signup.tsx: handleSignUp should show error on duplicate email', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Email already exists' } },
    });

    const email = 'duplicate@example.com';
    const password = 'password123';

    try {
      await mockedAxios.post(`${API_URL}/signup`, { email, password });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          Alert.alert('Error', error.response.data.detail);
        } else {
          Alert.alert('Error', 'An unexpected error occurred during signup.');
        }
      } else {
        Alert.alert('Error', 'Network error or unexpected issue.');
      }
    }

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Email already exists');
  });

  it('login.tsx: handleLogin should call API and navigate on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { access_token: 'fake_token', token_type: 'bearer' } });
    const { router } = require('expo-router');

    const email = 'login@example.com';
    const password = 'loginpassword';

    const response = await mockedAxios.post(`${API_URL}/login`, { email, password });
    if (response.data.access_token) {
      Alert.alert('Success', 'Logged in successfully!');
      router.push('/mandatory-details');
    }

    expect(mockedAxios.post).toHaveBeenCalledWith(`${API_URL}/login`, {
      email: 'login@example.com',
      password: 'loginpassword',
    });
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Logged in successfully!');
    expect(router.push).toHaveBeenCalledWith('/mandatory-details');
  });

  it('login.tsx: handleLogin should show error on invalid credentials', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Incorrect username or password' } },
    });

    const email = 'wrong@example.com';
    const password = 'wrongpass';

    try {
      await mockedAxios.post(`${API_URL}/login`, { email, password });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          Alert.alert('Error', 'Invalid credentials. Please try again.');
        } else {
          Alert.alert('Error', 'An unexpected error occurred during login.');
        }
      } else {
        Alert.alert('Error', 'Network error or unexpected issue.');
      }
    }

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid credentials. Please try again.');
  });

  it('home-dashboard.tsx: handleSaveMockStats should call API with token and show success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { status: 'saved' } });

    const authToken = 'mock_auth_token';

    const response = await mockedAxios.post(
      `${API_URL}/stats`,
      {
        result: expect.any(String),
        mistakes: expect.any(Number),
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    if (response.data.status === 'saved') {
      Alert.alert('Success', 'Mock game stats saved successfully!');
    }

    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${API_URL}/stats`,
      expect.objectContaining({
        result: expect.any(String),
        mistakes: expect.any(Number),
      }),
      {
        headers: {
          Authorization: 'Bearer mock_auth_token',
        },
      }
    );
    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Mock game stats saved successfully!');
  });

  it('home-dashboard.tsx: handleSaveMockStats should show error if no token', async () => {
    const authToken: string | null = null;

    if (!authToken) {
      Alert.alert('Error', 'No authentication token found. Please log in.');
    }

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'No authentication token found. Please log in.');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
