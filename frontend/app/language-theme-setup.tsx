import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import config from '../config';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useLanguage } from '../contexts/LanguageContext';
import AppModal from '../components/ui/AppModal';

const LanguageThemeSetupScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { themePreference, setThemePreference } = useTheme();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>(
    themePreference === 'system' ? (colorScheme || 'dark') : themePreference
  );
  const [highContrastModeEnabled, setHighContrastModeEnabled] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleContinue = async () => {
    await setThemePreference(selectedTheme);
    router.push('/home-dashboard');
  };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top App Bar */}
        <View style={styles.topAppBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back-ios-new" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: themeColors.text }]}>{config.appName}</Text>
        </View>

        {/* Main Content Scroll Area */}
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Header */}
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconWrapper, { backgroundColor: 'rgba(17, 212, 196, 0.2)' }]}>
              <MaterialIcons name="settings-accessibility" size={32} color={Colors.primary} />
            </View>
            <Text style={[styles.h2, { color: themeColors.text }]}>{t('setup.preferences')}</Text>
            <Text style={[styles.p, { color: colorScheme === 'dark' ? '#94a3b8' : '#475569' }]}>
              {t('setup.preferencesDesc')}
            </Text>
          </View>

          {/* Configuration Form */}
          <View style={styles.formContainer}>
            {/* Language Selection */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithIcon}>
                <MaterialIcons name="language" size={20} color={Colors.primary} />
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('setup.preferredLanguage')}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#1e293b' : 'white',
                    shadowColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.05)',
                  },
                ]}
                onPress={() => setLanguagePickerVisible(true)}
              >
                <Text style={[styles.selectText, { color: themeColors.text }]}>
                  {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeLabel ?? 'English'}
                </Text>
                <MaterialIcons name="expand-more" size={24} color={'#94a3b8'} />
              </TouchableOpacity>
              <Text style={[styles.hintText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                {t('setup.languageHint')}
              </Text>
            </View>

            {/* Theme Selection (Segmented Control) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithIcon}>
                <MaterialIcons name="contrast" size={20} color={Colors.primary} />
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('setup.appTheme')}</Text>
              </View>
              <View
                style={[
                  styles.segmentedControlContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#1e293b' : 'white',
                    shadowColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.05)',
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.segmentedControlButton,
                    selectedTheme === 'light' && styles.segmentedControlButtonActive,
                    selectedTheme === 'light' && { backgroundColor: Colors.primary },
                  ]}
                  onPress={() => setSelectedTheme('light')}
                >
                  <MaterialIcons
                    name="light_mode"
                    size={20}
                    color={selectedTheme === 'light' ? 'white' : (colorScheme === 'dark' ? '#a1a1aa' : '#475569')}
                  />
                  <Text
                    style={[
                      styles.segmentedControlText,
                      selectedTheme === 'light' && { color: 'white', fontWeight: 'bold' },
                      selectedTheme !== 'light' && { color: colorScheme === 'dark' ? '#a1a1aa' : '#475569' },
                    ]}
                  >
                    {t('setup.light')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedControlButton,
                    selectedTheme === 'dark' && styles.segmentedControlButtonActive,
                    selectedTheme === 'dark' && { backgroundColor: Colors.primary },
                  ]}
                  onPress={() => setSelectedTheme('dark')}
                >
                  <MaterialIcons
                    name="dark_mode"
                    size={20}
                    color={selectedTheme === 'dark' ? 'white' : (colorScheme === 'dark' ? '#a1a1aa' : '#475569')}
                  />
                  <Text
                    style={[
                      styles.segmentedControlText,
                      selectedTheme === 'dark' && { color: 'white', fontWeight: 'bold' },
                      selectedTheme !== 'dark' && { color: colorScheme === 'dark' ? '#a1a1aa' : '#475569' },
                    ]}
                  >
                    {t('setup.dark')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Accessibility Quick Toggle */}
            <View
              style={[
                styles.accessibilityToggleContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1e293b' : 'white',
                  shadowColor: colorScheme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.05)',
                },
              ]}
            >
              <View style={styles.accessibilityToggleLeft}>
                <MaterialIcons name="visibility" size={24} color={Colors.primary} />
                <View>
                  <Text style={[styles.toggleTitle, { color: themeColors.text }]}>{t('setup.highContrastMode')}</Text>
                  <Text style={[styles.toggleSubtitle, { color: colorScheme === 'dark' ? '#a1a1aa' : '#64748b' }]}>
                    {t('setup.highContrastModeDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#a1a1aa', true: Colors.primary }}
                thumbColor={highContrastModeEnabled ? 'white' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setHighContrastModeEnabled}
                value={highContrastModeEnabled}
              />
            </View>
          </View>

          {/* Accessibility Footer Hint */}
          <View style={styles.footerHintContainer}>
            <Text style={[styles.footerHintText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              {t('setup.settingsHint')}
            </Text>
          </View>
        </ScrollView>

        {/* Language Picker Modal */}
        <AppModal
          visible={languagePickerVisible}
          onClose={() => setLanguagePickerVisible(false)}
          variant="bottom-sheet"
          title={t('setup.preferredLanguage')}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageOption, language === lang.code && styles.languageOptionActive]}
              onPress={() => {
                setLanguage(lang.code);
                setLanguagePickerVisible(false);
              }}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={[styles.languageLabel, { color: themeColors.text }]}>{lang.nativeLabel}</Text>
              {language === lang.code && (
                <MaterialIcons name="check" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </AppModal>

        {/* Fixed Footer Action */}
        <View
          style={[
            styles.footerAction,
            {
              backgroundColor: colorScheme === 'dark' ? '#102220' : '#f6f8f8',
              borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            },
          ]}
        >
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>{t('setup.continueToTraining')}</Text>
            <MaterialIcons name="arrow-forward" size={24} color={Colors.dark.background} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    maxWidth: 430, // max-w-[430px]
    alignSelf: 'center', // mx-auto
    width: '100%',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    paddingRight: 48,
  },
  scrollViewContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  heroHeader: {
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    marginBottom: 8,
  },
  p: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  formContainer: {
    gap: 32,
  },
  inputGroup: {
    gap: 12,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 0, // border-none
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectText: {
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentedControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    transitionDuration: 300,
  },
  segmentedControlButtonActive: {
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentedControlText: {
    fontSize: 16,
    fontWeight: '500',
  },
  accessibilityToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  accessibilityToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 12,
  },
  footerHintContainer: {
    marginTop: 48,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  footerHintText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerAction: {
    padding: 24,
    borderTopWidth: 1,
  },
  continueButton: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 9999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  languageOptionActive: {
    backgroundColor: 'rgba(17, 212, 196, 0.1)',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});

export default LanguageThemeSetupScreen;
