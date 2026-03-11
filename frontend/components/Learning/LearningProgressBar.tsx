import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

interface Props {
  current: number;
  total: number;
}

export default function LearningProgressBar({ current, total }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { backgroundColor: isDark ? '#3b5452' : '#e2e8f0' }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: Colors.primary }]} />
      </View>
      <Text style={[styles.label, { color: isDark ? '#9db9b7' : '#64748b' }]}>
        {current}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});
