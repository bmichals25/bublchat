import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import CharacterAvatar from './index';
import ProgressiveText from '../ProgressiveText';
import { getSelectedCharacter } from '../../utils/characterUtils';

interface LipSyncProps {
  text: string;
  sound: Audio.Sound;
  alignmentData: any;
  characterSize?: number;
  character?: string;
  textColor?: string;
  fontSize?: number;
  isDark?: boolean;
  onComplete?: () => void;
}

/**
 * LipSync component combines character avatar with synchronized text
 * It manages the display of both visual elements based on audio playback
 */
const LipSync: React.FC<LipSyncProps> = ({
  text,
  sound,
  alignmentData,
  characterSize = 200,
  character,
  textColor = '#000000',
  fontSize = 16,
  isDark = false,
  onComplete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>(character || 'default');
  
  // Load the selected character if none provided
  useEffect(() => {
    if (!character) {
      const loadSelectedCharacter = async () => {
        const saved = await getSelectedCharacter();
        setSelectedCharacter(saved);
      };
      
      loadSelectedCharacter();
    }
  }, [character]);
  
  // Monitor playback status to update playing state
  useEffect(() => {
    if (!sound) return;
    
    const updatePlaybackStatus = sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      
      if (status.isPlaying !== isPlaying) {
        setIsPlaying(status.isPlaying);
      }
      
      if (status.didJustFinish && onComplete) {
        onComplete();
      }
    });
    
    // Check initial playback status
    const checkInitialStatus = async () => {
      try {
        const initialStatus = await sound.getStatusAsync();
        if (initialStatus.isLoaded) {
          setIsPlaying(initialStatus.isPlaying);
        }
      } catch (error) {
        console.error('[LipSync] Error checking initial playback status:', error);
      }
    };
    
    checkInitialStatus();
    
    // Cleanup
    return () => {
      sound.setOnPlaybackStatusUpdate(null);
    };
  }, [sound, isPlaying, onComplete]);
  
  // Render nothing if no sound or alignment data
  if (!sound || !alignmentData) {
    console.log('[LipSync] Missing sound or alignment data');
    return null;
  }
  
  return (
    <View style={styles.container}>
      {/* Character with lip-sync */}
      <CharacterAvatar
        sound={sound}
        alignmentData={alignmentData}
        size={characterSize}
        character={selectedCharacter}
        style={styles.character}
      />
      
      {/* Text that appears progressively with speech */}
      <View style={styles.textContainer}>
        <ProgressiveText
          text={text}
          sound={sound}
          alignmentData={alignmentData}
          textColor={textColor}
          fontSize={fontSize}
          isDark={isDark}
          onComplete={onComplete}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  character: {
    marginBottom: 20,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 16,
    maxWidth: 600,
    alignSelf: 'center',
  }
});

export default LipSync; 