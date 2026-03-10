import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';

type IconButtonVariant = 'default' | 'filled' | 'primary' | 'destructive';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  iconColor?: string;
  style?: ViewStyle;
  /** Custom child element instead of MaterialIcons (e.g. flag emoji Text) */
  children?: ReactNode;
}

const SIZE_CONFIG = {
  sm: { containerSize: 32, iconSize: 16, borderRadius: 16 },
  md: { containerSize: 40, iconSize: 24, borderRadius: 20 },
  lg: { containerSize: 48, iconSize: 24, borderRadius: 24 },
};

export default function IconButton({
  icon,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  iconColor,
  style,
  children,
}: IconButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const sizeConfig = SIZE_CONFIG[size];

  const getColors = () => {
    switch (variant) {
      case 'filled':
        return {
          bg: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
          icon: iconColor ?? (isDark ? '#fff' : '#11181C'),
        };
      case 'primary':
        return {
          bg: Colors.primary,
          icon: iconColor ?? Colors.dark.background,
        };
      case 'destructive':
        return {
          bg: 'rgba(255, 77, 77, 0.1)',
          icon: iconColor ?? '#ff4d4d',
        };
      case 'default':
      default:
        return {
          bg: 'transparent',
          icon: iconColor ?? (isDark ? '#fff' : '#11181C'),
        };
    }
  };

  const colors = getColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        {
          width: sizeConfig.containerSize,
          height: sizeConfig.containerSize,
          borderRadius: sizeConfig.borderRadius,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {children ?? (
        icon && <MaterialIcons name={icon} size={sizeConfig.iconSize} color={colors.icon} />
      )}
    </TouchableOpacity>
  );
}
