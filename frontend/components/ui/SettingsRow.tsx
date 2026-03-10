import React from 'react';
import { TouchableOpacity, View, Text, Switch, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

interface SettingsRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value?: string | boolean;
  isToggle?: boolean;
  onValueChange?: (val: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  isDestructive?: boolean;
}

export default function SettingsRow({
  icon,
  title,
  value,
  isToggle,
  onValueChange,
  isFirst,
  isLast,
  onPress,
  isDestructive,
}: SettingsRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white' },
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: isDestructive
              ? 'rgba(255, 77, 77, 0.1)'
              : 'rgba(17, 212, 196, 0.2)',
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={24}
          color={isDestructive ? '#ff4d4d' : Colors.primary}
        />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: isDestructive
              ? '#ff4d4d'
              : isDark
              ? 'white'
              : '#11181C',
          },
        ]}
      >
        {title}
      </Text>
      {typeof value === 'string' && <Text style={styles.value}>{value}</Text>}
      {!isToggle && onPress && (
        <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
      )}
      {isToggle && typeof value === 'boolean' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: Colors.primary }}
          thumbColor="#f4f3f4"
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  rowFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  rowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
