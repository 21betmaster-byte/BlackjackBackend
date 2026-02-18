import '../i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { token, isLoading, mandatoryDetailsCompleted } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (token && mandatoryDetailsCompleted) {
      router.replace('/home-dashboard');
    } else if (token && !mandatoryDetailsCompleted) {
      router.replace('/mandatory-details');
    } else {
      router.replace('/signup');
    }
  }, [token, isLoading, mandatoryDetailsCompleted]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="mandatory-details" options={{ headerShown: false }} />
        <Stack.Screen name="language-theme-setup" options={{ headerShown: false }} />
        <Stack.Screen name="home-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile-personal-details" options={{ headerShown: false }} />
        <Stack.Screen name="profile-settings-invite" options={{ headerShown: false }} />
        <Stack.Screen name="custom-app-loader" options={{ headerShown: false }} />
        <Stack.Screen name="blackjack-game" options={{ headerShown: false }} />
        <Stack.Screen name="how-to-play" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </LanguageProvider>
      </AppThemeProvider>
    </AuthProvider>
  );
}
