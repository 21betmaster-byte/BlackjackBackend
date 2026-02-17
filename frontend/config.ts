// BlackjackBackend/frontend/config.ts
// Centralized configuration for the frontend application.

export interface AppConfig {
  appName: string;
  apiUrl: string;
  google: {
    webClientId: string;
    iosClientId: string;
    androidClientId: string;
  };
  storage: {
    keyPrefix: string;
  };
}

const config: AppConfig = {
  appName: 'BetMaster21',
  // 1. LOCAL TESTING (swap this value when developing locally)
  // apiUrl: 'http://localhost:8000',
  // 2. AWS PRODUCTION
  apiUrl: 'https://bi5sd3la1f.execute-api.us-east-1.amazonaws.com',
  google: {
    webClientId: '1010392546631-5r0fn7a6l4nl32jco0oqobsm7dpm5qd4.apps.googleusercontent.com',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  },
  storage: {
    keyPrefix: 'betmaster21',
  },
};

export default config;

// Backward-compatible named exports
export const API_URL = config.apiUrl;
export const GOOGLE_WEB_CLIENT_ID = config.google.webClientId;
export const GOOGLE_IOS_CLIENT_ID = config.google.iosClientId;
export const GOOGLE_ANDROID_CLIENT_ID = config.google.androidClientId;
