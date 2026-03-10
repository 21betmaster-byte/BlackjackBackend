import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

interface ListOptionProps {
  label: string;
  onPress: () => void;
  /** Emoji or text to render as a leading element (e.g. flag emoji) */
  leadingText?: string;
  /** MaterialIcons name for leading icon */
  leadingIcon?: keyof typeof MaterialIcons.glyphMap;
  /** Whether this option is currently selected */
  selected?: boolean;
  /** Show a bottom border separator */
  showSeparator?: boolean;
  style?: ViewStyle;
}

export default function ListOption({
  label,
  onPress,
  leadingText,
  leadingIcon,
  selected = false,
  showSeparator = true,
  style,
}: ListOptionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.containerActive,
        showSeparator && styles.separator,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {leadingText && <Text style={styles.leadingText}>{leadingText}</Text>}
      {leadingIcon && (
        <MaterialIcons name={leadingIcon} size={24} color={Colors.primary} />
      )}
      <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      {selected && (
        <MaterialIcons name="check" size={20} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  containerActive: {
    backgroundColor: 'rgba(17, 212, 196, 0.1)',
  },
  separator: {
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  leadingText: {
    fontSize: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});
