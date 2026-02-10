import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Image,
  Alert, // Import Alert for displaying messages
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router'; // Assuming expo-router is used for navigation
import axios from 'axios'; // Import axios
import { API_URL } from '../config'; // Import API_URL from centralized config

const SignUpScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light']; // Use light by default if colorScheme is null

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
      });
      if (response.data.status === 'success') {
        Alert.alert('Success', 'Account created successfully! Please log in.');
        router.push('/login'); // Navigate to the login screen after successful signup
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 400) {
          Alert.alert('Error', error.response.data.detail); // "Email already exists"
        } else {
          Alert.alert('Error', 'An unexpected error occurred during signup.');
        }
      } else {
        Alert.alert('Error', 'Network error or unexpected issue.');
      }
      console.error('Signup error:', error);
    }
  };

  const handleGoogleSignIn = () => {
    // Placeholder for Google Sign-In logic
    console.log('Continue with Google');
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
        </View>

        {/* Hero Section / Logo */}
        <View style={styles.heroContainer}>
          <View style={[styles.heroBackground, { backgroundColor: Colors.dark.background }]}>
            {/* Decorative Casino Elements */}
            <View style={styles.casinoElements}>
              <View style={styles.cardIconWrapper}>
                <MaterialIcons name="casino" size={50} color={Colors.primary} />
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: 'white' }]}>BetMaster21</Text>
            <Text style={[styles.heroSubtitle, { color: Colors.primary }]}>Master Casino Table Games</Text>
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
            >
              {/* Simplified Google Icon as a placeholder */}
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

            <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Terms & Login Link */}
          <View style={styles.termsAndLoginContainer}>
            <Text style={[styles.termsText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              By signing up, you agree to our
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
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.linkText, styles.loginLink, { color: Colors.primary }]}>Log In</Text>
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
    paddingRight: 48, // Compensate for back button width
  },
  heroContainer: {
    width: '100%',
    paddingHorizontal: 0, // @[480px]:px-4 is ignored for RN
    paddingVertical: 0, // @[480px]:py-3 is ignored for RN
  },
  heroBackground: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 220,
    borderBottomWidth: 1,
    borderColor: 'rgba(17, 212, 196, 0.1)', // primary/10
    // felt-texture background-image is complex for RN, using solid color
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
    borderColor: 'rgba(17, 212, 196, 0.3)', // primary/30
    backgroundColor: 'rgba(17, 212, 196, 0.2)', // primary/20
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
    maxWidth: 400, // max-w-md
    alignSelf: 'center', // mx-auto
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
    borderRadius: 9999, // rounded-full
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
    borderRadius: 9999, // rounded-full
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
    paddingRight: 60, // Make space for the visibility toggle
  },
  visibilityToggle: {
    position: 'absolute',
    right: 20,
    padding: 4, // Make it easier to tap
  },
  primaryButton: {
    marginTop: 16,
    height: 56,
    width: '100%',
    borderRadius: 9999, // rounded-full
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5, // Android shadow
  },
  primaryButtonText: {
    color: Colors.dark.background, // text-background-dark (from HTML)
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
});

export default SignUpScreen;
