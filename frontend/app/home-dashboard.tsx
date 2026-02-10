import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Image,
  ImageBackground,
  Platform,
  Alert, // Added Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';

const HomeDashboardScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // In a real application, you would retrieve the token from secure storage (e.g., AsyncStorage)
    // For testing purposes, you might mock this or retrieve it from a global state/context
    const fetchToken = async () => {
      // Simulate fetching a token, or use a hardcoded one if testing without a full login flow
      // A more robust solution would involve react context or AsyncStorage
      // For now, let's just assume a dummy token or retrieve one from a stored value if available.
      // NOTE: This dummy token is for demonstration. In a real app, it should come from a successful login.
      const dummyToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"; 
      setAuthToken(dummyToken);
    };
    fetchToken();
  }, []);

  const handleSaveMockStats = async () => {
    if (!authToken) {
      Alert.alert('Error', 'No authentication token found. Please log in.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/save_stats`,
        {
          result: Math.random() > 0.5 ? 'win' : 'loss', // Random win/loss
          mistakes: Math.floor(Math.random() * 3), // 0-2 mistakes
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (response.data.status === 'saved') {
        Alert.alert('Success', 'Mock game stats saved successfully!');
        console.log('Saved stats:', response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert('Error', `Failed to save stats: ${error.response.data.detail || error.message}`);
      } else {
        Alert.alert('Error', 'Network error or unexpected issue when saving stats.');
      }
      console.error('Save stats error:', error);
    }
  };

  const LearningCard = ({ icon, title, learners, description }) => (
    <View style={[styles.learningCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
      <View style={styles.learningCardHeader}>
        <View style={[styles.learningCardIconWrapper, { backgroundColor: 'rgba(17, 212, 196, 0.1)' }]}>
          <MaterialIcons name={icon} size={32} color={Colors.primary} />
        </View>
        <View style={styles.flex1}>
          <View style={styles.learningCardTitleContainer}>
            <Text style={[styles.learningCardTitle, { color: themeColors.text }]}>{title}</Text>
            <View style={styles.learnersContainer}>
              <MaterialIcons name="group" size={12} color={colorScheme === 'dark' ? '#9db9b7' : '#94a3b8'} />
              <Text style={[styles.learnersText, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]}>{learners}</Text>
            </View>
          </View>
          <Text style={[styles.learningCardDescription, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]} numberOfLines={1}>{description}</Text>
        </View>
      </View>
      <View style={styles.learningCardButtons}>
        <TouchableOpacity style={[styles.learningCardButton, { borderColor: colorScheme === 'dark' ? '#3b5452' : '#e2e8f0' }]}>
          <MaterialIcons name="videogame-asset" size={18} color={themeColors.text} />
          <Text style={[styles.learningCardButtonText, { color: themeColors.text }]}>Play Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.learningCardButton, { backgroundColor: Colors.primary }]}>
          <MaterialIcons name="school" size={18} color={Colors.dark.background} />
          <Text style={[styles.learningCardButtonText, { color: Colors.dark.background, fontWeight: 'bold' }]}>Learn Mode</Text>
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
            <Text style={[styles.welcomeMessageGreeting, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>Good Morning</Text>
            <Text style={[styles.welcomeMessageName, { color: themeColors.text }]}>Welcome! Alex</Text>
          </View>
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : '#f1f5f9' }]}>
            <MaterialIcons name="notifications" size={24} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Resume Learning Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Resume Learning</Text>
              <Text style={[styles.viewAll, { color: Colors.primary }]}>View All</Text>
            </View>
            <View style={[styles.resumeCard, { backgroundColor: colorScheme === 'dark' ? '#1c2726' : 'white', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
              <ImageBackground
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaW6y_zRzdV53fca0wMpS7HS4nAFJxr8S8U1eOMHvUi0-bSGL7-YSAU1eIxveuBShoFkmtdBZjKL4RsOoNFdoGDPrJCtOCj3tEqnVDvEb3SvyMS9H6sS6mV7J9OZE3xvjw9htiEugNsigRk24MsyqpFdHESb4L4CjBmDQ4usAg2c_6RpKOuKMGV3uH2sJ9Diwv7BUj7vJiu2VVsSbzCCffkfjApY_AmBPVkvuRzi7fY3vzSsb24HcddEqlq4mnyVRWCyILlK5APyFu' }}
                style={styles.resumeCardBackground}
                resizeMode="cover"
              >
                <View style={styles.resumeCardOverlay}>
                  <View style={styles.resumeCardBadge}>
                    <Text style={styles.resumeCardBadgeText}>Intermediate</Text>
                  </View>
                </View>
              </ImageBackground>
              <View style={styles.resumeCardContent}>
                <View style={styles.flex1}>
                  <Text style={[styles.resumeCardTitle, { color: themeColors.text }]}>Blackjack Strategy</Text>
                  <Text style={[styles.resumeCardSubtitle, { color: colorScheme === 'dark' ? '#9db9b7' : '#64748b' }]}>Current: Double Down Rules</Text>
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
            <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 16 }]}>Start Learning</Text>
            <View style={styles.learningCardsContainer}>
              <LearningCard icon="style" title="Texas Hold'em" learners="15k learners" description="Master the art of reading opponents and bluffing." />
              <LearningCard icon="track-changes" title="European Roulette" learners="8.2k learners" description="Understand odds, payouts, and betting systems." />
              <LearningCard icon="casino" title="Classic Baccarat" learners="5.4k learners" description="High-stakes basics and banker vs player edge." />
            </View>
          </View>
           {/* New button to explicitly save mock stats */}
           <View style={{ padding: 16 }}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveMockStats}>
              <Text style={styles.primaryButtonText}>Save Mock Game Stats (for testing)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      {/* Custom Bottom Navigation Bar */}
      <CustomBottomNav />
    </SafeAreaView>
  );
};

