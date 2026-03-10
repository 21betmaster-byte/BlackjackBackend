import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ShareButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  brandColor: string;
  label: string;
  onPress?: () => void;
}

export default function ShareButton({
  icon,
  brandColor,
  label,
  onPress,
}: ShareButtonProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white',
            borderColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      >
        <MaterialIcons name={icon} size={24} color={brandColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});
