import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import BottomNav from '../components/ui/BottomNav';

const HomeDashboardScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  const { token: authToken } = useAuth();
  const toast = useToast();
  const [savingStats, setSavingStats] = useState(false);

  const handleSaveMockStats = async () => {
    if (!authToken) {
      toast.show('No authentication token found. Please log in.', 'error');
      return;
    }

    try {
      setSavingStats(true);
      const response = await axios.post(
        `${API_URL}/stats`,
        {
          result: Math.random() > 0.5 ? 'win' : 'loss',
          mistakes: Math.floor(Math.random() * 3),
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (response.data.status === 'saved') {
        toast.show('Mock game stats saved successfully!', 'success');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.show(`Failed to save stats: ${error.response.data.detail || error.message}`, 'error');
      } else {
        toast.show('Network error or unexpected issue when saving stats.', 'error');
      }
    } finally {
      setSavingStats(false);
    }
  };

  const LearningCard = ({ icon, title, learners, description }: { icon: any; title: string; learners: string; description: string }) => (
    <View style={[styles.learningCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
      <View style={styles.learningCardHeader}>
        <View style={[styles.learningCardIconWrapper, { backgroundColor: 'rgba(17, 212, 196, 0.1)' }]}>
          <MaterialIcons name={icon} size={32} color={Colors.primary} />
        </View>
        <View style={styles.flex1}>
          <View style={styles.learningCardTitleContainer}>
            <Text style={[styles.learningCardTitle, { color: themeColors.text }]}>{title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.learnersContainer}>
                <MaterialIcons name="group" size={12} color={colorScheme === 'dark' ? '#9db9b7' : '#94a3b8'} />
                <Text style={[styles.learnersText, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]}>{learners}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/how-to-play')} style={{ padding: 4 }}>
                <MaterialIcons name="help-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.learningCardDescription, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]} numberOfLines={1}>{description}</Text>
        </View>
      </View>
      <View style={styles.learningCardButtons}>
        <TouchableOpacity style={[styles.learningCardButton, { borderColor: colorScheme === 'dark' ? '#3b5452' : '#e2e8f0' }]} onPress={() => router.push('/blackjack-game')}>
          <MaterialIcons name="videogame-asset" size={18} color={themeColors.text} />
          <Text style={[styles.learningCardButtonText, { color: themeColors.text }]}>{t('home.playMode')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.learningCardButton, { backgroundColor: Colors.primary }]} onPress={() => router.push('/how-to-play')}>
          <MaterialIcons name="school" size={18} color={Colors.dark.background} />
          <Text style={[styles.learningCardButtonText, { color: Colors.dark.background, fontWeight: 'bold' }]}>{t('home.learnMode')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top App Bar */}
        <View style={[styles.topAppBar, { backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)' }]}>
          <View style={styles.profileIconContainer}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/a/ACg8ocK_1Y-3-3A3g_9A3g_9A3g_9A3g_9A3g_9A3g_9A3g=s96-c' }}
              style={[styles.profileIcon, { borderColor: Colors.primary }]}
            />
          </View>
          <View style={styles.welcomeMessageContainer}>
            <Text style={[styles.welcomeMessageGreeting, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>{t('home.goodMorning')}</Text>
            <Text style={[styles.welcomeMessageName, { color: themeColors.text }]}>{t('home.welcome', { name: 'Alex' })}</Text>
          </View>
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : '#f1f5f9' }]}>
            <MaterialIcons name="notifications" size={24} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Resume Learning Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('home.resumeLearning')}</Text>
              <Text style={[styles.viewAll, { color: Colors.primary }]}>{t('home.viewAll')}</Text>
            </View>
            <View style={[styles.resumeCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
              <ImageBackground
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaW6y_zRzdV53fca0wMpS7HS4nAFJxr8S8U1eOMHvUi0-bSGL7-YSAU1eIxveuBShoFkmtdBZjKL4RsOoNFdoGDPrJCtOCj3tEqnVDvEb3SvyMS9H6sS6mV7J9OZE3xvjw9htiEugNsigRk24MsyqpFdHESb4L4CjBmDQ4usAg2c_6RpKOuKMGV3uH2sJ9Diwv7BUj7vJiu2VVsSbzCCffkfjApY_AmBPVkvuRzi7fY3vzSsb24HcddEqlq4mnyVRWCyILlK5APyFu' }}
                style={styles.resumeCardBackground}
                resizeMode="cover"
              >
                <View style={styles.resumeCardOverlay}>
                  <View style={styles.resumeCardBadge}>
                    <Text style={styles.resumeCardBadgeText}>{t('home.intermediate')}</Text>
                  </View>
                </View>
              </ImageBackground>
              <View style={styles.resumeCardContent}>
                <View style={styles.flex1}>
                  <Text style={[styles.resumeCardTitle, { color: themeColors.text }]}>{t('home.blackjackStrategy')}</Text>
                  <Text style={[styles.resumeCardSubtitle, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>{t('home.currentDoubleDown')}</Text>
                </View>
                <TouchableOpacity style={[styles.playButton, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}>
                  <MaterialIcons name="play-arrow" size={32} color={Colors.dark.background} />
                </TouchableOpacity>
              </View>
              <View style={styles.resumeCardProgressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colorScheme === 'dark' ? '#3b5452' : '#f1f5f9' }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: Colors.primary, width: '65%' }]} />
                </View>
                <Text style={[styles.progressText, { color: themeColors.text }]}>65%</Text>
              </View>
            </View>
          </View>

          {/* Start Learning Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 16 }]}>{t('home.startLearning')}</Text>
            <View style={styles.learningCardsContainer}>
              <LearningCard icon="style" title={t('home.texasHoldem')} learners={t('home.learners', { count: '15k' })} description={t('home.texasHoldemDesc')} />
              <LearningCard icon="track-changes" title={t('home.europeanRoulette')} learners={t('home.learners', { count: '8.2k' })} description={t('home.europeanRouletteDesc')} />
              <LearningCard icon="casino" title={t('home.classicBaccarat')} learners={t('home.learners', { count: '5.4k' })} description={t('home.classicBaccaratDesc')} />
            </View>
          </View>
          <View style={{ padding: 16 }}>
            <Button
              title={t('home.saveMockStats')}
              onPress={handleSaveMockStats}
              variant="primary"
              size="lg"
              fullWidth
              loading={savingStats}
            />
          </View>
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
  profileIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  welcomeMessageContainer: { flex: 1, paddingHorizontal: 12 },
  welcomeMessageGreeting: { fontSize: 12, fontWeight: '500' },
  welcomeMessageName: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.2 },
  notificationButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', letterSpacing: -0.2 },
  viewAll: { fontSize: 14, fontWeight: '600' },
  resumeCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, borderWidth: 1 },
  resumeCardBackground: { aspectRatio: 16 / 9, width: '100%', justifyContent: 'flex-end' },
  resumeCardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, justifyContent: 'flex-end', alignItems: 'flex-start' },
  resumeCardBadge: { backgroundColor: 'rgba(17, 212, 196, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(17, 212, 196, 0.3)' },
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
  learnersContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  learnersText: { fontSize: 10 },
  learningCardDescription: { fontSize: 12, marginTop: 4 },
  learningCardButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  learningCardButton: { flex: 1, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' },
  learningCardButtonText: { fontSize: 14, fontWeight: '600' },
});

export default HomeDashboardScreen;
