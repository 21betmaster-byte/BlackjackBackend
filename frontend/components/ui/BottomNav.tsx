import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

type ActiveTab = 'home' | 'stats' | 'strategy' | 'profile' | 'train';

interface BottomNavProps {
  activeTab: ActiveTab;
}

const NAV_ITEMS: { key: ActiveTab; icon: keyof typeof MaterialIcons.glyphMap; labelKey: string; route: string }[] = [
  { key: 'home', icon: 'home', labelKey: 'nav.home', route: '/home-dashboard' },
  { key: 'stats', icon: 'leaderboard', labelKey: 'nav.stats', route: '' },
  { key: 'strategy', icon: 'auto-stories', labelKey: 'nav.strategy', route: '' },
  { key: 'profile', icon: 'person', labelKey: 'nav.profile', route: '/profile-settings-invite' },
];

export default function BottomNav({ activeTab }: BottomNavProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const inactiveColor = isDark ? '#9db9b7' : '#94a3b8';
  const bgColor = isDark ? 'rgba(16, 34, 32, 0.95)' : 'rgba(255, 255, 255, 0.9)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const themeBg = isDark ? Colors.dark.background : '#fff';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {NAV_ITEMS.slice(0, 2).map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.navButton}
          onPress={() => item.route && router.push(item.route as any)}
        >
          <MaterialIcons
            name={item.icon}
            size={24}
            color={activeTab === item.key ? Colors.primary : inactiveColor}
          />
          <Text
            style={[
              styles.navText,
              { color: activeTab === item.key ? Colors.primary : inactiveColor },
            ]}
          >
            {t(item.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.navSpacer} />

      {NAV_ITEMS.slice(2).map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.navButton}
          onPress={() => item.route && router.push(item.route as any)}
        >
          <MaterialIcons
            name={item.icon}
            size={24}
            color={activeTab === item.key ? Colors.primary : inactiveColor}
          />
          <Text
            style={[
              styles.navText,
              { color: activeTab === item.key ? Colors.primary : inactiveColor },
            ]}
          >
            {t(item.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.centerButton,
          { backgroundColor: Colors.primary, borderColor: themeBg, borderWidth: 4 },
        ]}
      >
        <MaterialIcons name="casino" size={32} color={Colors.dark.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
  },
  navButton: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  navText: {
    fontSize: 10,
    fontWeight: '500',
  },
  navSpacer: {
    width: 64,
  },
  centerButton: {
    position: 'absolute',
    left: '50%',
    top: -48,
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
