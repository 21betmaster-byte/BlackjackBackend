import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  mandatoryDetailsCompleted: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  setMandatoryDetailsCompleted: (completed: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  mandatoryDetailsCompleted: false,
  login: async () => {},
  logout: async () => {},
  setMandatoryDetailsCompleted: async () => {},
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: React.ReactNode;
  storageKeyPrefix?: string;
};

export const AuthProvider = ({ children, storageKeyPrefix }: AuthProviderProps) => {
  const prefix = storageKeyPrefix ?? config.storage.keyPrefix;
  const AUTH_TOKEN_KEY = `${prefix}_auth_token`;
  const MANDATORY_DETAILS_KEY = `${prefix}_mandatory_details_completed`;

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mandatoryDetailsCompleted, setMandatoryDetailsCompletedState] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
      AsyncStorage.getItem(MANDATORY_DETAILS_KEY),
    ]).then(([storedToken, storedMandatory]) => {
      if (storedToken) {
        setToken(storedToken);
      }
      if (storedMandatory === 'true') {
        setMandatoryDetailsCompletedState(true);
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, MANDATORY_DETAILS_KEY]);
    setToken(null);
    setMandatoryDetailsCompletedState(false);
  };

  const setMandatoryDetailsCompleted = async (completed: boolean) => {
    await AsyncStorage.setItem(MANDATORY_DETAILS_KEY, String(completed));
    setMandatoryDetailsCompletedState(completed);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, mandatoryDetailsCompleted, login, logout, setMandatoryDetailsCompleted }}>
      {children}
    </AuthContext.Provider>
  );
};
