import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/contexts/ThemeContext';
import * as ExpoClipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
import config, { API_URL } from '../config';

const ProfileSettingsInviteScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const darkTheme = colorScheme === 'dark';
  const { isDark, setThemePreference } = useTheme();

  const [haptics, setHaptics] = useState(true);
  const [userName, setUserName] = useState('');

  const { token, logout } = useAuth();
  const toast = useToast();
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
    toast.show('Referral Link Copied!', 'success');
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
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: darkTheme ? 'transparent' : 'transparent' }]}>
            <MaterialIcons name="arrow-back-ios-new" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Profile Settings</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Overview */}
          <View style={styles.profileOverview}>
            <View style={styles.profileImageContainer}>
              <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGShgYsbpaMVHMAhKmhVZWFhiCsTFvYNp4v5xkmuMWRZx2GL5hRIz-m8eLgrVIWnYaoHJX-4-Lqffm6vPknHbf8U6m9t6eEajUwAEeEw2VmpYxS534KdZGBB6rm6fKXIJWzbjAZU9gPPr0c32bym_Ar_c055RPdEIfAtxG6LDTGF83R3QZwphwQ38nrZcqzIGRzFeBIrW_sb-2YbYBMdsK2vtVEGuome52RyW6Ya5HAW8LCqMeRfMl9wJaROQeGvvm3wfuEx1JrZGB' }} style={styles.profileImage} />
              <TouchableOpacity style={[styles.editIcon, { backgroundColor: Colors.primary, borderColor: themeColors.background }]}>
                <MaterialIcons name="edit" size={16} color={Colors.dark.background} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.profileName, { color: themeColors.text }]}>{userName}</Text>
            <Text style={styles.profileStats}>{config.appName} Member</Text>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.sectionContent}>
              <SettingsRow icon="person" title="Personal Details" isFirst
                onPress={() => router.push('/profile-personal-details')} />
              <SettingsRow icon="lock" title="Password & Security" isLast
                onPress={() => router.push({ pathname: '/profile-personal-details', params: { tab: 'security' } })} />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.sectionContent}>
                <SettingsRow icon="translate" title="Language" value="English (US)" isFirst onPress={() => console.log('Language')} />
                <SettingsRow icon="dark-mode" title="Dark Mode" isToggle value={isDark} onValueChange={(val: boolean) => setThemePreference(val ? 'dark' : 'light')} />
                <SettingsRow icon="vibration" title="Haptic Feedback" isToggle value={haptics} onValueChange={setHaptics} isLast />
            </View>
          </View>

          {/* Invite Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite Friends</Text>
            <View style={[styles.inviteCard, { backgroundColor: 'rgba(17, 212, 196, 0.1)', borderColor: 'rgba(17, 212, 196, 0.2)' }]}>
                <View style={styles.inviteHeader}>
                    <View style={[styles.inviteIcon, {backgroundColor: Colors.primary}]}><MaterialIcons name="celebration" size={24} color={Colors.dark.background} /></View>
                    <View>
                        <Text style={[styles.inviteTitle, {color: themeColors.text}]}>Win Together</Text>
                        <Text style={styles.inviteSubtitle}>Refer a friend and you both get 500 Chips for training!</Text>
                    </View>
                </View>
                <View style={styles.referralContainer}>
                    <TextInput style={[styles.referralInput, {backgroundColor: darkTheme ? themeColors.background : 'white', borderColor: 'rgba(17, 212, 196, 0.3)'}]} value={referralLink} editable={false} />
                    <TouchableOpacity style={[styles.copyButton, {backgroundColor: Colors.primary}]} onPress={copyToClipboard}><Text style={styles.copyButtonText}>Copy</Text></TouchableOpacity>
                </View>
                <View style={styles.shareButtonsContainer}>
                    <ShareButton icon="chat" brandColor="#25D366" label="WhatsApp" />
                    <ShareButton icon="alternate-email" brandColor="#1DA1F2" label="Twitter" />
                    <ShareButton icon="message" brandColor="#6366F1" label="Messages" />
                    <ShareButton icon="share" brandColor="#3B82F6" label="More" />
                </View>
            </View>
          </View>
          
          {/* Support Section */}
           <View style={[styles.section, {marginBottom: 100}]}>
             <Text style={styles.sectionTitle}>Support</Text>
             <View style={styles.sectionContent}>
                 <SettingsRow icon="help" title="Help Center" isFirst onPress={() => console.log('Help Center')} />
                 <SettingsRow icon="logout" title="Logout" isLast isDestructive onPress={handleLogout} />
             </View>
           </View>

        </ScrollView>
      </View>
      <SettingsBottomNav />
    </SafeAreaView>
  );
};

