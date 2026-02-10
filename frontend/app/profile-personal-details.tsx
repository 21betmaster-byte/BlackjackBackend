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
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';

const ProfilePersonalDetailsScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const darkTheme = colorScheme === 'dark';

  const [fullName, setFullName] = useState('Alexander Sterling');
  const [displayName, setDisplayName] = useState('AlexMaster21');
  const [dob, setDob] = useState('1992-05-14');
  const [country, setCountry] = useState('US');

  const handleBack = () => router.back();
  const handleSave = () => console.log('Save');

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: darkTheme ? themeColors.background : '#f6f8f8' }]}>
      <View style={[styles.container, { backgroundColor: darkTheme ? themeColors.background : '#f6f8f8' }]}>
        {/* Top App Bar */}
        <View style={[styles.header, { backgroundColor: darkTheme ? 'rgba(16, 34, 32, 0.8)' : 'rgba(246, 248, 248, 0.8)', borderColor: darkTheme ? themeColors.border : '#e2e8f0' }]}>
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: darkTheme ? 'transparent' : 'transparent' }]} onPress={handleBack}>
            <MaterialIcons name="arrow-back-ios-new" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Personal Details</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.headerSaveButton, { color: Colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          {/* Profile Photo Section */}
          <View style={styles.profilePhotoSection}>
            <View style={styles.profilePhotoContainer}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBr1-FhCKw9ihNyEefZlFeSoaoS4ARfqWEsiQFAKlCnK3eSqyk9awZxZt0KKLVyG02MD-1-k4GjjX-b9esaKa3xcJ_K_kLSTOuPWj9IIesL6uXEYvz-7ehr5rzQHBBlnIO0V9kva35CEerK2AM14PVe1Z94fwAnMOCOfULpVn6z-DUAKZ9JElIqWCISgiu7jyfpKsmk-FW_Vvj9MGau3439zaO6qg8B9WlivVAutEb4SzvBF4W-wuuFUj4bSalfzx8Rv-biK4cCXqFL' }}
                style={styles.profilePhotoImage}
              />
              <TouchableOpacity style={[styles.cameraButton, { backgroundColor: Colors.primary, borderColor: darkTheme ? themeColors.background : '#f6f8f8' }]}>
                <MaterialIcons name="photo-camera" size={16} color={Colors.dark.background} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.changePictureText, { color: Colors.primary }]}>Change Profile Picture</Text>
          </View>

          {/* Details Form */}
          <View style={styles.formContainer}>
            <FormSection title="Identity">
              <FormField label="Full Name" value={fullName} onChangeText={setFullName} icon="edit" />
              <FormField label="Display Name" value={displayName} onChangeText={setDisplayName} icon="person" isLast />
            </FormSection>

            <FormSection title="Verification Details">
              <FormField label="Date of Birth" value={dob} onChangeText={setDob} icon="calendar-month" type="date" />
              <FormField label="Country of Residence" value={country} onChangeText={setCountry} icon="public" isLast isPicker />
            </FormSection>

            <FormSection title="Account Security">
              <View style={[styles.formFieldContainer, { backgroundColor: darkTheme ? themeColors.card : 'white', borderRadius: 12, borderBottomWidth: 0, paddingHorizontal: 16, paddingVertical: 12, ...styles.formFieldRow }]}>
                <View style={[styles.securityIconContainer, {backgroundColor: 'rgba(17, 212, 196, 0.1)'}]}>
                  <MaterialIcons name="verified-user" size={24} color={Colors.primary} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.securityTitle, {color: themeColors.text}]}>Premium Verification</Text>
                  <Text style={[styles.securitySubtitle, {color: darkTheme ? '#94a3b8' : '#64748b'}]}>Account status is currently active</Text>
                </View>
                <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
              </View>
            </FormSection>
          </View>
        </ScrollView>
      </View>
      <ProfileBottomNav />
    </SafeAreaView>
  );
};

const FormSection = ({ title, children }) => {
    const darkTheme = useColorScheme() === 'dark';
    return(
        <View style={styles.formSection}>
            <Text style={[styles.formSectionTitle, { color: Colors.primary }]}>{title}</Text>
            <View style={[styles.formSectionContent, {backgroundColor: darkTheme ? Colors.dark.card : 'white', borderColor: darkTheme ? Colors.dark.border : '#e2e8f0', divideColor: darkTheme ? Colors.dark.border : '#e2e8f0'}]}>{children}</View>
        </View>
    )
}

