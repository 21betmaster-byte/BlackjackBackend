import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

interface AppInputProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'text' | 'password' | 'email' | 'search';
  error?: string;
  disabled?: boolean;
}

export default function AppInput({
  value,
  onChangeText,
  placeholder,
  label,
  type = 'text',
  error,
  disabled = false,
}: AppInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error
    ? Colors.error
    : isDark
    ? 'rgba(255,255,255,0.1)'
    : '#e2e8f0';
  const bgColor = error
    ? isDark
      ? 'rgba(255, 77, 77, 0.1)'
      : 'rgba(255, 77, 77, 0.05)'
    : isDark
    ? 'rgba(255,255,255,0.05)'
    : 'white';
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const labelColor = isDark ? '#d1d5db' : '#4b5563';
  const placeholderColor = isDark ? '#a1a1aa' : '#6b7280';

  const isPassword = type === 'password';
  const isEmail = type === 'email';
  const isSearch = type === 'search';

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: labelColor }]}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {isSearch && (
          <MaterialIcons name="search" size={20} color={placeholderColor} style={styles.leftIcon} />
        )}
        <TextInput
          style={[
            styles.input,
            {
              borderColor,
              backgroundColor: bgColor,
              color: textColor,
              paddingRight: isPassword ? 60 : 24,
              paddingLeft: isSearch ? 48 : 24,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={isEmail ? 'email-address' : 'default'}
          autoCapitalize={isEmail ? 'none' : 'sentences'}
          editable={!disabled}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={24}
              color={isDark ? '#a1a1aa' : '#94a3b8'}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 56,
    width: '100%',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 24,
    fontSize: 16,
  },
  leftIcon: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
});
