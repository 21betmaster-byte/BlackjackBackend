import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

type CardVariant = 'standard' | 'elevated' | 'settings';

interface AppCardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
}

export default function AppCard({ children, variant = 'standard', style }: AppCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#1c2726' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bgColor, borderColor },
        variant === 'elevated' && styles.elevated,
        variant === 'settings' && styles.settings,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  settings: {
    overflow: 'hidden',
    padding: 0,
  },
});
