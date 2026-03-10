import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import SwipeableInstructionCards from '../components/HowToPlay/SwipeableInstructionCards';
import InteractiveLesson from '../components/HowToPlay/InteractiveLesson';
import IconButton from '../components/ui/IconButton';

type Phase = 'intro' | 'lessons';

export default function HowToPlayScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [phase, setPhase] = useState<Phase>('intro');

  const handleBack = () => {
    if (phase === 'lessons') {
      setPhase('intro');
    } else {
      router.back();
    }
  };

  const handleLessonsComplete = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={handleBack} iconColor={isDark ? '#fff' : '#11181C'} />
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#11181C' }]}>
          {t('howToPlay.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {phase === 'intro' ? (
        <SwipeableInstructionCards onStartLessons={() => setPhase('lessons')} />
      ) : (
        <InteractiveLesson onComplete={handleLessonsComplete} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
});
