import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

interface SegmentOption {
  value: string;
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
}

export default function SegmentedControl({
  options,
  selectedValue,
  onSelect,
  style,
}: SegmentedControlProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1e293b' : 'white',
          shadowColor: isDark ? 'transparent' : 'rgba(0,0,0,0.05)',
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.button,
              isSelected && styles.buttonActive,
              isSelected && { backgroundColor: Colors.primary },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            {option.icon && (
              <MaterialIcons
                name={option.icon}
                size={20}
                color={
                  isSelected
                    ? 'white'
                    : isDark
                    ? '#a1a1aa'
                    : '#475569'
                }
              />
            )}
            <Text
              style={[
                styles.buttonText,
                isSelected
                  ? { color: 'white', fontWeight: 'bold' }
                  : { color: isDark ? '#a1a1aa' : '#475569' },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonActive: {
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
