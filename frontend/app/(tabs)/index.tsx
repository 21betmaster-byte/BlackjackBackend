import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Built-in Icons
import axios from 'axios';

// --- CONFIGURATION ---
const API_URL = 'http://127.0.0.1:8000'; 

export default function App() {
  // --- NAVIGATION STATE ---
  // 'auth' -> 'region' -> 'dashboard' -> 'game'
  const [currentScreen, setCurrentScreen] = useState('auth'); 
  const [user, setUser] = useState(null); // This will still hold user_id from signup, or token from login for simplicity
  const [authToken, setAuthToken] = useState(null); // New state to explicitly hold the JWT token
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [gameMode, setGameMode] = useState(null); // 'play' or 'train'

  // LOGIN STATE
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // --- AUTH LOGIC ---
  const handleAuth = async () => {
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const response = await axios.post(`${API_URL}${endpoint}`, { email, password });

      if (isLogin) {
        if (response.data.access_token) {
          setAuthToken(response.data.access_token); // Store the actual JWT token
          // Set Authorization header for all future axios requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
          setUser(response.data.access_token); // For simplicity, keep user for navigation
          setCurrentScreen('region');
        } else {
          console.error("Login failed: No access token received.");
          // Optionally show an error message to the user
        }
      } else {
        if (response.data.status === 'success') {
          setUser(response.data.user_id);
          setCurrentScreen('region');
        } else {
          console.error("Signup failed: Unexpected response.", response.data);
          // Optionally show an error message to the user
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Authentication error:", error.response.data.detail || error.message);
        // Optionally show specific error message to the user based on error.response.data.detail
      } else {
        console.error("Network or unexpected error during authentication:", error);
      }
      // Removed local testing fallback. User must authenticate with the backend.
    }
  };

  // --- GAME STATS LOGIC ---
  const saveGameStats = async (result: 'win' | 'loss', mistakes: number) => {
    if (!authToken) {
      console.warn("Cannot save stats: User not authenticated.");
      return;
    }
    try {
      // The Authorization header is already set globally by axios.defaults.headers.common
      await axios.post(`${API_URL}/save_stats`, { result, mistakes });
      console.log("Game stats saved successfully!");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Failed to save game stats:", error.response.data.detail || error.message);
      } else {
        console.error("Network or unexpected error when saving stats:", error);
      }
    }
  };

  // --- NAVIGATION HANDLERS ---
  const selectRegion = (region) => {
    setSelectedRegion(region);
    setCurrentScreen('dashboard');
  };

  const launchGame = (mode) => {
    setGameMode(mode);
    setCurrentScreen('game');
  };

  const exitGame = async () => {
    // Save placeholder stats before exiting the game
    // In a real game, 'result' and 'mistakes' would come from game logic
    if (user && gameMode) { // Check if user is authenticated and game was played
      await saveGameStats(Math.random() > 0.5 ? 'win' : 'loss', Math.floor(Math.random() * 5));
    }
    setCurrentScreen('dashboard');
    setGameMode(null);
  };

  // --- SCREEN 1: AUTHENTICATION ---
  if (currentScreen === 'auth') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>CASINO MASTER</Text>
        <Text style={styles.subtitle}>Professional Training Suite</Text>
        
        <View style={styles.authBox}>
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor="#888" 
            value={email} onChangeText={setEmail} autoCapitalize="none" 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            placeholderTextColor="#888" 
            secureTextEntry value={password} onChangeText={setPassword} 
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleAuth}>
            <Text style={styles.btnText}>{isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.linkText}>{isLogin ? "New Player? Register" : "Have an account? Login"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- SCREEN 2: REGION SELECTION ---
  if (currentScreen === 'region') {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>SELECT REGION</Text>
        <Text style={styles.subtitle}>Rules vary by location</Text>
        
        <View style={styles.regionGrid}>
          {['Las Vegas', 'Macau', 'Monte Carlo', 'Atlantic City'].map((r) => (
            <TouchableOpacity key={r} style={styles.regionCard} onPress={() => selectRegion(r)}>
              <Ionicons name="map" size={32} color="#f1c40f" />
              <Text style={styles.regionText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // --- SCREEN 3: GAME DASHBOARD ---
  if (currentScreen === 'dashboard') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.dashHeader}>
          <Text style={styles.dashTitle}>{selectedRegion} Floor</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('region')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* BLACKJACK CARD */}
          <View style={styles.gameCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons name="flower-outline" size={30} color="black" />
              </View>
              <View>
                <Text style={styles.gameName}>BLACKJACK</Text>
                <Text style={styles.gameDesc}>Beat the dealer to 21 without busting.</Text>
              </View>
            </View>
            
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnTrain]} onPress={() => launchGame('train')}>
                <Ionicons name="school" size={18} color="#fff" style={{marginRight:5}} />
                <Text style={styles.btnTextSmall}>TRAIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnPlay]} onPress={() => launchGame('play')}>
                <Ionicons name="play-circle" size={18} color="#fff" style={{marginRight:5}} />
                <Text style={styles.btnTextSmall}>PLAY</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* COMING SOON CARD */}
          <View style={[styles.gameCard, {opacity: 0.6}]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons name="apps" size={30} color="black" />
              </View>
              <View>
                <Text style={styles.gameName}>ROULETTE</Text>
                <Text style={styles.gameDesc}>Coming Soon...</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- SCREEN 4: THE GAME (Placeholder) ---
  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameTopBar}>
        <TouchableOpacity onPress={exitGame} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.modeBadge}>
          {gameMode === 'train' ? '🎓 TRAINING MODE' : '🎰 RANKED PLAY'}
        </Text>
        <View style={{width: 24}} /> 
      </View>

      <View style={styles.tableCenter}>
        <Text style={styles.tableText}>
          {gameMode === 'train' 
            ? "Here you will see Strategy Charts\nand Real-time Probabilities." 
            : "Here you will play uninterrupted.\nScore shown at end."}
        </Text>
        
        {/* Placeholder Table Visual */}
        <View style={styles.mockTable}>
            <View style={styles.mockCard}><Text style={{fontSize:20}}>🂡</Text></View>
            <View style={styles.mockCard}><Text style={{fontSize:20}}>🂮</Text></View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', alignItems: 'center' },
  
  // Auth
  title: { fontSize: 32, fontWeight: 'bold', color: '#f1c40f', marginTop: 100, letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 50 },
  authBox: { width: '80%' },
  input: { backgroundColor: '#222', color: 'white', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  btnPrimary: { backgroundColor: '#f1c40f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { fontWeight: 'bold', color: '#000' },
  linkText: { color: '#888', marginTop: 20 },

  // Region
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 60 },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginTop: 40 },
  regionCard: { width: 140, height: 140, backgroundColor: '#222', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  regionText: { color: '#f1c40f', marginTop: 10, fontWeight: 'bold' },

  // Dashboard
  dashHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333' },
  dashTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20, width: '100%' },
  
  // Game Cards
  gameCard: { backgroundColor: '#222', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 50, height: 50, backgroundColor: '#f1c40f', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  gameName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  gameDesc: { color: '#888', fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  btnTrain: { backgroundColor: '#3498db' },
  btnPlay: { backgroundColor: '#27ae60' },
  btnTextSmall: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Game Screen
  gameContainer: { flex: 1, backgroundColor: '#276634' },
  gameTopBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 50 },
  modeBadge: { color: '#fff', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 4, overflow: 'hidden' },
  tableCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tableText: { color: 'white', textAlign: 'center', fontSize: 18, marginBottom: 30, opacity: 0.8 },
  mockTable: { flexDirection: 'row', gap: 10 },
  mockCard: { width: 60, height: 90, backgroundColor: 'white', borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
});