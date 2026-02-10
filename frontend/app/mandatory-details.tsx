import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';

const MandatoryDetailsScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [firstName, setFirstName] = useState('Alex');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');

  const lastNameError = lastName.trim() === ''; // Simulate error
  const countryError = country.trim() === ''; // Simulate error

  const handleContinue = () => {
    console.log('Continue with mandatory details:', { firstName, lastName, dob, country });
    router.push('/language-theme-setup');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: themeColors.background }]}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Top Navigation Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)',
              borderColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialIcons name="arrow-back-ios-new" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Step 2 of 5</Text>
            <View style={styles.spacer} />
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarBackground,
                { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0' },
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
            <Text style={[styles.h2, { color: themeColors.text }]}>Mandatory Details</Text>
            <Text style={[styles.p, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
              Help us secure your account. These details are required for legal compliance and casino safety training.
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            {/* First Name Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                First Name
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
                    backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.5)' : 'white',
                    color: themeColors.text,
                  },
                ]}
                placeholder="Enter your first name"
                placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            {/* Last Name Field (Error State) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                Last Name
              </Text>
              <View style={styles.relativeInput}>
                <TextInput
                  style={[
                    styles.textInput,
                    lastNameError && styles.textInputError,
                    {
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)',
                      color: themeColors.text,
                    },
                  ]}
                  placeholder="Enter your last name"
                  placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                  value={lastName}
                  onChangeText={setLastName}
                />
                {lastNameError && (
                  <MaterialIcons name="error" size={24} color={Colors.error} style={styles.inputIconRight} />
                )}
              </View>
              {lastNameError && (
                <Text style={[styles.errorMessage, { color: Colors.error }]}>This field is mandatory</Text>
              )}
            </View>

            {/* Date of Birth Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                Date of Birth
              </Text>
              <TouchableOpacity style={styles.relativeInput} onPress={() => console.log('Open Date Picker')}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
                      backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.5)' : 'white',
                      color: themeColors.text,
                    },
                  ]}
                  placeholder="MM / DD / YYYY"
                  placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                  value={dob}
                  onChangeText={setDob}
                  editable={false} // Make it non-editable to open date picker on press
                />
                <MaterialIcons name="calendar-today" size={24} color={'#94a3b8'} style={styles.inputIconRight} />
              </TouchableOpacity>
              <Text style={[styles.dobHint, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                You must be at least 18 years old.
              </Text>
            </View>

            {/* Country Selection (Error State) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colorScheme === 'dark' ? '#d1d5db' : '#4b5563' }]}>
                Country
              </Text>
              <TouchableOpacity style={styles.relativeInput} onPress={() => console.log('Open Country Picker')}>
                <TextInput
                  style={[
                    styles.textInput,
                    countryError && styles.textInputError,
                    {
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)',
                      color: country ? themeColors.text : (colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'), // Placeholder color
                    },
                  ]}
                  placeholder="Select your country"
                  placeholderTextColor={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'}
                  value={country}
                  onChangeText={setCountry}
                  editable={false} // Make it non-editable to open picker on press
                />
                <MaterialIcons name="expand-more" size={24} color={'#94a3b8'} style={styles.inputIconRight} />
              </TouchableOpacity>
              {countryError && (
                <Text style={[styles.errorMessage, { color: Colors.error }]}>This field is mandatory</Text>
              )}
            </View>

            {/* Privacy Consent Note */}
            <View style={styles.privacyNoteContainer}>
              <Text style={[styles.privacyNoteText, { color: colorScheme === 'dark' ? '#94a3b8' : '#64748b' }]}>
                By continuing, you agree to our{' '}
                <Text style={[styles.linkText, { color: Colors.primary }]} onPress={() => console.log('Privacy Policy')}>
                  Privacy Policy
                </Text>{' '}
                and confirm that you are using this app for training purposes only.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer CTA */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.9)' : 'rgba(246, 248, 248, 0.9)',
              borderColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
            },
          ]}
        >
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={24} color={Colors.dark.background} />
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
    paddingTop: Platform.OS === 'android' ? 24 : 0, // Adjust for Android status bar
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
    backgroundColor: 'transparent', // Will be set by inline style
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
    width: 40, // To balance the back button
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
    maxWidth: 600, // max-w-lg
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
    marginTop: 4, // Adjust spacing for error message
  },
  dobHint: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 4,
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
    bottom: 128, // bottom-32
    right: 24, // right-6
    opacity: 0.1,
    // pointerEvents: 'none', // Not directly applicable in RN style, handled by parent touchability
  },
});

export default MandatoryDetailsScreen;
