import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
];

const LoginScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const { login, setMandatoryDetailsCompleted } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedFlag = LANGUAGES.find(l => l.code === selectedLanguage)?.flag ?? '🇬🇧';

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchGoogleUserAndAuth(authentication.accessToken);
      }
    }
  }, [response]);

  const fetchGoogleUserAndAuth = async (accessToken: string) => {
    try {
      setLoading(true);
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();

      const authResponse = await axios.post(`${API_URL}/google-auth`, {
        email: userInfo.email,
        google_id: userInfo.id,
        name: userInfo.name,
      });

      if (authResponse.data.access_token) {
        await login(authResponse.data.access_token);
        if (authResponse.data.mandatory_details_completed) {
          await setMandatoryDetailsCompleted(true);
        }
        // _layout.tsx useEffect handles navigation based on auth state
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      toast.show('Google Sign-In failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      if (response.data.access_token) {
        await login(response.data.access_token);
        if (response.data.mandatory_details_completed) {
          await setMandatoryDetailsCompleted(true);
        }
        toast.show('Logged in successfully!', 'success');
        // _layout.tsx useEffect handles navigation based on auth state
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          toast.show('Invalid credentials. Please try again.', 'error');
        } else {
          toast.show('An unexpected error occurred during login.', 'error');
        }
      } else {
        toast.show('Network error or unexpected issue.', 'error');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    promptAsync({ windowFeatures: { popup: true, width: 500, height: 600 } });
  };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top App Bar (iOS style) */}
        <View style={styles.topAppBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()} // Go back
          >
            <MaterialIcons
              name="arrow-back-ios"
              size={24}
              color={themeColors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: themeColors.text }]}>BetMaster21</Text>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setLanguageDropdownVisible(!languageDropdownVisible)}
          >
            <Text style={styles.languageFlag}>{selectedFlag}</Text>
          </TouchableOpacity>
        </View>

        {/* Language Dropdown */}
        {languageDropdownVisible && (
          <View style={[styles.languageDropdown, {
            backgroundColor: colorScheme === 'dark' ? '#1e293b' : 'white',
            borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
          }]}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageOption}
                onPress={() => {
                  setSelectedLanguage(lang.code);
                  setLanguageDropdownVisible(false);
                }}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[styles.languageLabel, { color: themeColors.text }]}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Hero Section / Logo (similar to signup for consistency) */}
        <View style={styles.heroContainer}>
          <View style={[styles.heroBackground, { backgroundColor: Colors.dark.background }]}>
            <View style={styles.casinoElements}>
              <View style={styles.cardIconWrapper}>
                <MaterialIcons name="casino" size={50} color={Colors.primary} />
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: 'white' }]}>BetMaster21</Text>
            <Text style={[styles.heroSubtitle, { color: Colors.primary }]}>Login to Master Casino Table Games</Text>
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {/* Social Login */}
          <View style={styles.socialLoginContainer}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: colorScheme === 'dark' ? themeColors.background : 'white',
                  borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Image
                source={{
                  uri: 'https://img.icons8.com/color/48/000000/google-logo.png',
                }}
                style={styles.googleIcon}
              />
              <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} />
            <Text style={[styles.dividerText, { color: colorScheme === 'dark' ? '#94a3b8' : '#94a3b8' }]}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} />
          </View>

          {/* Manual Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                Email Address
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                    color: themeColors.text,
                  },
                ]}
                placeholder="name@example.com"
                placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                Password
              </Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.passwordTextInput,
                    {
                      borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
                      color: themeColors.text,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={24}
                    color={colorScheme === 'dark' ? '#a1a1aa' : '#94a3b8'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.dark.background} />
              ) : (
                <Text style={styles.primaryButtonText}>Log In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Terms & Signup Link */}
          <View style={styles.termsAndLoginContainer}>
            <Text style={[styles.termsText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              By logging in, you agree to our
              <Text style={[styles.linkText, { color: Colors.primary }]} onPress={() => console.log('Terms of Service')}>
                {' '}Terms of Service
              </Text>
              {' '}and
              <Text style={[styles.linkText, { color: Colors.primary }]} onPress={() => console.log('Privacy Policy')}>
                {' '}Privacy Policy
              </Text>
              .
            </Text>
            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginText, { color: colorScheme === 'dark' ? '#94a3b8' : '#475569' }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={[styles.linkText, styles.loginLink, { color: Colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Safe Area Spacer */}
        <View style={styles.footerSpacer} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexShrink: 0,
    cursor: 'pointer',
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    paddingRight: 0,
  },
  heroContainer: {
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  heroBackground: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 220,
    borderBottomWidth: 1,
    borderColor: 'rgba(17, 212, 196, 0.1)',
  },
  casinoElements: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  cardIconWrapper: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(17, 212, 196, 0.3)',
    backgroundColor: 'rgba(17, 212, 196, 0.2)',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  contentArea: {
    flexDirection: 'column',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  socialLoginContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    minWidth: 84,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 20,
    borderWidth: 1,
    gap: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    height: 1,
    flex: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  formContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  inputGroup: {
    flexDirection: 'column',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  textInput: {
    height: 56,
    width: '100%',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 24,
    fontSize: 16,
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  passwordTextInput: {
    paddingRight: 60,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  primaryButton: {
    marginTop: 16,
    height: 56,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsAndLoginContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    marginTop: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  linkText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
  },
  footerSpacer: {
    height: 40,
  },
  languageButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  languageDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 140,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
