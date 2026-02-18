import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import config from '../config';

const STORAGE_KEY = `${config.storage.keyPrefix}_language`;

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(i18n.language || 'en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        setLanguageState(stored);
        i18n.changeLanguage(stored);
      }
    });
  }, []);

  const setLanguage = async (code: string) => {
    setLanguageState(code);
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem(STORAGE_KEY, code);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
