import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import CharacterAvatar from '../components/CharacterAvatar';
import { 
  getAvailableVoices, 
  getElevenLabsApiKeyWithCache, 
  clearCachedApiKey 
} from '../utils/tts';
import { mapPhonemeToViseme } from '../utils/VisemeMapper';

// Define our own VoiceInfo interface since it's not exported from tts.ts
interface VoiceInfo {
  voice_id: string;
  name: string;
  // Add any other properties you need
}

// Define speech generation function since it's not exported from tts.ts
const generateSpeech = async (
  text: string,
  voiceId: string,
  stability: number = 0.5,
  similarityBoost: number = 0.75
): Promise<{
  audioUri: string | null;
  metadata: any | null;
}> => {
  const apiKey = await AsyncStorage.getItem('elevenLabsApiKey');
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not found');
  }
  
  try {
    // First try the with-timestamps endpoint
    const timestampsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`;
    
    const timestampsResponse = await fetch(timestampsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
          style: 0,
          use_speaker_boost: true
        }
      })
    });
    
    if (timestampsResponse.ok) {
      console.log('[TTS] Successfully received response from with-timestamps endpoint');
      const responseData = await timestampsResponse.json();
      
      // Extract audio data and alignment data
      const audioBase64 = responseData.audio_base64;
      const alignmentData = responseData.alignment || null;
      
      return {
        audioUri: `data:audio/mpeg;base64,${audioBase64}`,
        metadata: alignmentData
      };
    }
    
    // Fallback to standard endpoint
    console.log('[TTS] Falling back to standard endpoint');
    const standardUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(standardUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: stability,
          similarity_boost: similarityBoost,
          style: 0,
          use_speaker_boost: true
        }
      })
    });
    
    if (response.ok) {
      // Get audio data as arraybuffer
      const audioData = await response.arrayBuffer();
      
      // Convert arraybuffer to base64
      const audioBase64 = btoa(
        new Uint8Array(audioData)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Create estimated alignment data
      const estimatedDuration = text.length * 0.05; // Rough estimate of 50ms per character
      const estimatedAlignmentData = {
        words: text.split(' ').map((word, index, arr) => {
          const start = (index / arr.length) * estimatedDuration;
          const duration = (word.length / text.length) * estimatedDuration * 2;
          return {
            word: word + (index < arr.length - 1 ? ' ' : ''),
            start,
            duration
          };
        })
      };
      
      return {
        audioUri: `data:audio/mpeg;base64,${audioBase64}`,
        metadata: estimatedAlignmentData
      };
    } else {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText || response.statusText}`);
    }
  } catch (error) {
    console.error('[TTS] Error generating speech:', error);
    throw error;
  }
};