const FormField = ({ label, value, onChangeText, icon, isLast = false, type = 'text', isPicker = false }) => {
    const darkTheme = useColorScheme() === 'dark';
    const themeColors = Colors[darkTheme ? 'dark' : 'light'];
    return (
        <View style={[styles.formFieldContainer, {borderBottomWidth: isLast ? 0 : 1, borderColor: darkTheme ? themeColors.border : '#e2e8f0'}]}>
            <Text style={[styles.formFieldLabel, { color: darkTheme ? '#94a3b8' : '#64748b' }]}>{label}</Text>
            <View style={styles.formFieldRow}>
                {isPicker ? (
                    <TouchableOpacity style={styles.flex1} onPress={() => console.log('Open Picker for', label)}>
                        <Text style={[styles.formFieldValue, { color: themeColors.text }]}>{value}</Text>
                    </TouchableOpacity>
                ) : (
                    <TextInput
                        style={[styles.formFieldValue, { color: themeColors.text }]}
                        value={value}
                        onChangeText={onChangeText}
                        keyboardType={type === 'date' ? 'numbers-and-punctuation' : 'default'}
                    />
                )}
                <MaterialIcons name={icon} size={20} color={'#94a3b8'} />
            </View>
        </View>
    )
}

const ProfileBottomNav = () => {
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    return(
        <View style={[styles.bottomNav, { backgroundColor: colorScheme === 'dark' ? 'rgba(16, 34, 32, 0.95)' : 'rgba(255, 255, 255, 0.9)', borderColor: colorScheme === 'dark' ? Colors.dark.border : '#e2e8f0' }]}>
            <TouchableOpacity style={styles.navButton} onPress={() => router.push('/home-dashboard')}><MaterialIcons name="home" size={24} color={'#94a3b8'} /><Text style={[styles.navText, { color: '#94a3b8' }]}>Home</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navButton}><MaterialIcons name="bar-chart" size={24} color={'#94a3b8'} /><Text style={[styles.navText, { color: '#94a3b8' }]}>Stats</Text></TouchableOpacity>
            <View style={{alignItems: 'center'}}>
                <TouchableOpacity style={[styles.centerNavButton, { backgroundColor: Colors.primary, borderColor: colorScheme === 'dark' ? themeColors.background : '#fff' }]}><MaterialIcons name="play-arrow" size={32} color={Colors.dark.background} /></TouchableOpacity>
                <Text style={[styles.navText, {position: 'absolute', bottom: -18, color: Colors.primary, fontWeight: 'bold'}]}>START SESSION</Text>
            </View>
            <TouchableOpacity style={styles.navButton}><MaterialIcons name="school" size={24} color={'#94a3b8'} /><Text style={[styles.navText, { color: '#94a3b8' }]}>Train</Text></TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => router.push('/profile-settings-invite')}><MaterialIcons name="account-circle" size={24} color={Colors.primary} /><Text style={[styles.navText, { color: Colors.primary }]}>Profile</Text></TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 36 : 12, paddingBottom: 12, borderBottomWidth: 1, zIndex: 50 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.2 },
  headerSaveButton: { fontSize: 16, fontWeight: 'bold', paddingHorizontal: 8 },
  scrollViewContent: { padding: 16, paddingBottom: 48 },
  profilePhotoSection: { alignItems: 'center', marginBottom: 32 },
  profilePhotoContainer: { position: 'relative' },
  profilePhotoImage: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: 'rgba(17, 212, 196, 0.3)', padding: 4, backgroundColor: 'lightgrey' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  changePictureText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  formContainer: { gap: 24 },
  formSection: { gap: 6 },
  formSectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 4 },
  formSectionContent: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  formFieldContainer: { padding: 16 },
  formFieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  formFieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formFieldValue: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, fontSize: 16, fontWeight: '600', flex: 1 },
  securityIconContainer: {width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  securityTitle: {fontSize: 14, fontWeight: 'bold'},
  securitySubtitle: {fontSize: 12},
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, zIndex: 50 },
  navButton: { alignItems: 'center', gap: 4, flex: 1 },
  navText: { fontSize: 10, fontWeight: '500'},
  centerNavButton: { position: 'relative', top: -24, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8},
});

export default ProfilePersonalDetailsScreen;
