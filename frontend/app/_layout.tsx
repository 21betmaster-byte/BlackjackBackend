import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (token) {
      router.replace('/home-dashboard');
    } else {
      router.replace('/signup');
    }
  }, [token, isLoading]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="mandatory-details" options={{ headerShown: false }} />
        <Stack.Screen name="language-theme-setup" options={{ headerShown: false }} />
        <Stack.Screen name="home-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile-personal-details" options={{ headerShown: false }} />
        <Stack.Screen name="profile-settings-invite" options={{ headerShown: false }} />
        <Stack.Screen name="custom-app-loader" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
