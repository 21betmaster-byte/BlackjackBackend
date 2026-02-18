import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
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
import AppModal from '../components/ui/AppModal';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
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

  // Forgot Password state
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpShowPassword, setFpShowPassword] = useState(false);

  const selectedFlag = SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag ?? '🇬🇧';

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
      toast.show(t('auth.googleSignInFailed'), 'error');
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
        toast.show(t('auth.loginSuccess'), 'success');
        // _layout.tsx useEffect handles navigation based on auth state
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          toast.show(t('auth.invalidCredentials'), 'error');
        } else {
          toast.show(t('auth.unexpectedLoginError'), 'error');
        }
      } else {
        toast.show(t('auth.networkError'), 'error');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setFpEmail(email); // Pre-fill with login email
    setFpOtp('');
    setFpNewPassword('');
    setFpConfirmPassword('');
    setFpResetToken('');
    setForgotStep(1);
    setForgotPasswordVisible(true);
  };

  const handleForgotPasswordSendOtp = async () => {
    if (!fpEmail.trim()) {
      toast.show(t('auth.enterEmail'), 'error');
      return;
    }
    try {
      setFpLoading(true);
      const resp = await axios.post(`${API_URL}/auth/forgot-password`, { email: fpEmail.trim().toLowerCase() });
      if (resp.data.dev_otp) {
        // SES not configured — auto-fill OTP for dev/testing
        setFpOtp(resp.data.dev_otp);
        toast.show(`Dev OTP: ${resp.data.dev_otp}`, 'info');
      } else {
        toast.show(t('auth.otpSent'), 'success');
      }
      setForgotStep(2);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        toast.show(t('auth.tooManyRequests'), 'error');
      } else {
        toast.show(t('auth.failedSendOtp'), 'error');
      }
    } finally {
      setFpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (fpOtp.length !== 6) {
      toast.show(t('auth.enter6Digit'), 'error');
      return;
    }
    try {
      setFpLoading(true);
      const resp = await axios.post(`${API_URL}/auth/verify-otp`, {
        email: fpEmail.trim().toLowerCase(),
        otp: fpOtp,
      });
      setFpResetToken(resp.data.reset_token);
      setForgotStep(3);
    } catch (error) {
      toast.show(t('auth.invalidOtp'), 'error');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (fpNewPassword.length < 8) {
      toast.show(t('auth.passwordTooShort'), 'error');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      toast.show(t('auth.passwordsMismatch'), 'error');
      return;
    }
    try {
      setFpLoading(true);
      const resp = await axios.post(`${API_URL}/auth/reset-password`, {
        reset_token: fpResetToken,
        new_password: fpNewPassword,
      });
      if (resp.data.access_token) {
        await login(resp.data.access_token);
        if (resp.data.mandatory_details_completed) {
          await setMandatoryDetailsCompleted(true);
        }
        setForgotPasswordVisible(false);
        toast.show(t('auth.passwordResetSuccess'), 'success');
      }
    } catch (error) {
      toast.show(t('auth.failedResetPassword'), 'error');
    } finally {
      setFpLoading(false);
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
            <Text style={[styles.heroTitle, { color: 'white' }]}>{config.appName}</Text>
            <Text style={[styles.heroSubtitle, { color: Colors.primary }]}>{t('auth.loginTitle')}</Text>
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
                {t('auth.continueWithGoogle')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} />
            <Text style={[styles.dividerText, { color: colorScheme === 'dark' ? '#94a3b8' : '#94a3b8' }]}>
              {t('common.or')}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} />
          </View>

          {/* Manual Form */}
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

            <TouchableOpacity onPress={openForgotPassword} style={styles.forgotPasswordLink}>
              <Text style={[styles.forgotPasswordText, { color: Colors.primary }]}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            <Button
              title={t('auth.login')}
              onPress={handleLogin}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            />
          </View>

          {/* Terms & Signup Link */}
          <View style={styles.termsAndLoginContainer}>
            <Text style={[styles.termsText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              {t('auth.termsPrefix')}
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
                {t('auth.noAccount')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={[styles.linkText, styles.loginLink, { color: Colors.primary }]}>{t('auth.signup')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Safe Area Spacer */}
        <View style={styles.footerSpacer} />
      </View>

      {/* Forgot Password Modal */}
      <AppModal
        visible={forgotPasswordVisible}
        onClose={() => setForgotPasswordVisible(false)}
        variant="bottom-sheet"
        title={forgotStep === 1 ? t('auth.forgotPasswordTitle') : forgotStep === 2 ? t('auth.enterOtp') : t('auth.newPassword')}
      >
        {forgotStep === 1 && (
          <View style={styles.modalBody}>
            <Text style={[styles.modalSubtitle, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              {t('auth.sendVerification')}
            </Text>
            <TextInput
              style={[styles.modalInput, {
                borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: themeColors.text,
              }]}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
              keyboardType="email-address"
              autoCapitalize="none"
              value={fpEmail}
              onChangeText={setFpEmail}
            />
            <Button
              title={t('auth.sendOtp')}
              onPress={handleForgotPasswordSendOtp}
              variant="primary"
              size="lg"
              fullWidth
              loading={fpLoading}
              style={{ marginTop: 4 }}
            />
          </View>
        )}

        {forgotStep === 2 && (
          <View style={styles.modalBody}>
            <Text style={[styles.modalSubtitle, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              {t('auth.enterOtpCode', { email: fpEmail })}
            </Text>
            <TextInput
              style={[styles.modalInput, styles.otpInput, {
                borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: themeColors.text,
              }]}
              placeholder="000000"
              placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
              keyboardType="number-pad"
              maxLength={6}
              value={fpOtp}
              onChangeText={setFpOtp}
            />
            <Button
              title={t('auth.verify')}
              onPress={handleVerifyOtp}
              variant="primary"
              size="lg"
              fullWidth
              loading={fpLoading}
              style={{ marginTop: 4 }}
            />
            <TouchableOpacity onPress={handleForgotPasswordSendOtp} disabled={fpLoading}>
              <Text style={[styles.resendText, { color: Colors.primary }]}>{t('auth.resendOtp')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {forgotStep === 3 && (
          <View style={styles.modalBody}>
            <Text style={[styles.modalSubtitle, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              {t('auth.enterNewPassword')}
            </Text>
            <View style={styles.modalPasswordContainer}>
              <TextInput
                style={[styles.modalInput, { paddingRight: 50,
                  borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                  backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                  color: themeColors.text,
                }]}
                placeholder={t('auth.newPasswordPlaceholder')}
                placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                secureTextEntry={!fpShowPassword}
                value={fpNewPassword}
                onChangeText={setFpNewPassword}
              />
              <TouchableOpacity style={styles.modalVisibilityToggle} onPress={() => setFpShowPassword(!fpShowPassword)}>
                <MaterialIcons name={fpShowPassword ? 'visibility' : 'visibility-off'} size={24} color={colorScheme === 'dark' ? '#a1a1aa' : '#94a3b8'} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, {
                borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                color: themeColors.text,
              }]}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
              secureTextEntry={!fpShowPassword}
              value={fpConfirmPassword}
              onChangeText={setFpConfirmPassword}
            />
            {fpConfirmPassword.length > 0 && fpConfirmPassword !== fpNewPassword && (
              <Text style={styles.mismatchText}>{t('auth.passwordsMismatch')}</Text>
            )}
            <Button
              title={t('auth.resetPassword')}
              onPress={handleResetPassword}
              variant="primary"
              size="lg"
              fullWidth
              loading={fpLoading}
              style={{ marginTop: 4 }}
            />
          </View>
        )}
      </AppModal>
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBody: {
    gap: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalInput: {
    height: 56,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 24,
    fontSize: 16,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  modalPasswordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  modalVisibilityToggle: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  mismatchText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
});

export default LoginScreen;
