import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import CharacterAvatar from './CharacterAvatar';
import { speakText, stopSpeech } from '../utils/tts';
import Slider from '@react-native-community/slider';
import { getAvailableVoices } from '../utils/tts';

interface Voice {
  voice_id: string;
  name: string;
}

const DEFAULT_TEST_TEXT = "Hello! I'm testing my lip sync functionality. Does it look realistic? The quick brown fox jumps over the lazy dog.";

const LipSyncTester: React.FC = () => {
  const [text, setText] = useState(DEFAULT_TEST_TEXT);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [alignmentData, setAlignmentData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('EXAVITQu4vr4xnSDxMaL'); // Default (Rachel)
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  
  useEffect(() => {
    // Load available voices
    const loadVoices = async () => {
      try {
        const availableVoices = await getAvailableVoices();
        setVoices(availableVoices);
        console.log('[LipSyncTester] Loaded voices:', availableVoices.length);
      } catch (error) {
        console.error('[LipSyncTester] Failed to load voices:', error);
      }
    };
    
    loadVoices();
    
    // Clean up when component unmounts
    return () => {
      handleStop();
    };
  }, []);
  
  const handlePlay = async () => {
    if (isPlaying) {
      await handleStop();
    }
    
    setIsLoading(true);
    
    try {
      // Stop any previously playing audio
      await stopSpeech();
      
      // Get audio and alignment data from the TTS service
      const { sound: newSound, alignmentData: newAlignmentData } = await speakText({
        text,
        voice: selectedVoice,
        stability,
        similarity_boost: similarityBoost,
        detailed_metadata: true
      });
      
      // Store the sound and alignment data
      setSound(newSound);
      setAlignmentData(newAlignmentData);
      setIsPlaying(true);
      
      console.log('[LipSyncTester] Received alignment data with', 
                  newAlignmentData?.phonemes?.length || 0, 'phonemes');
      
      // When the sound finishes playing
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status && 'didJustFinish' in status && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('[LipSyncTester] Error playing TTS:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStop = async () => {
    try {
      await stopSpeech();
      setIsPlaying(false);
      setSound(null);
    } catch (error) {
      console.error('[LipSyncTester] Error stopping playback:', error);
    }
  };
  
  const renderVoiceSelector = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Selection</Text>
        <ScrollView horizontal style={styles.voiceSelector}>
          {voices.map(voice => (
            <Button
              key={voice.voice_id}
              title={voice.name}
              onPress={() => setSelectedVoice(voice.voice_id)}
              color={selectedVoice === voice.voice_id ? '#2196F3' : '#757575'}
            />
          ))}
        </ScrollView>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lip Sync Tester</Text>
      
      <View style={styles.characterContainer}>
        <CharacterAvatar
          sound={sound}
          alignmentData={alignmentData}
          size={200}
          blinkingEnabled={true}
        />
      </View>
      
      <View style={styles.controls}>
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Enter text to speak..."
          />
        </View>
        
        {renderVoiceSelector()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Settings</Text>
          <Text>Stability: {stability.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            value={stability}
            onValueChange={setStability}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
          />
          
          <Text>Similarity Boost: {similarityBoost.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            value={similarityBoost}
            onValueChange={setSimilarityBoost}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title={isPlaying ? "Stop" : "Play"}
            onPress={isPlaying ? handleStop : handlePlay}
            disabled={isLoading}
            color={isPlaying ? "#F44336" : "#4CAF50"}
          />
        </View>
        
        {isLoading && (
          <Text style={styles.loadingText}>Generating speech...</Text>
        )}
        
        {alignmentData && alignmentData.phonemes && (
          <Text style={styles.infoText}>
            Phonemes loaded: {alignmentData.phonemes.length}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    height: 220,
  },
  controls: {
    flex: 1,
  },
  textInputContainer: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  voiceSelector: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default LipSyncTester; 