import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import axios from 'axios';
import config, { API_URL, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import Button from '../components/ui/Button';
import AppInput from '../components/ui/AppInput';

WebBrowser.maybeCompleteAuthSession();

const SignUpScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { login, setMandatoryDetailsCompleted } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedFlag = SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag ?? '\u{1F1EC}\u{1F1E7}';

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
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      toast.show(t('auth.googleSignInFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
      });
      if (response.data.status === 'success') {
        toast.show(t('auth.accountCreated'), 'success');
        router.push('/login');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          toast.show(error.response.data.detail, 'error');
        } else {
          toast.show(t('auth.unexpectedSignupError'), 'error');
        }
      } else {
        toast.show(t('auth.networkError'), 'error');
      }
      console.error('Signup error:', error);
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
        {/* Top App Bar */}
        <View style={styles.topAppBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: themeColors.text }]}>{config.appName}</Text>
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
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageOption}
                onPress={() => {
                  setLanguage(lang.code);
                  setLanguageDropdownVisible(false);
                }}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[styles.languageLabel, { color: themeColors.text }]}>{lang.nativeLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={[styles.heroBackground, { backgroundColor: Colors.dark.background }]}>
            <View style={styles.casinoElements}>
              <View style={styles.cardIconWrapper}>
                <MaterialIcons name="casino" size={50} color={Colors.primary} />
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: 'white' }]}>{config.appName}</Text>
            <Text style={[styles.heroSubtitle, { color: Colors.primary }]}>{t('auth.signupTitle')}</Text>
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
                source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }}
                style={styles.googleIcon}
              />
              <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                {t('auth.continueWithGoogle')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} />
            <Text style={[styles.dividerText, { color: '#94a3b8' }]}>{t('common.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} />
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <AppInput
              type="email"
              label={t('auth.emailLabel')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
            />

            <AppInput
              type="password"
              label={t('auth.passwordLabel')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
            />

            <Button
              title={t('auth.signup')}
              onPress={handleSignUp}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            />
          </View>

          {/* Terms & Login Link */}
          <View style={styles.termsAndLoginContainer}>
            <Text style={[styles.termsText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              {t('auth.signupTermsPrefix')}
              <Text style={[styles.linkText, { color: Colors.primary }]} onPress={() => console.log('Terms of Service')}>
                {' '}{t('auth.termsOfService')}
              </Text>
              {' '}{t('auth.and')}
              <Text style={[styles.linkText, { color: Colors.primary }]} onPress={() => console.log('Privacy Policy')}>
                {' '}{t('auth.privacyPolicy')}
              </Text>
              .
            </Text>
            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginText, { color: colorScheme === 'dark' ? '#94a3b8' : '#475569' }]}>
                {t('auth.hasAccount')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.linkText, styles.loginLink, { color: Colors.primary }]}>{t('auth.login')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, flexDirection: 'column', overflow: 'hidden' },
  topAppBar: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, justifyContent: 'space-between' },
  backButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'flex-start', flexShrink: 0 },
  appBarTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', paddingRight: 0 },
  heroContainer: { width: '100%' },
  heroBackground: { width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', minHeight: 220, borderBottomWidth: 1, borderColor: 'rgba(17, 212, 196, 0.1)' },
  casinoElements: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  cardIconWrapper: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(17, 212, 196, 0.3)', backgroundColor: 'rgba(17, 212, 196, 0.2)' },
  heroTitle: { fontSize: 32, fontWeight: 'bold', letterSpacing: -0.5, paddingHorizontal: 16, textAlign: 'center' },
  heroSubtitle: { fontSize: 16, fontWeight: '500', marginTop: 8, paddingHorizontal: 16, textAlign: 'center' },
  contentArea: { flexDirection: 'column', paddingHorizontal: 24, paddingVertical: 32, gap: 24, maxWidth: 400, alignSelf: 'center', width: '100%' },
  socialLoginContainer: { flexDirection: 'column', gap: 12 },
  socialButton: { flexDirection: 'row', minWidth: 84, height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 20, borderWidth: 1, gap: 12 },
  googleIcon: { width: 24, height: 24 },
  socialButtonText: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.2 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dividerLine: { height: 1, flex: 1 },
  dividerText: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5 },
  formContainer: { flexDirection: 'column', gap: 20 },
  termsAndLoginContainer: { flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 16 },
  termsText: { fontSize: 12, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  linkText: { fontWeight: 'bold', textDecorationLine: 'underline' },
  loginLinkContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginText: { fontSize: 16 },
  loginLink: { fontSize: 16 },
  footerSpacer: { height: 40 },
  languageButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  languageDropdown: { position: 'absolute', top: 60, right: 16, borderRadius: 12, borderWidth: 1, paddingVertical: 4, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, minWidth: 140 },
  languageOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  languageFlag: { fontSize: 24 },
  languageLabel: { fontSize: 16, fontWeight: '500' },
});

export default SignUpScreen;
