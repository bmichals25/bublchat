import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, LogBox, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { ChatProvider, useChat } from './src/context/ChatContext';
import { ThemeProvider } from './src/context/ThemeContext';
import ChatScreen from './src/screens/ChatScreen';
import LipSyncTester from './src/screens/LipSyncTester';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Define the stack navigator
const Stack = createNativeStackNavigator();

// Loading screen component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#54C6EB" />
  </View>
);

// Main app component with initialization
const MainApp = () => {
  const { isInitialLoading } = useChat();
  
  if (isInitialLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="LipSyncTester" component={LipSyncTester} />
    </Stack.Navigator>
  );
};

export default function App() {
  // Add initialization state for AsyncStorage loading
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Ensure AsyncStorage is accessible before initializing the app
    const initializeStorage = async () => {
      try {
        await AsyncStorage.getItem('app-initialized');
        // Store an initialization marker to confirm AsyncStorage works
        await AsyncStorage.setItem('app-initialized', 'true');
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize AsyncStorage:', error);
        // Still set initialized to true to avoid endless loading
        setInitialized(true);
      }
    };
    
    initializeStorage();
  }, []);
  
  if (!initialized) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <LoadingScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PaperProvider>
        <ThemeProvider>
          <ChatProvider>
            <NavigationContainer>
              <MainApp />
            </NavigationContainer>
          </ChatProvider>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
