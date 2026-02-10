import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  useColorScheme,
  Animated,
  Easing,
  Platform,
  ImageBackground,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { router } from 'expo-router';

const CustomAppLoaderScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const darkTheme = colorScheme === 'dark';

  const [progress, setProgress] = useState(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;
  const shuffleValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Shuffle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shuffleValue, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shuffleValue, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress bar simulation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          router.replace('/home-dashboard');
          return 100;
        }
        return prev + 4;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [spinValue, pulseValue, shuffleValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const pulseOpacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const shuffleY = shuffleValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  
  const shuffleRotate = shuffleValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ImageBackground source={{uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoVE2ut7L6DuKJQceWkh1Z0xmek5vFk6zhUe7-iW5RNSok6ZyCCPEIYbKAnHBiZqPMEXDz5jLPDmRcMohKQ9bQ76xgY6h6NU17Br5dAt72WzOW311K8fOClXPPLbzWNDBR3_eCGxfudKSE43kvPVc9CaRapuiTAK0-oAZuKSIp40RKaL5D0h-ouVwWCnCGh46pT0wy5qaU2KgSjQOvoiWH6Snzdu94ZrMm_vxna0OUltJpNpG7iSDFo_pT_GUcPZ8o1Yca4dbAnbId'}} style={styles.backgroundImage}>
        {/* Glows */}
        <Animated.View style={[styles.glow, styles.glow1, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
        <View style={[styles.glow, styles.glow2]} />
        <View style={[styles.glow, styles.glow3]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logoIcon, {backgroundColor: 'rgba(17, 212, 196, 0.1)'}]}>
            <MaterialIcons name="casino" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.logoText}>BetMaster<Text style={{color: Colors.primary}}>21</Text></Text>
        </View>

        {/* Loader */}
        <View style={styles.loaderContainer}>
          <View style={styles.pokerChipContainer}>
            <Animated.View style={[styles.pokerChipOuterRing, { transform: [{ rotate: spin }] }]} />
            <View style={[styles.pokerChipInner, {backgroundColor: themeColors.background, borderColor: Colors.primary}]}>
              <View style={styles.chipPattern}>
                <View style={[styles.chipLine, {transform: [{rotate: '0deg'}]}]} />
                <View style={[styles.chipLine, {transform: [{rotate: '45deg'}]}]} />
                <View style={[styles.chipLine, {transform: [{rotate: '90deg'}]}]} />
                <View style={[styles.chipLine, {transform: [{rotate: '135deg'}]}]} />
              </View>
              <Animated.View style={{transform: [{translateY: shuffleY}, {rotate: shuffleRotate}]}}>
                <MaterialIcons name="style" size={60} color={Colors.primary} />
              </Animated.View>
            </View>
             <Animated.View style={[styles.floatingChip1, {transform: [{translateY: shuffleY}, {rotate: shuffleRotate}]}]}><MaterialIcons name="token" size={24} color={'rgba(17, 212, 196, 0.4)'} /></Animated.View>
             <Animated.View style={[styles.floatingChip2, {transform: [{translateY: shuffleY}, {rotate: shuffleRotate}]}]}><MaterialIcons name="token" size={32} color={'rgba(17, 212, 196, 0.4)'} /></Animated.View>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Preparing Your Deck</Text>
            <Text style={styles.statusSubtitle}>Calculating the optimal strategies for your next session...</Text>
          </View>
          <View style={styles.progressContainer}>
             <View style={styles.progressLabels}>
                <Text style={styles.progressLabelText}>Syncing</Text>
                <Text style={styles.progressPercentText}>{Math.min(100, Math.floor(progress))}%</Text>
             </View>
             <View style={[styles.progressBar, {backgroundColor: 'rgba(255,255,255,0.05)'}]}>
                <View style={[styles.progressBarFill, {width: `${Math.min(100, progress)}%`}]} />
             </View>
          </View>
        </View>

        {/* Tip Footer */}
        <View style={styles.footer}>
          <View style={[styles.tipContainer, {backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)'}]}>
            <MaterialIcons name="lightbulb" size={14} color={Colors.primary} />
            <Text style={styles.tipText}>Tip: Doubling down on 11 is statistically favorable.</Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backgroundImage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
    glow: { position: 'absolute', borderRadius: 9999 },
    glow1: { top: '50%', left: '50%', width: 500, height: 500, backgroundColor: 'rgba(17, 212, 196, 0.1)', transform: [{ translateX: -250 }, { translateY: -250 }] },
    glow2: { top: -96, right: -96, width: 256, height: 256, backgroundColor: 'rgba(17, 212, 196, 0.05)' },
    glow3: { bottom: -96, left: -96, width: 256, height: 256, backgroundColor: 'rgba(17, 212, 196, 0.05)' },
    header: { position: 'absolute', top: 0, width: '100%', padding: 32, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    logoIcon: { padding: 8, borderRadius: 8 },
    logoText: { color: 'white', fontSize: 24, fontWeight: 'bold', letterSpacing: -0.5, marginLeft: 8 },
    loaderContainer: { zIndex: 10, alignItems: 'center' },
    pokerChipContainer: { width: 192, height: 192, alignItems: 'center', justifyContent: 'center' },
    pokerChipOuterRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4, borderStyle: 'dashed', borderColor: 'rgba(17, 212, 196, 0.3)', borderRadius: 9999 },
    pokerChipInner: { width: 144, height: 144, borderWidth: 4, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: 'rgba(17, 212, 196, 0.3)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 15 },
    chipPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.2 },
    chipLine: { width: '100%', height: 8, backgroundColor: Colors.primary, position: 'absolute' },
    floatingChip1: { position: 'absolute', top: -16, right: -8 },
    floatingChip2: { position: 'absolute', bottom: -8, left: -16 },
    statusContainer: { marginTop: 48, textAlign: 'center', paddingHorizontal: 24, alignItems: 'center' },
    statusTitle: { color: 'white', fontSize: 20, fontWeight: '500', letterSpacing: 1, marginBottom: 8 },
    statusSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 240, lineHeight: 20, textAlign: 'center'},
    progressContainer: { marginTop: 32, width: 256 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
    progressLabelText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5 },
    progressPercentText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
    progressBar: { height: 6, borderRadius: 9999, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 9999, shadowColor: 'rgba(17, 212, 196, 0.5)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
    footer: { position: 'absolute', bottom: 48, width: '100%', paddingHorizontal: 40, alignItems: 'center' },
    tipContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
    tipText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1.5 },
});

export default CustomAppLoaderScreen;
