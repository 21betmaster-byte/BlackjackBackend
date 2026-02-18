import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'action' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  highlighted?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  sm: { height: 40, fontSize: 14, borderRadius: 20, iconSize: 16, paddingH: 16 },
  md: { height: 48, fontSize: 16, borderRadius: 24, iconSize: 20, paddingH: 20 },
  lg: { height: 56, fontSize: 18, borderRadius: 9999, iconSize: 24, paddingH: 24 },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  highlighted = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const sizeConfig = SIZE_CONFIG[size];

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: Colors.primary,
          text: Colors.dark.background,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
          text: isDark ? '#fff' : '#11181C',
          border: 'transparent',
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: isDark ? '#fff' : '#11181C',
          border: isDark ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
        };
      case 'action':
        return {
          bg: 'rgba(255,255,255,0.15)',
          text: '#fff',
          border: 'rgba(255,255,255,0.2)',
        };
      case 'destructive':
        return {
          bg: Colors.error,
          text: '#fff',
          border: 'transparent',
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: Colors.primary,
          border: 'transparent',
        };
      default:
        return {
          bg: Colors.primary,
          text: Colors.dark.background,
          border: 'transparent',
        };
    }
  };

  const colors = getColors();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        {
          height: sizeConfig.height,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: colors.bg,
          borderWidth: colors.border !== 'transparent' ? 1 : 0,
          borderColor: colors.border,
          paddingHorizontal: sizeConfig.paddingH,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        variant === 'primary' && styles.primaryShadow,
        highlighted && styles.highlighted,
        fullWidth && { width: '100%' as any },
        isDisabled && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialIcons name={icon} size={sizeConfig.iconSize} color={colors.text} />
          )}
          <Text
            style={{
              color: colors.text,
              fontSize: sizeConfig.fontSize,
              fontWeight: 'bold',
            }}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialIcons name={icon} size={sizeConfig.iconSize} color={colors.text} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryShadow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  highlighted: {
    borderWidth: 2,
    borderColor: '#d69e2e',
  },
});
