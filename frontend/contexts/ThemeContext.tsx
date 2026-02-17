import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themePreference: ThemePreference;
  colorScheme: 'light' | 'dark';
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  isDark: boolean;
}

const THEME_KEY = `${config.storage.keyPrefix}_theme_preference`;

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  colorScheme: 'light',
  setThemePreference: async () => {},
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useRNColorScheme() ?? 'light';
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemePreferenceState(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemePreference = async (pref: ThemePreference) => {
    await AsyncStorage.setItem(THEME_KEY, pref);
    setThemePreferenceState(pref);
  };

  const colorScheme: 'light' | 'dark' =
    themePreference === 'system' ? systemScheme : themePreference;

  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ themePreference, colorScheme, setThemePreference, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
