import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const HAPTICS_KEY = 'betmaster21_haptics';

export function useHaptics() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HAPTICS_KEY).then(val => {
      if (val !== null) setEnabled(val === 'true');
    });
  }, []);

  const light = useCallback(() => {
    if (enabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [enabled]);

  const medium = useCallback(() => {
    if (enabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [enabled]);

  const heavy = useCallback(() => {
    if (enabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [enabled]);

  const success = useCallback(() => {
    if (enabled && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [enabled]);

  const error = useCallback(() => {
    if (enabled && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [enabled]);

  return { light, medium, heavy, success, error, enabled };
}
