// BlackjackBackend/frontend/config.ts
// Centralized configuration for the frontend application.

// 1. LOCAL TESTING (Comment this out when deploying)
// const API_URL = 'http://localhost:8000';

// 2. AWS PRODUCTION (Uncomment this to use the live cloud backend)
const API_URL = 'https://bi5sd3la1f.execute-api.us-east-1.amazonaws.com';

// Google OAuth Client IDs — replace with your own from https://console.cloud.google.com
const GOOGLE_WEB_CLIENT_ID = '1010392546631-5r0fn7a6l4nl32jco0oqobsm7dpm5qd4.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com';

export { API_URL, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID };