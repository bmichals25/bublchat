import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { ChatProvider } from './src/context/ChatContext';
import { ThemeProvider } from './src/context/ThemeContext';
import ChatScreen from './src/screens/ChatScreen';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Define the stack navigator
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PaperProvider>
        <ThemeProvider>
          <ChatProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Chat" component={ChatScreen} />
              </Stack.Navigator>
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