const SettingsRow = ({ icon, title, value, isToggle, onValueChange, isFirst, isLast, onPress, isDestructive }) => {
    const colorScheme = useColorScheme();
    const darkTheme = colorScheme === 'dark';

    return(
        <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.settingsRow, { backgroundColor: darkTheme ? 'rgba(255,255,255,0.05)' : 'white'}, isFirst && styles.settingsRowFirst, isLast && styles.settingsRowLast]}>
            <View style={[styles.settingsIcon, {backgroundColor: isDestructive ? 'rgba(255, 77, 77, 0.1)' : 'rgba(17, 212, 196, 0.2)'}]}>
                <MaterialIcons name={icon} size={24} color={isDestructive ? '#ff4d4d' : Colors.primary} />
            </View>
            <Text style={[styles.settingsTitle, {color: isDestructive ? '#ff4d4d' : (darkTheme ? 'white' : '#11181C')}]}>{title}</Text>
            {value && <Text style={styles.settingsValue}>{value}</Text>}
            {!isToggle && onPress && <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />}
            {isToggle && <Switch value={value} onValueChange={onValueChange} trackColor={{false: '#767577', true: Colors.primary}} thumbColor={'#f4f3f4'} />}
        </TouchableOpacity>
    )
}

const ShareButton = ({icon, brandColor, label}) => {
    const darkTheme = useColorScheme() === 'dark';
    return (
        <TouchableOpacity style={styles.shareButton}>
            <View style={[styles.shareButtonIcon, {backgroundColor: darkTheme ? 'rgba(255,255,255,0.05)' : 'white', borderColor: darkTheme ? '#374151' : '#e5e7eb'}]}>
                <MaterialIcons name={icon} size={24} color={brandColor} />
            </View>
            <Text style={styles.shareButtonLabel}>{label}</Text>
        </TouchableOpacity>
    )
}

const SettingsBottomNav = () => (
    <View style={[styles.bottomNav, { backgroundColor: useColorScheme() === 'dark' ? 'rgba(16, 34, 32, 0.95)' : 'rgba(246, 248, 248, 0.95)', borderColor: useColorScheme() === 'dark' ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/home-dashboard')}><MaterialIcons name="home" size={28} color="#9ca3af" /><Text style={[styles.navText, {color: '#9ca3af'}]}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton}><MaterialIcons name="sports-esports" size={28} color="#9ca3af" /><Text style={[styles.navText, {color: '#9ca3af'}]}>Train</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton}><MaterialIcons name="leaderboard" size={28} color="#9ca3af" /><Text style={[styles.navText, {color: '#9ca3af'}]}>Stats</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton}><MaterialIcons name="person" size={28} color={Colors.primary} /><Text style={[styles.navText, {color: Colors.primary}]}>Profile</Text></TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 36 : 12, paddingBottom: 12, borderBottomWidth: 1 },
    headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center', paddingRight: 40 },
    profileOverview: { padding: 24, alignItems: 'center' },
    profileImageContainer: { position: 'relative' },
    profileImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: Colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    editIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    profileName: { marginTop: 16, fontSize: 20, fontWeight: 'bold' },
    profileStats: { fontSize: 14, color: '#9ca3af' },
    section: { marginTop: 8 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', paddingHorizontal: 24, marginBottom: 12 },
    sectionContent: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
    settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
    settingsRowFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    settingsRowLast: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
    settingsIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    settingsTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
    settingsValue: { fontSize: 14, color: '#9ca3af' },
    inviteCard: { marginHorizontal: 16, borderRadius: 20, padding: 24, borderWidth: 1 },
    inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    inviteIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    inviteTitle: { fontSize: 18, fontWeight: 'bold' },
    inviteSubtitle: { fontSize: 12, color: '#9ca3af', lineHeight: 16 },
    referralContainer: { position: 'relative', marginBottom: 16 },
    referralInput: { width: '100%', borderRadius: 9999, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 20, fontSize: 14, fontWeight: '500' },
    copyButton: { position: 'absolute', right: 8, top: 6, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999 },
    copyButtonText: { color: Colors.dark.background, fontSize: 12, fontWeight: 'bold' },
    shareButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 },
    shareButton: { alignItems: 'center', gap: 8 },
    shareButtonIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    shareButtonLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 12, borderTopWidth: 1 },
    navButton: { alignItems: 'center', gap: 4 },
    navText: { fontSize: 10, fontWeight: '500'},
});

export default ProfileSettingsInviteScreen;
