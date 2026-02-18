import React, { useState, useMemo, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { API_URL } from '../config';
import CountryPicker from '../components/ui/CountryPicker';
import { validateDob, parseDobToDate, formatDateToDob, formatDateToISO } from '../utils/dob-validation';
import { useTranslation } from 'react-i18next';

// Only import DateTimePicker on native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

const MandatoryDetailsScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { token, setMandatoryDetailsCompleted } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobTouched, setDobTouched] = useState(false);
  const webDateRef = useRef<HTMLInputElement | null>(null);

  const firstNameError = firstName.trim() === '';
  const lastNameError = lastName.trim() === '';
  const countryError = country.trim() === '';

  const dobValidationError = useMemo(() => validateDob(dob), [dob]);
  const dobHasError = dobTouched && (dobValidationError !== null || dob.trim() === '');

  const handleDobChange = (text: string) => {
    setDobTouched(true);
    const digits = text.replace(/\D/g, '').slice(0, 8);

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
    }
    setDob(formatted);
  };

  const pickerDate = useMemo(() => {
    const parsed = parseDobToDate(dob);
    if (parsed && parsed <= new Date()) return parsed;
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, [dob]);

  const eighteenYearsAgo = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setDobTouched(true);
      setDob(formatDateToDob(selectedDate));
    }
  };

  const handlePickerDone = () => {
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    if (Platform.OS === 'web') {
      // On web, click the hidden native date input
      webDateRef.current?.showPicker?.();
      webDateRef.current?.click();
    } else {
      setShowDatePicker(true);
    }
  };

  const handleWebDateChange = (e: any) => {
    const value = e.target?.value || e.nativeEvent?.text;
    if (value) {
      const [yyyy, mm, dd] = value.split('-');
      setDobTouched(true);
      setDob(`${mm} / ${dd} / ${yyyy}`);
    }
  };

  const handleContinue = async () => {
    if (firstName.trim() === '') {
      toast.show(t('onboarding.firstNameRequired'), 'error');
      return;
    }
    if (lastName.trim() === '') {
      toast.show(t('onboarding.lastNameRequired'), 'error');
      return;
    }
    if (dob.trim() === '') {
      setDobTouched(true);
      toast.show(t('onboarding.dobRequired'), 'error');
      return;
    }
    if (dobValidationError) {
      toast.show(dobValidationError, 'error');
      return;
    }
    if (country.trim() === '') {
      toast.show(t('onboarding.countryRequired'), 'error');
      return;
    }

    try {
      setLoading(true);

      if (!token) {
        toast.show(t('onboarding.sessionExpired'), 'error');
        router.replace('/login');
        return;
      }

      // Save mandatory details to backend
      const response = await fetch(`${API_URL}/mandatory-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dob: dob.trim(),
          country: country.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          toast.show(t('onboarding.sessionExpired'), 'error');
          router.replace('/login');
          return;
        }
        throw new Error(errorData.detail || 'Failed to save details.');
      }

      await setMandatoryDetailsCompleted(true);
      console.log('Mandatory details saved:', { firstName, lastName, dob, country });
      router.push('/home-dashboard');
    } catch (error: any) {
      toast.show(error.message || 'Something went wrong. Please try again.', 'error');
      console.error('Mandatory details error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const isDark = colorScheme === 'dark';

  // Compute web date input value from current dob
  const webDateValue = useMemo(() => {
    const parsed = parseDobToDate(dob);
    return parsed ? formatDateToISO(parsed) : '';
  }, [dob]);

  const maxWebDate = useMemo(() => formatDateToISO(eighteenYearsAgo), [eighteenYearsAgo]);

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top Navigation Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)',
              borderColor: isDark ? '#1e293b' : '#e2e8f0',
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialIcons name="arrow-back-ios-new" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('onboarding.step', { current: 2, total: 5 })}</Text>
            <View style={styles.spacer} />
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarBackground,
                { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' },
              ]}
            >
              <View style={[styles.progressBarFill, { backgroundColor: Colors.primary, width: '40%' }]} />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.mb8}>
            <Text style={[styles.h2, { color: themeColors.text }]}>{t('onboarding.mandatoryDetails')}</Text>
            <Text style={[styles.p, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t('onboarding.mandatoryDetailsDesc')}
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            {/* First Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                {t('onboarding.firstNameLabel')}
              </Text>
              <View style={styles.relativeInput}>
                <TextInput
                  style={[
                    styles.textInput,
                    firstNameError && styles.textInputError,
                    {
                      backgroundColor: firstNameError
                        ? (isDark ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)')
                        : (isDark ? 'rgba(16, 34, 32, 0.5)' : 'white'),
                      color: themeColors.text,
                    },
                  ]}
                  placeholder={t('onboarding.firstNamePlaceholder')}
                  placeholderTextColor={isDark ? '#a1a1aa' : '#6b7280'}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                {firstNameError && (
                  <MaterialIcons name="error" size={24} color={Colors.error} style={styles.inputIconRight} />
                )}
              </View>
              {firstNameError && (
                <Text style={[styles.errorMessage, { color: Colors.error }]}>{t('onboarding.mandatory')}</Text>
              )}
            </View>

            {/* Last Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                {t('onboarding.lastNameLabel')}
              </Text>
              <View style={styles.relativeInput}>
                <TextInput
                  style={[
                    styles.textInput,
                    lastNameError && styles.textInputError,
                    {
                      backgroundColor: isDark ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)',
                      color: themeColors.text,
                    },
                  ]}
                  placeholder={t('onboarding.lastNamePlaceholder')}
                  placeholderTextColor={isDark ? '#a1a1aa' : '#6b7280'}
                  value={lastName}
                  onChangeText={setLastName}
                />
                {lastNameError && (
                  <MaterialIcons name="error" size={24} color={Colors.error} style={styles.inputIconRight} />
                )}
              </View>
              {lastNameError && (
                <Text style={[styles.errorMessage, { color: Colors.error }]}>{t('onboarding.mandatory')}</Text>
              )}
            </View>

            {/* Date of Birth Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                {t('onboarding.dobLabel')}
              </Text>
              <View style={styles.relativeInput}>
                <TextInput
                  style={[
                    styles.textInput,
                    dobHasError && styles.textInputError,
                    {
                      borderColor: dobHasError
                        ? Colors.error
                        : (isDark ? '#1e293b' : '#e2e8f0'),
                      backgroundColor: dobHasError
                        ? (isDark ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)')
                        : (isDark ? 'rgba(16, 34, 32, 0.5)' : 'white'),
                      color: themeColors.text,
                      paddingRight: 56,
                    },
                  ]}
                  placeholder={t('onboarding.dobPlaceholder')}
                  placeholderTextColor={isDark ? '#a1a1aa' : '#6b7280'}
                  value={dob}
                  onChangeText={handleDobChange}
                  onBlur={() => setDobTouched(true)}
                  keyboardType="number-pad"
                  maxLength={14}
                />
                {dobHasError ? (
                  <MaterialIcons name="error" size={24} color={Colors.error} style={styles.inputIconRight} />
                ) : (
                  <TouchableOpacity
                    style={styles.inputIconRight}
                    onPress={openDatePicker}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <MaterialIcons name="calendar-today" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                )}

                {/* Hidden native date input for web */}
                {Platform.OS === 'web' && (
                  <input
                    ref={webDateRef as any}
                    type="date"
                    value={webDateValue}
                    max={maxWebDate}
                    min="1900-01-01"
                    onChange={handleWebDateChange}
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0,
                      width: 32,
                      height: 32,
                      cursor: 'pointer',
                    }}
                    tabIndex={-1}
                  />
                )}
              </View>
              {dobTouched && dobValidationError ? (
                <Text style={[styles.errorMessage, { color: Colors.error }]}>{dobValidationError}</Text>
              ) : (
                <Text style={[styles.dobHint, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  {t('onboarding.dobHint')}
                </Text>
              )}
            </View>

            {/* Date Picker — Native only (iOS Modal / Android Dialog) */}
            {Platform.OS === 'ios' && showDatePicker && DateTimePicker && (
              <Modal transparent animationType="slide">
                <View style={styles.modalOverlay}>
                  <View
                    style={[
                      styles.modalContent,
                      { backgroundColor: isDark ? '#1e293b' : 'white' },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={[styles.modalButton, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                          {t('common.cancel')}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                        {t('onboarding.dobLabel')}
                      </Text>
                      <TouchableOpacity onPress={handlePickerDone}>
                        <Text style={[styles.modalButton, { color: Colors.primary }]}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDatePickerChange}
                      maximumDate={eighteenYearsAgo}
                      minimumDate={new Date(1900, 0, 1)}
                      textColor={themeColors.text}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {Platform.OS === 'android' && showDatePicker && DateTimePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="default"
                onChange={handleDatePickerChange}
                maximumDate={eighteenYearsAgo}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {/* Country Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#d1d5db' : '#4b5563' }]}>
                {t('onboarding.countryLabel')}
              </Text>
              <CountryPicker
                value={country}
                onSelect={setCountry}
                error={countryError}
                colorScheme={colorScheme}
              />
              {countryError && (
                <Text style={[styles.errorMessage, { color: Colors.error }]}>{t('onboarding.mandatory')}</Text>
              )}
            </View>

            {/* Privacy Consent Note */}
            <View style={styles.privacyNoteContainer}>
              <Text style={[styles.privacyNoteText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {t('onboarding.privacyNote')}{' '}
                <Text style={[styles.linkText, { color: Colors.primary }]} onPress={() => console.log('Privacy Policy')}>
                  {t('auth.privacyPolicy')}
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer CTA */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: isDark ? 'rgba(16, 34, 32, 0.9)' : 'rgba(246, 248, 248, 0.9)',
              borderColor: isDark ? '#1e293b' : '#e2e8f0',
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.continueButton, loading && { opacity: 0.6 }]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.dark.background} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>{t('common.continue')}</Text>
                <MaterialIcons name="arrow-forward" size={24} color={Colors.dark.background} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Verification Badge (Visual Element) */}
        <View style={styles.verificationBadge}>
          <MaterialIcons name="verified-user" size={96} color={'rgba(255,255,255,0.1)'} />
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
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 24 : 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 9999,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  spacer: {
    width: 40,
  },
  progressBarContainer: {
    paddingHorizontal: 24,
  },
  progressBarBackground: {
    height: 6,
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  scrollViewContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  mb8: {
    marginBottom: 32,
  },
  h2: {
    fontSize: 30,
    fontWeight: 'bold',
    lineHeight: 38,
    marginBottom: 8,
  },
  p: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  relativeInput: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    width: '100%',
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 9999,
    borderWidth: 2,
    fontSize: 16,
  },
  textInputError: {
    borderColor: Colors.error,
  },
  inputIconRight: {
    position: 'absolute',
    right: 20,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dobHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  privacyNoteContainer: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  privacyNoteText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    zIndex: 10,
  },
  continueButton: {
    width: '100%',
    height: 64,
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
  verificationBadge: {
    position: 'absolute',
    bottom: 128,
    right: 24,
    opacity: 0.1,
  },
});

export default MandatoryDetailsScreen;
