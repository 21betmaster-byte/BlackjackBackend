import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { SkillLevel } from '../../learning/types';

interface Props {
  onSelect: (level: SkillLevel) => void;
}

const LEVELS: { level: SkillLevel; icon: keyof typeof MaterialIcons.glyphMap; titleKey: string; descKey: string }[] = [
  { level: 'beginner', icon: 'emoji-people', titleKey: 'learn.levels.beginnerTitle', descKey: 'learn.levels.beginnerDesc' },
  { level: 'amateur', icon: 'trending-up', titleKey: 'learn.levels.amateurTitle', descKey: 'learn.levels.amateurDesc' },
  { level: 'pro', icon: 'military-tech', titleKey: 'learn.levels.proTitle', descKey: 'learn.levels.proDesc' },
];

export default function SkillLevelPicker({ onSelect }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selected, setSelected] = useState<SkillLevel | null>(null);

  return (
    <View style={styles.container}>
      {LEVELS.map((item, index) => {
        const isSelected = selected === item.level;
        return (
          <Animated.View key={item.level} entering={FadeInUp.delay(index * 100).duration(400)}>
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1c2726' : 'white',
                  borderColor: isSelected ? Colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'),
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelected(item.level)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, { backgroundColor: isSelected ? 'rgba(17, 212, 196, 0.15)' : 'rgba(17, 212, 196, 0.08)' }]}>
                <MaterialIcons name={item.icon} size={28} color={Colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.levelTitle, { color: isDark ? '#fff' : '#11181C' }]}>
                  {t(item.titleKey)}
                </Text>
                <Text style={[styles.levelDesc, { color: isDark ? '#9db9b7' : '#64748b' }]}>
                  {t(item.descKey)}
                </Text>
              </View>
              {isSelected && (
                <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
      <View style={styles.buttonWrapper}>
        <Button
          title={t('common.continue')}
          onPress={() => selected && onSelect(selected)}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  levelDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  buttonWrapper: {
    marginTop: 16,
  },
});
