import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  Platform,
  Share,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoClipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
import config, { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import BottomNav from '../components/ui/BottomNav';
import AppModal from '../components/ui/AppModal';
import IconButton from '../components/ui/IconButton';
import Button from '../components/ui/Button';
import ListOption from '../components/ui/ListOption';
import SettingsRow from '../components/ui/SettingsRow';
import ShareButton from '../components/ui/ShareButton';

const ProfileSettingsInviteScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const darkTheme = colorScheme === 'dark';
  const { isDark, setThemePreference } = useTheme();

  const [haptics, setHaptics] = useState(true);
  const [userName, setUserName] = useState('');
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  // Load haptics preference from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('betmaster21_haptics').then(val => {
      if (val !== null) setHaptics(val === 'true');
    });
  }, []);

  const { token, logout } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const referralLink = `${config.appName.toLowerCase()}.com/ref`;

  useEffect(() => {
    if (token) {
      axios.get(`${API_URL}/user/profile`, { headers: { Authorization: `Bearer ${token}` } })
        .then((resp) => {
          const data = resp.data;
          const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
          setUserName(name || 'User');
        })
        .catch(() => setUserName('User'));
    }
  }, [token]);

  const copyToClipboard = async () => {
    await ExpoClipboard.setStringAsync(referralLink);
    toast.show(t('profile.referralCopied'), 'success');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('profile.referralDesc')} ${referralLink}`,
      });
    } catch {
      // User cancelled or error
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/signup');
  };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        {/* TopAppBar */}
        <View style={[styles.header, { backgroundColor: darkTheme ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)', borderColor: darkTheme ? '#1e293b' : '#e2e8f0' }]}>
          <IconButton icon="arrow-back-ios-new" onPress={() => router.back()} iconColor={themeColors.text} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('profile.profileSettings')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Overview */}
          <View style={styles.profileOverview}>
            <View style={styles.profileImageContainer}>
              <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGShgYsbpaMVHMAhKmhVZWFhiCsTFvYNp4v5xkmuMWRZx2GL5hRIz-m8eLgrVIWnYaoHJX-4-Lqffm6vPknHbf8U6m9t6eEajUwAEeEw2VmpYxS534KdZGBB6rm6fKXIJWzbjAZU9gPPr0c32bym_Ar_c055RPdEIfAtxG6LDTGF83R3QZwphwQ38nrZcqzIGRzFeBIrW_sb-2YbYBMdsK2vtVEGuome52RyW6Ya5HAW8LCqMeRfMl9wJaROQeGvvm3wfuEx1JrZGB' }} style={styles.profileImage} />
              <IconButton icon="edit" onPress={() => {}} variant="primary" size="sm" style={styles.editIcon} />
            </View>
            <Text style={[styles.profileName, { color: themeColors.text }]}>{userName}</Text>
            <Text style={styles.profileStats}>{t('profile.member', { appName: config.appName })}</Text>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
            <View style={styles.sectionContent}>
              <SettingsRow icon="person" title={t('profile.personalDetails')} isFirst
                onPress={() => router.push('/profile-personal-details')} />
              <SettingsRow icon="lock" title={t('profile.passwordSecurity')} isLast
                onPress={() => router.push({ pathname: '/profile-personal-details', params: { tab: 'security' } })} />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
            <View style={styles.sectionContent}>
                <SettingsRow icon="translate" title={t('profile.language')} value={SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeLabel ?? 'English'} isFirst onPress={() => setLanguagePickerVisible(true)} />
                <SettingsRow icon="dark-mode" title={t('profile.darkMode')} isToggle value={isDark} onValueChange={(val: boolean) => setThemePreference(val ? 'dark' : 'light')} />
                <SettingsRow icon="vibration" title={t('profile.hapticFeedback')} isToggle value={haptics} onValueChange={(val: boolean) => { setHaptics(val); AsyncStorage.setItem('betmaster21_haptics', String(val)); }} isLast />
            </View>
          </View>

          {/* Invite Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.inviteFriends')}</Text>
            <View style={[styles.inviteCard, { backgroundColor: 'rgba(17, 212, 196, 0.1)', borderColor: 'rgba(17, 212, 196, 0.2)' }]}>
                <View style={styles.inviteHeader}>
                    <View style={[styles.inviteIcon, {backgroundColor: Colors.primary}]}><MaterialIcons name="celebration" size={24} color={Colors.dark.background} /></View>
                    <View>
                        <Text style={[styles.inviteTitle, {color: themeColors.text}]}>{t('profile.winTogether')}</Text>
                        <Text style={styles.inviteSubtitle}>{t('profile.referralDesc')}</Text>
                    </View>
                </View>
                <View style={styles.referralContainer}>
                    <TextInput style={[styles.referralInput, {backgroundColor: darkTheme ? themeColors.background : 'white', borderColor: 'rgba(17, 212, 196, 0.3)'}]} value={referralLink} editable={false} />
                    <Button title={t('common.copy')} onPress={copyToClipboard} variant="primary" size="sm" style={styles.copyButton} />
                </View>
                <View style={styles.shareButtonsContainer}>
                    <ShareButton icon="chat" brandColor="#25D366" label={t('profile.whatsApp')} onPress={handleShare} />
                    <ShareButton icon="alternate-email" brandColor="#1DA1F2" label={t('profile.twitter')} onPress={handleShare} />
                    <ShareButton icon="message" brandColor="#6366F1" label={t('profile.messages')} onPress={handleShare} />
                    <ShareButton icon="share" brandColor="#3B82F6" label={t('profile.more')} onPress={handleShare} />
                </View>
            </View>
          </View>

          {/* Support Section */}
           <View style={[styles.section, {marginBottom: 100}]}>
             <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
             <View style={styles.sectionContent}>
                 <SettingsRow icon="help" title={t('profile.helpCenter')} isFirst onPress={() => console.log('Help Center')} />
                 <SettingsRow icon="logout" title={t('profile.logout')} isLast isDestructive onPress={handleLogout} />
             </View>
           </View>

        </ScrollView>
      </View>
      <AppModal
        visible={languagePickerVisible}
        onClose={() => setLanguagePickerVisible(false)}
        variant="bottom-sheet"
        title={t('profile.language')}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <ListOption
            key={lang.code}
            leadingText={lang.flag}
            label={lang.nativeLabel}
            selected={language === lang.code}
            onPress={() => {
              setLanguage(lang.code);
              setLanguagePickerVisible(false);
            }}
          />
        ))}
      </AppModal>
      <BottomNav activeTab="profile" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 36 : 12, paddingBottom: 12, borderBottomWidth: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', paddingRight: 40 },
    profileOverview: { padding: 24, alignItems: 'center' },
    profileImageContainer: { position: 'relative' },
    profileImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: Colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    editIcon: { position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: 'white' },
    profileName: { marginTop: 16, fontSize: 20, fontWeight: 'bold' },
    profileStats: { fontSize: 14, color: '#9ca3af' },
    section: { marginTop: 8 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', paddingHorizontal: 24, marginBottom: 12 },
    sectionContent: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
    inviteCard: { marginHorizontal: 16, borderRadius: 20, padding: 24, borderWidth: 1 },
    inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    inviteIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    inviteTitle: { fontSize: 18, fontWeight: 'bold' },
    inviteSubtitle: { fontSize: 12, color: '#9ca3af', lineHeight: 16 },
    referralContainer: { position: 'relative', marginBottom: 16 },
    referralInput: { width: '100%', borderRadius: 9999, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 20, fontSize: 14, fontWeight: '500' },
    copyButton: { position: 'absolute', right: 8, top: 6 },
    shareButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 },
});

export default ProfileSettingsInviteScreen;
