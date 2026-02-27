/**
 * App.js - Point d'entrée React Native (Expo)
 */
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ActivityIndicator } from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import TemperatureScanScreen from './src/screens/TemperatureScanScreen';
import HeartRateScreen from './src/screens/HeartRateScreen';
// import LoginScreen from './src/screens/LoginScreen';
// import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 40 }}>💗</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 12, color: '#7c3aed' }}>
        BioMetrics
      </Text>
      <ActivityIndicator style={{ marginTop: 20 }} color="#7c3aed" />
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('biometrics_token');
      setIsLoggedIn(!!token);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#7c3aed' },
          headerTintColor: 'white',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {/* Pour l'instant on va directement au Home en mode dev */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Temperature"
          component={TemperatureScanScreen}
          options={{ title: '🌡️ Température', headerShown: false }}
        />
        <Stack.Screen
          name="HeartRate"
          component={HeartRateScreen}
          options={{ title: '❤️ Fréquence Cardiaque', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
