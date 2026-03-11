import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onDismiss: () => void;
}

export default function SwipeGuideOverlay({ onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <TouchableOpacity style={styles.touchArea} onPress={onDismiss} activeOpacity={1}>
        <View style={styles.content}>
          <View style={styles.arrowRow}>
            <View style={styles.arrowGroup}>
              <MaterialIcons name="swipe-left" size={40} color="rgba(255,255,255,0.9)" />
              <Text style={styles.label}>{t('learn.guide.reviewLater')}</Text>
            </View>
            <View style={styles.arrowGroup}>
              <MaterialIcons name="swipe-right" size={40} color="#11d4c4" />
              <Text style={[styles.label, { color: '#11d4c4' }]}>{t('learn.guide.gotIt')}</Text>
            </View>
          </View>
          <View style={styles.progressHint}>
            <MaterialIcons name="linear-scale" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.hintText}>{t('learn.guide.progressHint')}</Text>
          </View>
          <Text style={styles.tapToDismiss}>{t('learn.guide.tapToDismiss')}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 40,
  },
  arrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH * 0.7,
  },
  arrowGroup: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  tapToDismiss: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 20,
  },
});
