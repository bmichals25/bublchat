import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CharacterAvatar from './CharacterAvatar';
import { getSelectedCharacter } from '../utils/characterUtils';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { Audio } from 'expo-av';

interface CharacterDisplayProps {
  size?: number;
  isCollapsed?: boolean;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({
  size = 150,
  isCollapsed = false
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState<string>('default');
  const [characterEnabled, setCharacterEnabled] = useState<boolean>(true);
  const [testMode, setTestMode] = useState<boolean>(true); // Default to test mode ON
  const [dummySound, setDummySound] = useState<Audio.Sound | null>(null);
  const { isTTSEnabled } = useChat();
  const { isDark, darkTheme } = useTheme();
  
  // For testing - create custom alignment data with a single viseme
  const testAlignmentData = {
    phonemes: [
      {
        phoneme: "AA",
        start_time: 0,
        duration: 2,
        end_time: 2
      }
    ]
  };
  
  // Create a dummy sound object for testing
  useEffect(() => {
    if (testMode) {
      const createDummySound = async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: 'https://example.com/dummy.mp3' }, // This won't actually load
            { shouldPlay: false }
          );
          setDummySound(sound);
          
          // Override getStatusAsync to return fake "playing" status
          sound.getStatusAsync = async () => {
            return {
              isLoaded: true,
              isPlaying: true,
              positionMillis: 500, // Fixed position to keep the mouth shape constant
              durationMillis: 2000,
              rate: 1,
              shouldPlay: true,
              // Add missing properties required by AVPlaybackStatusSuccess
              uri: 'https://example.com/dummy.mp3',
              progressUpdateIntervalMillis: 100,
              isBuffering: false,
              shouldCorrectPitch: false,
              volume: 1.0,
              isMuted: false,
              isLooping: false,
              didJustFinish: false,
              androidImplementation: 'MediaPlayer',
              audioPan: 0,
              playableDurationMillis: 2000
            } as any;
          };
        } catch (error) {
          console.error('Error creating dummy sound:', error);
        }
      };
      
      createDummySound();
      
      return () => {
        if (dummySound) {
          dummySound.unloadAsync();
        }
      };
    } else if (dummySound) {
      dummySound.unloadAsync();
      setDummySound(null);
    }
  }, [testMode]);
  
  // Load character settings on component mount
  useEffect(() => {
    const loadCharacterSettings = async () => {
      try {
        // Load character selection
        const character = await getSelectedCharacter();
        setSelectedCharacter(character);
        
        // Load character enabled setting
        const enabled = await AsyncStorage.getItem('characterEnabled');
        setCharacterEnabled(enabled !== 'false'); // Default to true if not set
      } catch (error) {
        console.error('Error loading character settings:', error);
      }
    };
    
    loadCharacterSettings();
  }, []);
  
  // Toggle test mode
  const toggleTestMode = () => {
    setTestMode(!testMode);
  };
  
  // Save character enabled setting
  const toggleCharacterEnabled = async () => {
    const newValue = !characterEnabled;
    setCharacterEnabled(newValue);
    try {
      await AsyncStorage.setItem('characterEnabled', String(newValue));
    } catch (error) {
      console.error('Error saving character settings:', error);
    }
  };
  
  // If character is disabled, show just the toggle button
  if (!characterEnabled) {
    return (
      <View style={[
        styles.container,
        { height: isCollapsed ? 60 : 'auto' }
      ]}>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            isDark && { backgroundColor: darkTheme.surfaceElevated }
          ]} 
          onPress={toggleCharacterEnabled}
        >
          <IconButton
            icon="emoticon-outline"
            size={24}
            iconColor={isDark ? darkTheme.primary : "#54C6EB"}
          />
          {!isCollapsed && (
            <Text style={[
              styles.toggleButtonText,
              isDark && { color: darkTheme.text }
            ]}>
              Show Character
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
  
  // Otherwise show the character
  return (
    <View style={[
      styles.container,
      { height: isCollapsed ? 60 : 'auto' }
    ]}>
      {!isCollapsed && (
        <>
          <View style={styles.avatarContainer}>
            <CharacterAvatar
              character={selectedCharacter}
              size={size}
              blinkingEnabled={true}
              alignmentData={testMode ? testAlignmentData : undefined}
              sound={testMode ? dummySound : undefined}
              style={styles.avatar}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.toggleButton,
              isDark && { backgroundColor: darkTheme.surfaceElevated }
            ]} 
            onPress={toggleTestMode}
          >
            <IconButton
              icon={testMode ? "face" : "face-outline"}
              size={24}
              iconColor={isDark ? darkTheme.primary : "#54C6EB"}
            />
            <Text style={[
              styles.toggleButtonText,
              isDark && { color: darkTheme.text }
            ]}>
              {testMode ? "Testing Viseme" : "Normal Mode"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      
      {isCollapsed && (
        <TouchableOpacity 
          style={[
            styles.collapsedButton,
            isDark && { backgroundColor: darkTheme.surfaceElevated }
          ]} 
          onPress={toggleCharacterEnabled}
        >
          <IconButton
            icon="emoticon"
            size={24}
            iconColor={isDark ? darkTheme.primary : "#54C6EB"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    overflow: 'visible',
  },
  avatarContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'visible',
  },
  avatar: {
    borderRadius: 0,
    overflow: 'visible',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(84, 198, 235, 0.1)',
    borderRadius: 20,
    padding: 5,
    paddingRight: 16,
    marginTop: 10,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  collapsedButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(84, 198, 235, 0.1)',
    borderRadius: 20,
    padding: 0,
    width: 40,
    height: 40,
  },
});

export default CharacterDisplay; 