const CustomBottomNav = () => {
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    
    return (
        <View style={[styles.bottomNav, { backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.95)' : 'rgba(255, 255, 255, 0.9)', borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
            <TouchableOpacity style={styles.navButton}>
                <MaterialIcons name="home" size={24} color={Colors.primary} style={{fontVariant: ['small-caps']}}/>
                <Text style={[styles.navButtonText, { color: Colors.primary }]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
                <MaterialIcons name="leaderboard" size={24} color={colorScheme === 'dark' ? '#9db9b7' : '#94a3b8'} />
                <Text style={[styles.navButtonText, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]}>Stats</Text>
            </TouchableOpacity>
            <View style={styles.navSpacer} />
            <TouchableOpacity style={styles.navButton}>
                <MaterialIcons name="auto-stories" size={24} color={colorScheme === 'dark' ? '#9db9b7' : '#94a3b8'} />
                <Text style={[styles.navButtonText, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]}>Strategy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
                <MaterialIcons name="person" size={24} color={colorScheme === 'dark' ? '#9db9b7' : '#94a3b8'} />
                <Text style={[styles.navButtonText, { color: colorScheme === 'dark' ? '#9db9b7' : '#94a3b8' }]}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.centerButton, { backgroundColor: Colors.primary, shadowColor: Colors.primary,  borderColor: themeColors.background, borderWidth: 4}]}>
                <MaterialIcons name="casino" size={32} color={Colors.dark.background} />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1 },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'transparent', // Handled by inline style
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
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
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1 },
  navButton: { alignItems: 'center', gap: 4, flex: 1 },
  navButtonText: { fontSize: 10, fontWeight: '500' },
  centerButton: { position: 'absolute', left: '50%', top: -48, marginLeft: -32, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  navSpacer: { width: 64 },
  primaryButton: { // Added style for the new button
    height: 56,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: { // Added style for the new button
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeDashboardScreen;
