import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import CountryPicker from '../components/ui/CountryPicker';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/ui/BottomNav';

type TabType = 'identity' | 'security';

interface ProfileData {
  first_name: string;
  last_name: string;
  dob: string;
  country: string;
  email: string;
  auth_provider: string;
}

const ProfilePersonalDetailsScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const darkTheme = colorScheme === 'dark';
  const { token } = useAuth();
  const toast = useToast();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>(tab === 'security' ? 'security' : 'identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Identity state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);

  // Security state
  const [authProvider, setAuthProvider] = useState('email');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`${API_URL}/user/profile`, { headers: authHeaders });
      const data = resp.data as ProfileData;
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setDob(data.dob);
      setCountry(data.country);
      setAuthProvider(data.auth_provider || 'email');
      setOriginalProfile(data);
    } catch (error) {
      toast.show(t('profile.failedLoadProfile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const isDirty = originalProfile
    ? firstName !== originalProfile.first_name ||
      lastName !== originalProfile.last_name ||
      dob !== originalProfile.dob ||
      country !== originalProfile.country
    : false;

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/user/profile`, {
        first_name: firstName,
        last_name: lastName,
        dob,
        country,
      }, { headers: authHeaders });
      setOriginalProfile({ ...originalProfile!, first_name: firstName, last_name: lastName, dob, country });
      toast.show(t('profile.profileUpdated'), 'success');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        toast.show(error.response.data.detail, 'error');
      } else {
        toast.show(t('profile.failedSaveProfile'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const getPasswordStrength = (pw: string): { labelKey: string; color: string } => {
    if (pw.length < 8) return { labelKey: 'profile.strengthTooShort', color: Colors.error };
    let score = 0;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { labelKey: 'profile.strengthWeak', color: Colors.error };
    if (score === 2) return { labelKey: 'profile.strengthMedium', color: '#f59e0b' };
    return { labelKey: 'profile.strengthStrong', color: Colors.primary };
  };

  const isGoogleOnly = authProvider === 'google';

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.show(t('auth.passwordTooShort'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show(t('profile.passwordsMismatch'), 'error');
      return;
    }
    try {
      setChangingPassword(true);
      const body: any = { new_password: newPassword };
      if (!isGoogleOnly) {
        body.current_password = currentPassword;
      }
      await axios.put(`${API_URL}/user/password`, body, { headers: authHeaders });
      toast.show(t('profile.passwordChanged'), 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        toast.show(error.response.data.detail, 'error');
      } else {
        toast.show(t('profile.failedChangePassword'), 'error');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBack = () => router.back();

  const strength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: darkTheme ? themeColors.background : '#f6f8f8' }]}>
        <View style={[styles.flex1, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: darkTheme ? themeColors.background : '#f6f8f8' }]}>
      <View style={[styles.container, { backgroundColor: darkTheme ? themeColors.background : '#f6f8f8' }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: darkTheme ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)', borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back-ios-new" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('profile.accountSettings')}</Text>
          {activeTab === 'identity' ? (
            <TouchableOpacity onPress={handleSaveProfile} disabled={!isDirty || saving}>
              <Text style={[styles.headerSaveButton, { color: isDirty ? Colors.primary : '#94a3b8' }]}>
                {saving ? t('common.saving') : t('common.save')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'identity' && styles.tabButtonActive]}
            onPress={() => setActiveTab('identity')}
          >
            <Text style={[styles.tabButtonText, { color: activeTab === 'identity' ? Colors.dark.background : (darkTheme ? '#94a3b8' : '#64748b') }]}>
              {t('profile.identity')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'security' && styles.tabButtonActive]}
            onPress={() => setActiveTab('security')}
          >
            <Text style={[styles.tabButtonText, { color: activeTab === 'security' ? Colors.dark.background : (darkTheme ? '#94a3b8' : '#64748b') }]}>
              {t('profile.security')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {activeTab === 'identity' ? (
            <>
              {/* Profile Photo Section */}
              <View style={styles.profilePhotoSection}>
                <View style={styles.profilePhotoContainer}>
                  <View style={[styles.profilePhotoImage, { backgroundColor: darkTheme ? themeColors.card : '#e2e8f0', justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialIcons name="person" size={48} color={darkTheme ? '#94a3b8' : '#64748b'} />
                  </View>
                </View>
              </View>

              {/* Identity Form */}
              <View style={styles.formContainer}>
                <FormSection title={t('profile.identity')}>
                  <FormField label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} icon="edit" />
                  <FormField label={t('profile.lastName')} value={lastName} onChangeText={setLastName} icon="edit" isLast />
                </FormSection>

                <FormSection title={t('profile.details')}>
                  <FormField label={t('profile.dateOfBirth')} value={dob} onChangeText={setDob} icon="calendar-month" type="date" />
                  <View style={[styles.formFieldContainer, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{t('profile.countryOfResidence')}</Text>
                    <CountryPicker
                      value={country}
                      onSelect={setCountry}
                      colorScheme={colorScheme}
                    />
                  </View>
                </FormSection>

                <FormSection title={t('profile.accountInfo')}>
                  <View style={[styles.formFieldContainer, { borderBottomWidth: 0, paddingHorizontal: 16, paddingVertical: 12 }]}>
                    <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{t('profile.email')}</Text>
                    <Text style={[styles.formFieldValue, { color: themeColors.text, opacity: 0.7 }]}>{originalProfile?.email}</Text>
                  </View>
                </FormSection>
              </View>
            </>
          ) : (
            /* Security Tab */
            <View style={styles.formContainer}>
              <FormSection title={isGoogleOnly ? t('profile.setPassword') : t('profile.changePassword')}>
                {!isGoogleOnly && (
                  <View style={[styles.formFieldContainer, { borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
                    <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{t('profile.currentPassword')}</Text>
                    <View style={styles.formFieldRow}>
                      <TextInput
                        style={[styles.formFieldValue, { color: themeColors.text }]}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPassword}
                        placeholder={t('profile.enterCurrentPassword')}
                        placeholderTextColor={darkTheme ? '#a1a1aa' : '#6b7280'}
                      />
                      <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                        <MaterialIcons name={showCurrentPassword ? 'visibility' : 'visibility-off'} size={20} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={[styles.formFieldContainer, { borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
                  <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{t('profile.newPasswordLabel')}</Text>
                  <View style={styles.formFieldRow}>
                    <TextInput
                      style={[styles.formFieldValue, { color: themeColors.text }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      placeholder={t('profile.enterNewPassword')}
                      placeholderTextColor={darkTheme ? '#a1a1aa' : '#6b7280'}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                      <MaterialIcons name={showNewPassword ? 'visibility' : 'visibility-off'} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  {newPassword.length > 0 && (
                    <Text style={[styles.strengthText, { color: strength.color }]}>
                      {t('profile.strength', { label: t(strength.labelKey) })}
                    </Text>
                  )}
                </View>
                <View style={[styles.formFieldContainer, { borderBottomWidth: 0, borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
                  <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{t('profile.confirmPassword')}</Text>
                  <View style={styles.formFieldRow}>
                    <TextInput
                      style={[styles.formFieldValue, { color: themeColors.text }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      placeholder={t('profile.reenterNewPassword')}
                      placeholderTextColor={darkTheme ? '#a1a1aa' : '#6b7280'}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <Text style={[styles.strengthText, { color: Colors.error }]}>{t('profile.passwordsMismatch')}</Text>
                  )}
                </View>
              </FormSection>

              <TouchableOpacity
                style={[styles.changePasswordButton, (changingPassword || !newPassword || !confirmPassword) && { opacity: 0.5 }]}
                onPress={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color={Colors.dark.background} />
                ) : (
                  <Text style={styles.changePasswordButtonText}>
                    {isGoogleOnly ? t('profile.setPassword') : t('profile.changePassword')}
                  </Text>
                )}
              </TouchableOpacity>

              {isGoogleOnly && (
                <View style={[styles.infoBox, { backgroundColor: darkTheme ? 'rgba(17, 212, 196, 0.1)' : 'rgba(17, 212, 196, 0.05)', borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
                  <MaterialIcons name="info" size={20} color={Colors.primary} />
                  <Text style={[styles.infoText, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>
                    {t('profile.googlePasswordInfo')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
      <BottomNav activeTab="profile" />
    </SafeAreaView>
  );
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const darkTheme = useColorScheme() === 'dark';
  return (
    <View style={styles.formSection}>
      <Text style={[styles.formSectionTitle, { color: Colors.primary }]}>{title}</Text>
      <View style={[styles.formSectionContent, { backgroundColor: darkTheme ? Colors.dark.card : 'white', borderColor: darkTheme ? Colors.dark.border : '#e2e8f0' }]}>
        {children}
      </View>
    </View>
  );
};

const FormField = ({ label, value, onChangeText, icon, isLast = false, type = 'text' }: {
  label: string; value: string; onChangeText: (t: string) => void; icon: string; isLast?: boolean; type?: string;
}) => {
  const darkTheme = useColorScheme() === 'dark';
  const themeColors = Colors[darkTheme ? 'dark' : 'light'];
  return (
    <View style={[styles.formFieldContainer, { borderBottomWidth: isLast ? 0 : 1, borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
      <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{label}</Text>
      <View style={styles.formFieldRow}>
        <TextInput
          style={[styles.formFieldValue, { color: themeColors.text }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={type === 'date' ? 'numbers-and-punctuation' : 'default'}
        />
        <MaterialIcons name={icon as any} size={20} color="#94a3b8" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 36 : 12, paddingBottom: 12, borderBottomWidth: 1, zIndex: 50 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.2 },
  headerSaveButton: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 8 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 9999, alignItems: 'center', backgroundColor: 'transparent' },
  tabButtonActive: { backgroundColor: Colors.primary },
  tabButtonText: { fontSize: 14, fontWeight: 'bold' },
  scrollViewContent: { padding: 16, paddingBottom: 48 },
  profilePhotoSection: { alignItems: 'center', marginBottom: 24 },
  profilePhotoContainer: { position: 'relative' },
  profilePhotoImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: 'rgba(17, 212, 196, 0.3)' },
  formContainer: { gap: 24 },
  formSection: { gap: 6 },
  formSectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 4 },
  formSectionContent: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  formFieldContainer: { padding: 16 },
  formFieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  formFieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formFieldValue: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, fontSize: 16, fontWeight: '600', flex: 1 },
  strengthText: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  changePasswordButton: { height: 52, borderRadius: 9999, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  changePasswordButtonText: { color: Colors.dark.background, fontSize: 16, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
});

export default ProfilePersonalDetailsScreen;
