import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import HeartRateScreen from './screens/HeartRateScreen';
import TemperatureScanScreen from './screens/TemperatureScanScreen';
import RespirationScreen from './screens/RespirationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="HeartRate" component={HeartRateScreen} />
          <Stack.Screen name="Temperature" component={TemperatureScanScreen} />
          <Stack.Screen name="Respiration" component={RespirationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
