import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface InstructionCard {
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: string;
  descKey: string;
}

const CARDS: InstructionCard[] = [
  { icon: 'casino', titleKey: 'howToPlay.whatIsBlackjack', descKey: 'howToPlay.whatIsBlackjackDesc' },
  { icon: 'flag', titleKey: 'howToPlay.yourObjective', descKey: 'howToPlay.yourObjectiveDesc' },
];

interface Props {
  onStartLessons: () => void;
}

export default function SwipeableInstructionCards({ onStartLessons }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActiveIndex(index);
  };

  const isLastCard = activeIndex === CARDS.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {CARDS.map((card, index) => (
          <View
            key={index}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1c2726' : 'white',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                width: CARD_WIDTH,
              },
            ]}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(17, 212, 196, 0.1)' }]}>
              <MaterialIcons name={card.icon} size={64} color={Colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#11181C' }]}>
              {t(card.titleKey)}
            </Text>
            <Text style={[styles.cardDesc, { color: isDark ? '#9db9b7' : '#64748b' }]}>
              {t(card.descKey)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {CARDS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeIndex ? Colors.primary : (isDark ? '#3b5452' : '#e2e8f0'),
              },
            ]}
          />
        ))}
      </View>

      {/* Start Lessons button on last card */}
      {isLastCard && (
        <View style={styles.buttonContainer}>
          <Button
            title={t('howToPlay.startLessons')}
            onPress={onStartLessons}
            variant="primary"
            size="lg"
            fullWidth
            icon="school"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 300,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
});
