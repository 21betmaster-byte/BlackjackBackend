import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useProgress } from '../training/useProgress';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import BottomNav from '../components/ui/BottomNav';

const HomeDashboardScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const { token: authToken } = useAuth();
  const [userName, setUserName] = useState('');
  const progress = useProgress('blackjack');

  useEffect(() => {
    if (authToken) {
      axios.get(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${authToken}` } })
        .then((resp) => {
          const data = resp.data;
          const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
          setUserName(name || 'Player');
        })
        .catch(() => setUserName('Player'));
    }
  }, [authToken]);

  const accuracy = progress.dashboard?.timeline?.snapshots?.length
    ? Math.round(
        progress.dashboard.timeline.snapshots[progress.dashboard.timeline.snapshots.length - 1].overallAccuracy * 100
      )
    : 0;

  const skillLevel = accuracy >= 90 ? t('home.advanced') : accuracy >= 60 ? t('home.intermediate') : t('home.beginner');

  const ComingSoonCard = ({ icon, title, description }: { icon: any; title: string; description: string }) => (
    <View style={[styles.learningCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0', opacity: 0.6 }]}>
      <View style={styles.learningCardHeader}>
        <View style={[styles.learningCardIconWrapper, { backgroundColor: 'rgba(17, 212, 196, 0.1)' }]}>
          <MaterialIcons name={icon} size={32} color={Colors.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.learningCardTitle, { color: themeColors.text }]}>{title}</Text>
          <Text style={[styles.learningCardDescription, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]} numberOfLines={1}>{description}</Text>
        </View>
      </View>
      <View style={styles.comingSoonBadge}>
        <MaterialIcons name="schedule" size={14} color={Colors.primary} />
        <Text style={styles.comingSoonText}>{t('home.comingSoon')}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top App Bar */}
        <View style={[styles.topAppBar, { backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)' }]}>
          <View style={styles.profileIconContainer}>
            <View style={[styles.profileIconPlaceholder, { borderColor: Colors.primary, backgroundColor: colorScheme === 'dark' ? '#1c2726' : '#f1f5f9' }]}>
              <MaterialIcons name="person" size={24} color={Colors.primary} />
            </View>
          </View>
          <View style={styles.welcomeMessageContainer}>
            <Text style={[styles.welcomeMessageGreeting, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>{t('home.goodMorning')}</Text>
            <Text style={[styles.welcomeMessageName, { color: themeColors.text }]}>{t('home.welcome', { name: userName || 'Player' })}</Text>
          </View>
          <IconButton icon="notifications" onPress={() => {}} variant="filled" iconColor={themeColors.text} style={{ backgroundColor: colorScheme === 'dark' ? '#1c2726' : '#f1f5f9' }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Resume Learning Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('home.resumeLearning')}</Text>
            </View>
            <View style={[styles.resumeCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
              <View style={[styles.resumeCardBanner, { backgroundColor: 'rgba(17, 212, 196, 0.08)' }]}>
                <MaterialIcons name="casino" size={48} color={Colors.primary} />
                <View style={styles.resumeCardBadge}>
                  <Text style={styles.resumeCardBadgeText}>{skillLevel}</Text>
                </View>
              </View>
              <View style={styles.resumeCardContent}>
                <View style={styles.flex1}>
                  <Text style={[styles.resumeCardTitle, { color: themeColors.text }]}>{t('home.blackjackStrategy')}</Text>
                  <Text style={[styles.resumeCardSubtitle, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>
                    {accuracy > 0 ? `${t('training.accuracy')}: ${accuracy}%` : t('home.startTraining')}
                  </Text>
                </View>
                <IconButton icon="play-arrow" onPress={() => router.push('/blackjack-game')} variant="primary" style={[styles.playButton, { shadowColor: Colors.primary }]} />
              </View>
              <View style={styles.resumeCardProgressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colorScheme === 'dark' ? '#3b5452' : '#f1f5f9' }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: Colors.primary, width: `${accuracy}%` }]} />
                </View>
                <Text style={[styles.progressText, { color: themeColors.text }]}>{accuracy}%</Text>
              </View>
            </View>
          </View>

          {/* Blackjack Card */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 16 }]}>{t('home.startLearning')}</Text>
            <View style={styles.learningCardsContainer}>
              <View style={[styles.learningCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
                <View style={styles.learningCardHeader}>
                  <View style={[styles.learningCardIconWrapper, { backgroundColor: 'rgba(17, 212, 196, 0.1)' }]}>
                    <MaterialIcons name="casino" size={32} color={Colors.primary} />
                  </View>
                  <View style={styles.flex1}>
                    <View style={styles.learningCardTitleContainer}>
                      <Text style={[styles.learningCardTitle, { color: themeColors.text }]}>{t('home.blackjackStrategy')}</Text>
                      <IconButton icon="help-outline" onPress={() => router.push('/how-to-play')} iconColor={Colors.primary} size="sm" />
                    </View>
                    <Text style={[styles.learningCardDescription, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]} numberOfLines={1}>{t('home.blackjackDesc')}</Text>
                  </View>
                </View>
                <View style={styles.learningCardButtons}>
                  <Button
                    title={t('home.playMode')}
                    onPress={() => router.push('/blackjack-game')}
                    variant="outline"
                    size="sm"
                    icon="videogame-asset"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={t('home.learnMode')}
                    onPress={() => router.push('/learn?game=blackjack')}
                    variant="primary"
                    size="sm"
                    icon="school"
                    style={{ flex: 1 }}
                  />
                </View>
              </View>

              {/* Coming Soon cards */}
              <ComingSoonCard icon="style" title={t('home.texasHoldem')} description={t('home.texasHoldemDesc')} />
              <ComingSoonCard icon="track-changes" title={t('home.europeanRoulette')} description={t('home.europeanRouletteDesc')} />
              <ComingSoonCard icon="casino" title={t('home.classicBaccarat')} description={t('home.classicBaccaratDesc')} />
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      <BottomNav activeTab="home" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1 },
  topAppBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: 'transparent', paddingTop: Platform.OS === 'android' ? 24 : 0 },
  profileIconContainer: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  profileIconPlaceholder: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  welcomeMessageContainer: { flex: 1, paddingHorizontal: 12 },
  welcomeMessageGreeting: { fontSize: 12, fontWeight: '500' },
  welcomeMessageName: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.2 },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', letterSpacing: -0.2 },
  resumeCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, borderWidth: 1 },
  resumeCardBanner: { height: 120, justifyContent: 'center', alignItems: 'center' },
  resumeCardBadge: { backgroundColor: 'rgba(17, 212, 196, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(17, 212, 196, 0.3)', position: 'absolute', top: 12, right: 12 },
  resumeCardBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  resumeCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  resumeCardTitle: { fontSize: 18, fontWeight: 'bold' },
  resumeCardSubtitle: { fontSize: 14, marginTop: 4 },
  playButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  resumeCardProgressContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  progressText: { fontSize: 12, fontWeight: 'bold', alignSelf: 'flex-end', marginTop: 4 },
  learningCardsContainer: { gap: 16 },
  learningCard: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  learningCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  learningCardIconWrapper: { width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  learningCardTitleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  learningCardTitle: { fontWeight: 'bold' },
  learningCardDescription: { fontSize: 12, marginTop: 4 },
  learningCardButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  comingSoonBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 12, backgroundColor: 'rgba(17, 212, 196, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  comingSoonText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
});

export default HomeDashboardScreen;
