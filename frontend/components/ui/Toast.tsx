import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  opacity: Animated.Value;
}

const TOAST_CONFIG: Record<ToastType, { icon: keyof typeof MaterialIcons.glyphMap; bg: string }> = {
  success: { icon: 'check-circle', bg: Colors.primary },
  error: { icon: 'error', bg: '#ff4d4d' },
  info: { icon: 'info', bg: '#3B82F6' },
};

export const Toast: React.FC<ToastProps> = ({ message, type, opacity }) => {
  const config = TOAST_CONFIG[type];

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: config.bg }]}>
      <MaterialIcons name={config.icon} size={20} color={Colors.dark.background} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: Colors.dark.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
