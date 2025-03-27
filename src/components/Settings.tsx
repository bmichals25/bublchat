import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Switch, ScrollView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { setElevenLabsApiKey, getAvailableVoices } from '../utils/tts';

interface ApiKeyState {
  openai: string;
  anthropic: string;
  google: string;
  mistral: string;
  elevenlabs: string;
}

interface VoiceOption {
  voice_id: string;
  name: string;
  preview_url?: string;
}

const Settings = () => {
  const { currentLLM, setLLM, llmOptions, isTTSEnabled, toggleTTS, ttsVoice, changeTTSVoice } = useChat();
  const { isDark } = useTheme();
  const [apiKeys, setApiKeys] = useState<ApiKeyState>({
    openai: '',
    anthropic: '',
    google: '',
    mistral: '',
    elevenlabs: ''
  });
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.5);
  const [speakerBoost, setSpeakerBoost] = useState(false);
  
  // Load API keys on component mount
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const openaiKey = await AsyncStorage.getItem('openaiApiKey') || '';
        const anthropicKey = await AsyncStorage.getItem('anthropicApiKey') || '';
        const googleKey = await AsyncStorage.getItem('googleApiKey') || '';
        const mistralKey = await AsyncStorage.getItem('mistralApiKey') || '';
        const elevenlabsKey = await AsyncStorage.getItem('elevenLabsApiKey') || '';
        
        setApiKeys({
          openai: openaiKey,
          anthropic: anthropicKey,
          google: googleKey,
          mistral: mistralKey,
          elevenlabs: elevenlabsKey
        });
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    };
    
    loadApiKeys();
  }, []);
  
  // Load TTS voice settings on component mount
  useEffect(() => {
    const loadVoiceSettings = async () => {
      try {
        const savedStability = await AsyncStorage.getItem('ttsStability');
        const savedSimilarityBoost = await AsyncStorage.getItem('ttsSimilarityBoost');
        const savedSpeakerBoost = await AsyncStorage.getItem('ttsSpeakerBoost');
        
        if (savedStability) setStability(parseFloat(savedStability));
        if (savedSimilarityBoost) setSimilarityBoost(parseFloat(savedSimilarityBoost));
        if (savedSpeakerBoost) setSpeakerBoost(savedSpeakerBoost === 'true');
      } catch (error) {
        console.error('Error loading voice settings:', error);
      }
    };
    
    loadVoiceSettings();
  }, []);
  
  // Load available voices when ElevenLabs API key is set
  useEffect(() => {
    const fetchVoices = async () => {
      if (!apiKeys.elevenlabs) return;
      
      setLoadingVoices(true);
      try {
        const availableVoices = await getAvailableVoices();
        setVoices(availableVoices);
      } catch (error) {
        console.error('Error fetching voices:', error);
      } finally {
        setLoadingVoices(false);
      }
    };
    
    fetchVoices();
  }, [apiKeys.elevenlabs]);
  
  // Save API key to AsyncStorage
  const saveApiKey = async (provider: keyof ApiKeyState, value: string) => {
    try {
      const key = value.trim();
      
      // Update state
      setApiKeys(prev => ({ ...prev, [provider]: key }));
      
      // Save to AsyncStorage
      switch (provider) {
        case 'openai':
          await AsyncStorage.setItem('openaiApiKey', key);
          break;
        case 'anthropic':
          await AsyncStorage.setItem('anthropicApiKey', key);
          break;
        case 'google':
          await AsyncStorage.setItem('googleApiKey', key);
          break;
        case 'mistral':
          await AsyncStorage.setItem('mistralApiKey', key);
          break;
        case 'elevenlabs':
          await setElevenLabsApiKey(key);
          break;
      }
      
      console.log(`${provider} API key saved successfully`);
    } catch (error) {
      console.error(`Error saving ${provider} API key:`, error);
    }
  };
  
  const saveVoiceSettings = async () => {
    try {
      // Save voice settings to AsyncStorage
      await AsyncStorage.setItem('ttsStability', stability.toString());
      await AsyncStorage.setItem('ttsSimilarityBoost', similarityBoost.toString());
      await AsyncStorage.setItem('ttsSpeakerBoost', speakerBoost.toString());
      
      console.log('Voice settings saved successfully', {
        stability,
        similarityBoost,
        speakerBoost
      });
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  };
  
  return (
    <ScrollView style={[styles.container, isDark && { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, isDark && { color: '#f3f4f6' }]}>Settings</Text>
      
      {/* LLM Selection */}
      <View style={[styles.section, isDark && { backgroundColor: '#252525', borderColor: '#383838', borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, isDark && { color: '#f3f4f6' }]}>Select Language Model</Text>
        {llmOptions.map(option => (
          <TouchableOpacity 
            key={option.id} 
            style={[
              styles.modelOption, 
              currentLLM === option.name && styles.selectedModel
            ]}
            onPress={() => setLLM(option.name)}
          >
            <Text style={[styles.modelName, isDark && { color: '#f3f4f6' }]}>{option.name}</Text>
            <Text style={[styles.modelProvider, isDark && { color: '#9ca3af' }]}>{option.provider}</Text>
            {option.description && (
              <Text style={[styles.modelDescription, isDark && { color: '#9ca3af' }]}>{option.description}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* API Keys */}
      <View style={[styles.section, isDark && { backgroundColor: '#252525', borderColor: '#383838', borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, isDark && { color: '#f3f4f6' }]}>API Keys</Text>
        
        <View style={styles.apiKeyContainer}>
          <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>OpenAI API Key</Text>
          <TextInput
            style={[styles.input, isDark && { backgroundColor: '#1e1e1e', borderColor: '#4d4d4d', color: '#f3f4f6' }]}
            value={apiKeys.openai}
            onChangeText={(text) => setApiKeys(prev => ({ ...prev, openai: text }))}
            onBlur={() => saveApiKey('openai', apiKeys.openai)}
            placeholder="Enter OpenAI API key"
            placeholderTextColor={isDark ? '#9ca3af' : '#a0aec0'}
            secureTextEntry={true}
          />
        </View>
        
        <View style={styles.apiKeyContainer}>
          <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>Anthropic API Key</Text>
          <TextInput
            style={[styles.input, isDark && { backgroundColor: '#1e1e1e', borderColor: '#4d4d4d', color: '#f3f4f6' }]}
            value={apiKeys.anthropic}
            onChangeText={(text) => setApiKeys(prev => ({ ...prev, anthropic: text }))}
            onBlur={() => saveApiKey('anthropic', apiKeys.anthropic)}
            placeholder="Enter Anthropic API key"
            placeholderTextColor={isDark ? '#9ca3af' : '#a0aec0'}
            secureTextEntry={true}
          />
        </View>
        
        <View style={styles.apiKeyContainer}>
          <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>Mistral API Key</Text>
          <TextInput
            style={[styles.input, isDark && { backgroundColor: '#1e1e1e', borderColor: '#4d4d4d', color: '#f3f4f6' }]}
            value={apiKeys.mistral}
            onChangeText={(text) => setApiKeys(prev => ({ ...prev, mistral: text }))}
            onBlur={() => saveApiKey('mistral', apiKeys.mistral)}
            placeholder="Enter Mistral API key"
            placeholderTextColor={isDark ? '#9ca3af' : '#a0aec0'}
            secureTextEntry={true}
          />
        </View>
        
        <View style={styles.apiKeyContainer}>
          <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>Google API Key</Text>
          <TextInput
            style={[styles.input, isDark && { backgroundColor: '#1e1e1e', borderColor: '#4d4d4d', color: '#f3f4f6' }]}
            value={apiKeys.google}
            onChangeText={(text) => setApiKeys(prev => ({ ...prev, google: text }))}
            onBlur={() => saveApiKey('google', apiKeys.google)}
            placeholder="Enter Google API key"
            placeholderTextColor={isDark ? '#9ca3af' : '#a0aec0'}
            secureTextEntry={true}
          />
        </View>
      </View>
      
      {/* Text-to-Speech Settings */}
      <View style={[styles.section, isDark && { backgroundColor: '#252525', borderColor: '#383838', borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, isDark && { color: '#f3f4f6' }]}>Text-to-Speech Settings</Text>
        
        <View style={styles.apiKeyContainer}>
          <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>ElevenLabs API Key</Text>
          <TextInput
            style={[styles.input, isDark && { backgroundColor: '#1e1e1e', borderColor: '#4d4d4d', color: '#f3f4f6' }]}
            value={apiKeys.elevenlabs}
            onChangeText={(text) => setApiKeys(prev => ({ ...prev, elevenlabs: text }))}
            onBlur={() => saveApiKey('elevenlabs', apiKeys.elevenlabs)}
            placeholder="Enter ElevenLabs API key"
            placeholderTextColor={isDark ? '#9ca3af' : '#a0aec0'}
            secureTextEntry={true}
          />
        </View>
        
        <View style={styles.toggleContainer}>
          <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>Enable Text-to-Speech</Text>
          <Switch
            value={isTTSEnabled}
            onValueChange={toggleTTS}
            trackColor={{ false: '#767577', true: '#4caf50' }}
            thumbColor={isTTSEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        
        {apiKeys.elevenlabs && (
          <>
            <View style={styles.voiceSelection}>
              <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>Select Voice</Text>
              
              {loadingVoices ? (
                <Text style={isDark ? { color: '#e5e7eb' } : {}}>Loading voices...</Text>
              ) : voices.length > 0 ? (
                <ScrollView horizontal={true} style={styles.voiceList}>
                  {voices.map(voice => (
                    <TouchableOpacity
                      key={voice.voice_id}
                      style={[
                        styles.voiceOption,
                        ttsVoice === voice.voice_id && styles.selectedVoice,
                        isDark && { backgroundColor: '#333' },
                        ttsVoice === voice.voice_id && isDark && { backgroundColor: 'rgba(84, 198, 235, 0.2)', borderColor: '#54C6EB' }
                      ]}
                      onPress={() => changeTTSVoice(voice.voice_id)}
                    >
                      <Text style={[styles.voiceName, isDark && { color: '#e5e7eb' }]}>{voice.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={isDark ? { color: '#e5e7eb' } : {}}>No voices available. Check your API key.</Text>
              )}
            </View>
            
            {/* Advanced TTS Settings */}
            <View style={styles.advancedTTSSettings}>
              <Text style={[styles.subsectionTitle, isDark && { color: '#f3f4f6' }]}>Advanced Voice Settings</Text>
              
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, isDark && { color: '#e5e7eb' }]}>Stability: {stability.toFixed(2)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={stability}
                  onValueChange={setStability}
                  onSlidingComplete={saveVoiceSettings}
                  minimumTrackTintColor={isDark ? "#54C6EB" : "#4caf50"}
                  maximumTrackTintColor={isDark ? "#4d4d4d" : "#dddddd"}
                  thumbTintColor={isDark ? "#54C6EB" : "#00b0ff"}
                />
                <Text style={[styles.sliderHint, isDark && { color: '#9ca3af' }]}>
                  Lower values = more expressive, Higher values = more consistent
                </Text>
              </View>
              
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, isDark && { color: '#e5e7eb' }]}>Similarity Boost: {similarityBoost.toFixed(2)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={similarityBoost}
                  onValueChange={setSimilarityBoost}
                  onSlidingComplete={saveVoiceSettings}
                  minimumTrackTintColor={isDark ? "#54C6EB" : "#4caf50"}
                  maximumTrackTintColor={isDark ? "#4d4d4d" : "#dddddd"}
                  thumbTintColor={isDark ? "#54C6EB" : "#00b0ff"}
                />
                <Text style={[styles.sliderHint, isDark && { color: '#9ca3af' }]}>
                  Higher values = more similar to original voice
                </Text>
              </View>
              
              <View style={styles.toggleContainer}>
                <Text style={[styles.label, isDark && { color: '#e5e7eb' }]}>Speaker Boost</Text>
                <Switch
                  value={speakerBoost}
                  onValueChange={(value) => {
                    setSpeakerBoost(value);
                    saveVoiceSettings();
                  }}
                  trackColor={{ false: '#767577', true: '#4caf50' }}
                  thumbColor={speakerBoost ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              <Text style={[styles.sliderHint, isDark && { color: '#9ca3af' }]}>
                Enhances voice clarity and eliminates artifacts
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  modelOption: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  selectedModel: {
    backgroundColor: '#e0f7fa',
    borderColor: '#00b0ff',
    borderWidth: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modelProvider: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  apiKeyContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceSelection: {
    marginTop: 8,
  },
  voiceList: {
    flexDirection: 'row',
    marginTop: 8,
  },
  voiceOption: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedVoice: {
    backgroundColor: '#e0f7fa',
    borderColor: '#00b0ff',
    borderWidth: 1,
  },
  voiceName: {
    fontWeight: 'bold',
    color: '#444',
  },
  advancedTTSSettings: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#555',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default Settings; 