const LipSyncTester = () => {
  const [text, setText] = useState('Hello world! I am a virtual avatar with synchronized lip movements.');
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voiceName, setVoiceName] = useState<string>('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [alignmentData, setAlignmentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const { isDark, darkTheme } = useTheme();
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawMetadata, setRawMetadata] = useState<any>(null);
  const [mappedVisemes, setMappedVisemes] = useState<Array<{phoneme: string, viseme: string}>>([]);
  
  // Load available voices on component mount
  useEffect(() => {
    const loadVoices = async () => {
      if (await checkApiKey()) {
        setLoading(true);
        try {
          const fetchedVoices = await getAvailableVoices();
          if (fetchedVoices && fetchedVoices.length > 0) {
            setVoices(fetchedVoices);
            setSelectedVoice(fetchedVoices[0]?.voice_id || '');
          } else {
            setError('No voices available. Please check your ElevenLabs API key.');
          }
        } catch (error) {
          console.error('Error loading voices:', error);
          setError('Error loading voices: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setLoading(false);
        }
      }
    };

    loadVoices();
    
    // Clear cached API key when component unmounts
    return () => {
      clearCachedApiKey();
    };
  }, []);
  
  // Handle playing and stopping audio
  const handlePlayPress = async () => {
    if (!selectedVoice) {
      Alert.alert('Error', 'Please select a voice first');
      return;
    }

    setIsPlaying(true);
    setError(null);
    setRawMetadata(null); // Reset metadata display

    try {
      // Check if there's existing speech playing and stop it
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }

      // Generate speech with the selected voice
      const result = await generateSpeech(text, selectedVoice, stability, similarityBoost);
      console.log('Speech generation complete');

      // Store the complete raw metadata for inspection
      if (result.metadata) {
        console.log('COMPLETE RAW METADATA:', JSON.stringify(result.metadata));
        setRawMetadata(result.metadata);

        // Track viseme mapping from the phonemes for debugging
        const newMappedVisemes: Array<{phoneme: string, viseme: string}> = [];
        
        // Map from phonemes if available
        if (result.metadata.alignment && result.metadata.alignment.phonemes) {
          result.metadata.alignment.phonemes.forEach((phoneme: any) => {
            newMappedVisemes.push({
              phoneme: phoneme.phoneme,
              viseme: mapPhonemeToViseme(phoneme.phoneme)
            });
          });
        } 
        // Extract from words if no detailed phonemes
        else if (result.metadata.word_alignments) {
          // Extract phonemes from common characters in words
          result.metadata.word_alignments.forEach((word: any) => {
            const { word: text } = word;
            if (!text) return;
            
            const vowels = ['a', 'e', 'i', 'o', 'u'];
            const specialConsonants = ['th', 'sh', 'ch', 'wh', 'ph'];
            
            // Check for special consonants
            for (const consonant of specialConsonants) {
              if (text.toLowerCase().includes(consonant)) {
                newMappedVisemes.push({
                  phoneme: consonant,
                  viseme: mapPhonemeToViseme(consonant)
                });
              }
            }
            
            // Check for vowels
            for (const char of text.toLowerCase()) {
              if (vowels.includes(char)) {
                newMappedVisemes.push({
                  phoneme: char,
                  viseme: mapPhonemeToViseme(char)
                });
              }
            }
          });
        }
        
        // Update state with mapped visemes
        setMappedVisemes(newMappedVisemes);
        console.log(`[LipSyncTester] Mapped ${newMappedVisemes.length} phonemes to visemes`);
      } else {
        // Clear mappings if no metadata
        setMappedVisemes([]);
      }

      if (result.audioUri) {
        // Create a sound object from the audio
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: result.audioUri },
          { shouldPlay: true }
        );
        
        // Save the sound to state
        setSound(newSound);
        
        // Set up status monitoring for the sound
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });

        // Process alignment data for lip-sync
        if (result.metadata) {
          console.log('[LipSyncTester] Setting alignment data directly from metadata');
          
          // Check if we have character-level metadata (preferred for lip-sync)
          if (result.metadata.characters && 
              (result.metadata.character_start_times_seconds || result.metadata.character_end_times_seconds)) {
            console.log('[LipSyncTester] Using character-level metadata for lip-sync');
            // Use character data directly - this is what works with the small avatar
            setAlignmentData(result.metadata);
          }
          // If we have phoneme data
          else if (result.metadata.alignment && result.metadata.alignment.phonemes) {
            console.log('[LipSyncTester] Using phoneme data for lip-sync');
            setAlignmentData(result.metadata.alignment);
          }
          // If we have word alignments
          else if (result.metadata.word_alignments) {
            console.log('[LipSyncTester] Using word alignment data for lip-sync');
            setAlignmentData(result.metadata);
          }
          // If we don't have any of these formats, create synthetic phonemes
          else {
            console.log('[LipSyncTester] No valid alignment data received, creating synthetic phonemes');
            
            // Duration in seconds of the audio (estimate if not available)
            const audioDuration = (result as any).audioDuration || (text.length * 0.075); // ~75ms per character estimate
            
            // Generate synthetic phonemes based on the text
            const syntheticPhonemes = generateSyntheticPhonemes(text, audioDuration);
            
            setAlignmentData({
              phonemes: syntheticPhonemes
            });
            
            console.log(`[LipSyncTester] Created ${syntheticPhonemes.length} synthetic phonemes`);
          }
        } else {
          setAlignmentData(null);
        }
        
      } else {
        setError('Failed to generate speech');
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsPlaying(false);
    }
  };
  
  // Select a voice
  const handleVoiceSelect = (voiceId: string, name: string) => {
    setSelectedVoice(voiceId);
    setVoiceName(name);
    
    // Save selection to AsyncStorage
    AsyncStorage.setItem('selectedVoiceId', voiceId);
    AsyncStorage.setItem('selectedVoiceName', name);
  };
  
  const checkApiKey = async () => {
    try {
      const apiKey = await getElevenLabsApiKeyWithCache(true); // Force refresh to get the latest
      if (!apiKey) {
        setError('No ElevenLabs API key found. Please add your API key in Settings.');
        return false;
      }
      
      // If we get this far, we have an API key
      return true;
    } catch (error) {
      console.error('Error checking API key:', error);
      setError('Error checking API key: ' + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };
  
  // Add a function to generate synthetic phonemes when API doesn't provide them
  const generateSyntheticPhonemes = (text: string, duration: number): Array<{phoneme: string, start_time: number, end_time: number}> => {
    const phonemes: Array<{phoneme: string, start_time: number, end_time: number}> = [];
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const timePerWord = duration / words.length;
    
    // Common vowel sounds that map to distinct visemes
    const vowelSounds = ['a', 'e', 'i', 'o', 'u'];
    // Consonant sounds that map to distinct visemes
    const consonantGroups = {
      'b': ['b', 'p', 'm'],
      'f': ['f', 'v'],
      'th': ['th'],
      'w': ['w', 'wh', 'r'],
      'd': ['d', 't', 'n', 's', 'z'],
      'g': ['g', 'k'],
      'sh': ['sh', 'ch', 'j']
    };
    
    let currentTime = 0;
    
    words.forEach(word => {
      if (!word) return;
      
      // Allocate time per character
      const wordLength = word.length;
      const timePerChar = (timePerWord * 0.8) / wordLength; // 80% of word time for phonemes, 20% for pauses
      const wordStartTime = currentTime;
      
      // First pass: identify vowels
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (vowelSounds.includes(char)) {
          phonemes.push({
            phoneme: char,
            start_time: wordStartTime + (i * timePerChar),
            end_time: wordStartTime + ((i + 1) * timePerChar)
          });
        }
      }
      
      // Second pass: identify consonant groups
      for (const [key, consonants] of Object.entries(consonantGroups)) {
        for (const consonant of consonants) {
          if (word.includes(consonant)) {
            const index = word.indexOf(consonant);
            phonemes.push({
              phoneme: key,
              start_time: wordStartTime + (index * timePerChar),
              end_time: wordStartTime + ((index + consonant.length) * timePerChar)
            });
          }
        }
      }
      
      // Move to the next word (leaving a small gap)
      currentTime += timePerWord;
    });
    
    // Sort phonemes by start time
    phonemes.sort((a, b) => a.start_time - b.start_time);
    
    // Ensure we have at least a few phonemes by adding default ones if needed
    if (phonemes.length < 5) {
      const minPhonemes = ['a', 'e', 'i', 'o', 'u'];
      const phonemeTime = duration / minPhonemes.length;
      
      return minPhonemes.map((p, i) => ({
        phoneme: p,
        start_time: i * phonemeTime,
        end_time: (i + 0.8) * phonemeTime // 80% of the time slot to leave gaps
      }));
    }
    
    return phonemes;
  };
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? darkTheme.background : '#f8f9fa' }
    ]}>
      {/* Header with back button */}
      <View style={[
        styles.header,
        { backgroundColor: isDark ? darkTheme.surfaceElevated : '#ffffff' }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDark ? darkTheme.text : '#333'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.headerTitle,
          { color: isDark ? darkTheme.text : '#333' }
        ]}>Lip-Sync Tester</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Character preview */}
        <View style={[
          styles.characterContainer,
          { backgroundColor: isDark ? darkTheme.surfaceElevated : '#ffffff' }
        ]}>
          <CharacterAvatar 
            character="default"
            size={200} 
            sound={sound}
            alignmentData={alignmentData}
            blinkingEnabled={true}
          />
        </View>
        
        {/* Text input section */}
        <View style={[
          styles.section,
          { backgroundColor: isDark ? darkTheme.surfaceElevated : '#ffffff' }
        ]}>
          <Text style={[
            styles.sectionTitle,
            { color: isDark ? darkTheme.text : '#333' }
          ]}>Test Speech</Text>
          <TextInput
            style={[
              styles.textInput,
              { 
                color: isDark ? darkTheme.text : '#333',
                backgroundColor: isDark ? darkTheme.inputBackground : '#f1f5f9'
              }
            ]}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            placeholder="Enter text for the character to speak..."
            placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
          />
          
          {/* Voice selection */}
          <Text style={[
            styles.label,
            { color: isDark ? darkTheme.text : '#333' }
          ]}>Selected Voice: {voiceName || 'None'}</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.voiceList}
          >
            {voices.map((voice) => (
              <TouchableOpacity
                key={voice.voice_id}
                style={[
                  styles.voiceButton,
                  selectedVoice === voice.voice_id && styles.selectedVoiceButton,
                  { 
                    backgroundColor: isDark 
                      ? (selectedVoice === voice.voice_id ? darkTheme.primary : darkTheme.inputBackground) 
                      : (selectedVoice === voice.voice_id ? '#54C6EB' : '#f1f5f9')
                  }
                ]}
                onPress={() => handleVoiceSelect(voice.voice_id, voice.name)}
              >
                <Text style={[
                  styles.voiceButtonText,
                  selectedVoice === voice.voice_id && styles.selectedVoiceButtonText,
                  { 
                    color: isDark
                      ? (selectedVoice === voice.voice_id ? '#ffffff' : darkTheme.text)
                      : (selectedVoice === voice.voice_id ? '#ffffff' : '#333')
                  }
                ]}>
                  {voice.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Voice settings */}
          <View style={styles.sliderContainer}>
            <Text style={[
              styles.label,
              { color: isDark ? darkTheme.text : '#333' }
            ]}>Stability: {stability.toFixed(2)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={stability}
              onValueChange={setStability}
              minimumTrackTintColor="#54C6EB"
              maximumTrackTintColor={isDark ? '#4B5563' : '#D1D5DB'}
            />
          </View>
          
          <View style={styles.sliderContainer}>
            <Text style={[
              styles.label,
              { color: isDark ? darkTheme.text : '#333' }
            ]}>Similarity Boost: {similarityBoost.toFixed(2)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={similarityBoost}
              onValueChange={setSimilarityBoost}
              minimumTrackTintColor="#54C6EB"
              maximumTrackTintColor={isDark ? '#4B5563' : '#D1D5DB'}
            />
          </View>
          
          {/* Playback controls */}
          <TouchableOpacity
            style={[
              styles.playButton,
              { backgroundColor: isDark ? darkTheme.primary : '#54C6EB' }
            ]}
            onPress={handlePlayPress}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isPlaying ? 'stop' : 'play'}
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.playButtonText}>
                  {isPlaying ? 'Stop' : 'Play Speech'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Debug Panel */}
      <View style={[styles.debugPanel, isDark && { backgroundColor: '#252525', borderColor: '#383838' }]}>
        <Text style={[styles.debugTitle, isDark && { color: '#f3f4f6' }]}>
          Viseme Debug Info
        </Text>
        
        <ScrollView style={styles.debugScroll}>
          {alignmentData && alignmentData.phonemes ? (
            <View>
              <Text style={[styles.debugText, isDark && { color: '#e5e7eb' }]}>
                Phonemes: {alignmentData.phonemes.length}
              </Text>
              {alignmentData.phonemes.map((phoneme: any, index: number) => (
                <Text key={index} style={[styles.debugText, isDark && { color: '#e5e7eb' }]}>
                  {index}: "{phoneme.phoneme}" ({phoneme.start_time.toFixed(3)}s - {phoneme.end_time.toFixed(3)}s)
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[styles.debugText, isDark && { color: '#e5e7eb' }]}>
              No phoneme data available
            </Text>
          )}
        </ScrollView>
      </View>
      
      {/* Raw Metadata Inspector */}
      <View style={[styles.metadataPanel, isDark && { backgroundColor: '#252525', borderColor: '#383838' }]}>
        <Text style={[styles.metadataTitle, isDark && { color: '#f3f4f6' }]}>
          ElevenLabs Raw Metadata
        </Text>
        
        <ScrollView style={styles.metadataScroll}>
          {rawMetadata ? (
            <View>
              {/* API Response Structure */}
              <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                Response Structure:
              </Text>
              <Text style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
                {Object.keys(rawMetadata).join(', ')}
              </Text>
              
              {/* Character Level Metadata (New format) */}
              {rawMetadata.characters && Array.isArray(rawMetadata.characters) && (
                <>
                  <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                    Character-Level Metadata ({rawMetadata.characters.length} chars):
                  </Text>
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, { flex: 0.3 }, isDark && { color: '#e5e7eb' }]}>Char</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>Start (s)</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>End (s)</Text>
                    </View>
                    {rawMetadata.characters.slice(0, 30).map((char: any, index: number) => {
                      // Handle different formats - either object with character property or direct character
                      const character = typeof char === 'object' ? (char.character || '') : char;
                      const startTime = 
                        typeof char === 'object' && char.start_time !== undefined ? char.start_time : 
                        rawMetadata.character_start_times_seconds && rawMetadata.character_start_times_seconds[index] !== undefined ? 
                          rawMetadata.character_start_times_seconds[index] : null;
                      const endTime = 
                        typeof char === 'object' && char.end_time !== undefined ? char.end_time : 
                        rawMetadata.character_end_times_seconds && rawMetadata.character_end_times_seconds[index] !== undefined ? 
                          rawMetadata.character_end_times_seconds[index] : null;
                      
                      return (
                        <View key={index} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 0.3 }, isDark && { color: '#e5e7eb' }]}>
                            {character === ' ' ? '⎵' : character || '?'}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>
                            {startTime !== null ? startTime.toFixed(3) : 'N/A'}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>
                            {endTime !== null ? endTime.toFixed(3) : 'N/A'}
                          </Text>
                        </View>
                      );
                    })}
                    {rawMetadata.characters.length > 30 && (
                      <Text style={[styles.metadataText, isDark && { color: '#e5e7eb', paddingHorizontal: 8, paddingTop: 4 }]}>
                        ...and {rawMetadata.characters.length - 30} more characters
                      </Text>
                    )}
                  </View>
                </>
              )}
              
              {/* Arrays of character data (Alternative format) */}
              {!rawMetadata.characters && rawMetadata.character_start_times_seconds && Array.isArray(rawMetadata.character_start_times_seconds) && (
                <>
                  <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                    Character Timing Data ({rawMetadata.character_start_times_seconds.length} chars):
                  </Text>
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, { flex: 0.3 }, isDark && { color: '#e5e7eb' }]}>Index</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>Start (s)</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>End (s)</Text>
                    </View>
                    {rawMetadata.character_start_times_seconds.slice(0, 30).map((startTime: number, index: number) => {
                      const endTime = rawMetadata.character_end_times_seconds?.[index];
                      
                      return (
                        <View key={index} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 0.3 }, isDark && { color: '#e5e7eb' }]}>
                            {index}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>
                            {startTime.toFixed(3)}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 0.35 }, isDark && { color: '#e5e7eb' }]}>
                            {endTime !== undefined ? endTime.toFixed(3) : 'N/A'}
                          </Text>
                        </View>
                      );
                    })}
                    {rawMetadata.character_start_times_seconds.length > 30 && (
                      <Text style={[styles.metadataText, isDark && { color: '#e5e7eb', paddingHorizontal: 8, paddingTop: 4 }]}>
                        ...and {rawMetadata.character_start_times_seconds.length - 30} more timings
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Word Alignments - Keep the existing code for this section */}
              {rawMetadata.word_alignments && (
                <>
                  <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                    Word Alignments ({rawMetadata.word_alignments.length}):
                  </Text>
                  {rawMetadata.word_alignments.slice(0, 10).map((word: any, index: number) => (
                    <Text key={index} style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
                      "{word.word}" ({word.start.toFixed(3)}s - {(word.start + word.duration).toFixed(3)}s)
                    </Text>
                  ))}
                  {rawMetadata.word_alignments.length > 10 && (
                    <Text style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
                      ...and {rawMetadata.word_alignments.length - 10} more words
                    </Text>
                  )}
                </>
              )}
              
              {/* Detailed Phoneme Data - Keep the existing code for this section */}
              {rawMetadata.alignment && rawMetadata.alignment.phonemes && (
                <>
                  <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                    Detailed Phonemes ({rawMetadata.alignment.phonemes.length}):
                  </Text>
                  {rawMetadata.alignment.phonemes.slice(0, 15).map((phoneme: any, index: number) => (
                    <Text key={index} style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
                      {index}: "{phoneme.phoneme}" ({phoneme.start_time.toFixed(3)}s - {phoneme.end_time.toFixed(3)}s)
                    </Text>
                  ))}
                  {rawMetadata.alignment.phonemes.length > 15 && (
                    <Text style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
                      ...and {rawMetadata.alignment.phonemes.length - 15} more phonemes
                    </Text>
                  )}
                </>
              )}
              
              {/* Raw JSON Preview */}
              <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb', marginTop: 16 }]}>
                Raw JSON Preview:
              </Text>
              <ScrollView 
                horizontal 
                style={styles.jsonContainer}
                contentContainerStyle={styles.jsonContentContainer}
              >
                <Text style={[styles.jsonText, isDark && { color: '#e5e7eb' }]}>
                  {JSON.stringify(rawMetadata, null, 2)}
                </Text>
              </ScrollView>
              
              {/* Metadata Type */}
              <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                Source Type:
              </Text>
              <Text style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
                {rawMetadata.alignment && rawMetadata.alignment.phonemes 
                  ? 'Detailed phoneme data' 
                  : rawMetadata.word_alignments 
                    ? 'Word alignment data' 
                    : rawMetadata.characters || (rawMetadata.character_start_times_seconds && rawMetadata.character_end_times_seconds)
                      ? 'Character-level timing data'
                      : 'Unknown data format'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
              No metadata available yet. Generate speech to see the API response.
            </Text>
          )}
        </ScrollView>
      </View>
      
      {/* Viseme Mapping Analysis */}
      <View style={[styles.metadataPanel, styles.visemePanel, isDark && { backgroundColor: '#252525', borderColor: '#383838' }]}>
        <Text style={[styles.metadataTitle, styles.visemeTitle, isDark && { color: '#f3f4f6' }]}>
          Phoneme-to-Viseme Mapping
        </Text>
        
        <ScrollView style={styles.metadataScroll}>
          {mappedVisemes.length > 0 ? (
            <View>
              <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb' }]}>
                Mapped {mappedVisemes.length} phonemes:
              </Text>
              
              <View style={styles.mappingTable}>
                <View style={styles.mappingHeader}>
                  <Text style={[styles.mappingHeaderText, isDark && { color: '#f3f4f6' }]}>Phoneme</Text>
                  <Text style={[styles.mappingHeaderText, isDark && { color: '#f3f4f6' }]}>Viseme</Text>
                </View>
                
                {/* Group by viseme type and show counts */}
                {Object.entries(
                  mappedVisemes.reduce((acc: Record<string, Array<string>>, item) => {
                    if (!acc[item.viseme]) {
                      acc[item.viseme] = [];
                    }
                    acc[item.viseme].push(item.phoneme);
                    return acc;
                  }, {})
                ).map(([viseme, phonemes], index) => (
                  <View key={index} style={styles.mappingRow}>
                    <Text style={[styles.mappingPhonemes, isDark && { color: '#e5e7eb' }]}>
                      {phonemes.slice(0, 6).join(', ')}
                      {phonemes.length > 6 ? ` ...+${phonemes.length - 6}` : ''}
                    </Text>
                    <Text style={[
                      styles.mappingViseme, 
                      styles[`viseme${viseme}` as keyof typeof styles] as any, 
                      isDark && { opacity: 0.9 }
                    ]}>
                      {viseme} ({phonemes.length})
                    </Text>
                  </View>
                ))}
              </View>
              
              <Text style={[styles.metadataSubtitle, isDark && { color: '#e5e7eb', marginTop: 16 }]}>
                Viseme Coverage:
              </Text>
              <View style={styles.visemeCoverage}>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'O', 'U', 'TH', 'WQ', 'rest'].map((viseme) => {
                  const count = mappedVisemes.filter(m => m.viseme === viseme).length;
                  return (
                    <View key={viseme} style={[
                      styles.visemeBadge, 
                      styles[`viseme${viseme}` as keyof typeof styles] as any, 
                      count === 0 && styles.missingViseme,
                      isDark && { borderColor: '#555' }
                    ]}>
                      <Text style={[
                        styles.visemeBadgeText, 
                        count === 0 && styles.missingVisemeText,
                        isDark && { color: '#fff' }
                      ]}>
                        {viseme} ({count})
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={[styles.metadataText, isDark && { color: '#e5e7eb' }]}>
              No viseme mappings available. Generate speech to see the phoneme-to-viseme mapping.
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  characterContainer: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  voiceList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  voiceButton: {
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  selectedVoiceButton: {
    borderWidth: 0,
  },
  voiceButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
  selectedVoiceButtonText: {
    fontWeight: 'bold',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  slider: {
    height: 40,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  playButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  debugPanel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  debugScroll: {
    maxHeight: 160,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metadataPanel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    maxHeight: 400,
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#d32f2f', // Red color to distinguish from debug panel
  },
  metadataSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  metadataScroll: {
    maxHeight: 350,
  },
  metadataText: {
    fontSize: 12,
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  visemePanel: {
    marginTop: 16,
    borderColor: '#7986cb',
  },
  visemeTitle: {
    color: '#3f51b5', // Indigo color for viseme panel
  },
  mappingTable: {
    marginTop: 8,
  },
  mappingHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
    marginBottom: 4,
  },
  mappingHeaderText: {
    fontWeight: '600',
    flex: 1,
  },
  mappingRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  mappingPhonemes: {
    flex: 2,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  mappingViseme: {
    flex: 1,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 11,
    borderRadius: 4,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  visemeCoverage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  visemeBadge: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 4,
    margin: 2,
    minWidth: 45,
  },
  visemeBadgeText: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  missingViseme: {
    borderColor: '#e57373',
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
  },
  missingVisemeText: {
    color: '#e57373',
  },
  // Viseme type colors
  visemeA: { backgroundColor: 'rgba(244, 67, 54, 0.2)', color: '#d32f2f' },
  visemeB: { backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#388e3c' },
  visemeC: { backgroundColor: 'rgba(33, 150, 243, 0.2)', color: '#1976d2' },
  visemeD: { backgroundColor: 'rgba(255, 235, 59, 0.2)', color: '#fbc02d' },
  visemeE: { backgroundColor: 'rgba(156, 39, 176, 0.2)', color: '#7b1fa2' },
  visemeF: { backgroundColor: 'rgba(0, 188, 212, 0.2)', color: '#0097a7' },
  visemeG: { backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#f57c00' },
  visemeI: { backgroundColor: 'rgba(121, 85, 72, 0.2)', color: '#5d4037' },
  visemeO: { backgroundColor: 'rgba(63, 81, 181, 0.2)', color: '#303f9f' },
  visemeU: { backgroundColor: 'rgba(233, 30, 99, 0.2)', color: '#c2185b' },
  visemeTH: { backgroundColor: 'rgba(103, 58, 183, 0.2)', color: '#512da8' },
  visemeWQ: { backgroundColor: 'rgba(0, 150, 136, 0.2)', color: '#00796b' },
  visemerest: { backgroundColor: 'rgba(158, 158, 158, 0.2)', color: '#757575' },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 4,
  },
  tableCell: {
    fontSize: 12,
    paddingHorizontal: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  jsonContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  jsonContentContainer: {
    padding: 8,
  },
  jsonText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default LipSyncTester; 