import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus } from 'expo-av';

// Store the sound object for control purposes
let currentSound: Audio.Sound | null = null;
let isProcessingTTS = false; // Flag to prevent parallel TTS requests

// Interface for TTS options
interface TTSOptions {
  text: string;
  voice?: string;
  model?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  abortController?: AbortController;
}

// Get the ElevenLabs API key from AsyncStorage
const getElevenLabsApiKey = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('elevenLabsApiKey');
  } catch (error) {
    console.error('Error retrieving ElevenLabs API key:', error);
    return null;
  }
};

// Set the ElevenLabs API key in AsyncStorage
export const setElevenLabsApiKey = async (apiKey: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('elevenLabsApiKey', apiKey);
  } catch (error) {
    console.error('Error saving ElevenLabs API key:', error);
    throw error;
  }
};

// Function to fetch available voices from ElevenLabs
export const getAvailableVoices = async (): Promise<any[]> => {
  const apiKey = await getElevenLabsApiKey();
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not found');
  }
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ElevenLabs API error: ${errorData.detail || response.statusText}`);
    }
    
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
};

// Function to stop any currently playing audio
export const stopSpeech = async (): Promise<void> => {
  console.log('[TTS] stopSpeech called, currentSound:', currentSound ? 'exists' : 'null');
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      console.log('[TTS] Successfully stopped and unloaded sound');
    } catch (error) {
      console.error('[TTS] Error stopping speech:', error);
    } finally {
      currentSound = null;
    }
  }
  isProcessingTTS = false; // Reset the processing flag
};

// Main function to convert text to speech and play it
export const speakText = async (options: TTSOptions): Promise<{
  sound: Audio.Sound;
  alignmentData?: any;
}> => {
  console.log('[TTS] speakText called with text length:', options.text.length);
  
  // If another TTS request is in progress, stop it first
  if (isProcessingTTS) {
    console.log('[TTS] Another TTS request is in progress, stopping it first');
    await stopSpeech();
  }
  
  // Set the flag to indicate we're processing a TTS request
  isProcessingTTS = true;
  
  const {
    text,
    voice = 'EXAVITQu4vr4xnSDxMaL', // Default voice ID (Rachel)
    model = 'eleven_monolingual_v1',
    stability,
    similarity_boost,
    style = 0,
    use_speaker_boost,
    abortController = new AbortController()
  } = options;
  
  // Get stored voice settings from AsyncStorage if not provided in options
  let finalStability = stability;
  let finalSimilarityBoost = similarity_boost;
  let finalSpeakerBoost = use_speaker_boost;
  
  // If settings are not provided, load from AsyncStorage
  if (finalStability === undefined || finalSimilarityBoost === undefined || finalSpeakerBoost === undefined) {
    try {
      const savedStability = await AsyncStorage.getItem('ttsStability');
      const savedSimilarityBoost = await AsyncStorage.getItem('ttsSimilarityBoost');
      const savedSpeakerBoost = await AsyncStorage.getItem('ttsSpeakerBoost');
      
      finalStability = stability ?? (savedStability ? parseFloat(savedStability) : 0.5);
      finalSimilarityBoost = similarity_boost ?? (savedSimilarityBoost ? parseFloat(savedSimilarityBoost) : 0.75);
      finalSpeakerBoost = use_speaker_boost ?? (savedSpeakerBoost === 'true');
    } catch (error) {
      console.error('[TTS] Error loading voice settings from AsyncStorage:', error);
      // Fall back to defaults if something went wrong
      finalStability = stability ?? 0.5;
      finalSimilarityBoost = similarity_boost ?? 0.75;
      finalSpeakerBoost = use_speaker_boost ?? true;
    }
  }
  
  const apiKey = await getElevenLabsApiKey();
  
  if (!apiKey) {
    isProcessingTTS = false;
    throw new Error('ElevenLabs API key not found');
  }
  
  // Stop any currently playing speech
  console.log('[TTS] Stopping any existing playback before new request');
  await stopSpeech();
  
  try {
    // First try the with-timestamps endpoint
    console.log('[TTS] Making API request to ElevenLabs with-timestamps endpoint');
    
    // Use the correct timestamps endpoint
    const timestampsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`;
    
    const timestampsResponse = await fetch(timestampsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: finalStability,
          similarity_boost: finalSimilarityBoost,
          style,
          use_speaker_boost: finalSpeakerBoost
        }
      }),
      signal: abortController.signal
    });
    
    // If timestamps endpoint successful, process that response
    if (timestampsResponse.ok) {
      console.log('[TTS] Successfully received response from with-timestamps endpoint');
      const responseData = await timestampsResponse.json();
      
      // Extract audio data and alignment data
      const audioBase64 = responseData.audio_base64;
      const alignmentData = responseData.alignment || null;
      
      // Create and play the sound
      console.log('[TTS] Creating sound object from timestamp response');
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${audioBase64}` },
        { shouldPlay: true }
      );
      
      // Store the sound globally for controls
      currentSound = sound;
      
      // Set up playback status handler
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          console.log('[TTS] Playback finished naturally');
          isProcessingTTS = false;
        }
      });
      
      console.log('[TTS] Sound created and playback started with proper timing data');
      return { sound, alignmentData };
    } 
    
    // Fallback to standard endpoint if timestamps endpoint fails
    console.log('[TTS] Timestamps endpoint failed, falling back to standard endpoint');
    const standardUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
    
    const response = await fetch(standardUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: finalStability,
          similarity_boost: finalSimilarityBoost,
          style,
          use_speaker_boost: finalSpeakerBoost
        }
      }),
      signal: abortController.signal
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${errorText || response.statusText}`);
    }
    
    console.log('[TTS] Received successful response from standard endpoint');
    // Get audio data as arraybuffer
    const audioData = await response.arrayBuffer();
    
    // Convert arraybuffer to base64
    const audioBase64 = btoa(
      new Uint8Array(audioData)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    console.log('[TTS] Creating sound object');
    // Create and play the sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mpeg;base64,${audioBase64}` },
      { shouldPlay: true }
    );
    
    // Store the sound globally for controls
    currentSound = sound;
    
    // Set up a handler for playback status
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        console.log('[TTS] Playback finished naturally');
        isProcessingTTS = false;
      }
    });
    
    // Create estimated alignment data since we don't have real timing data
    console.log('[TTS] Creating estimated alignment data');
    const estimatedDuration = text.length * 0.05; // Rough estimate of 50ms per character
    const estimatedAlignmentData = {
      words: text.split(' ').map((word, index, arr) => {
        const start = (index / arr.length) * estimatedDuration;
        // Make duration proportional to word length for more natural timing
        const duration = (word.length / text.length) * estimatedDuration * 2;
        return {
          word: word + (index < arr.length - 1 ? ' ' : ''),
          start,
          duration
        };
      })
    };
    
    return { sound, alignmentData: estimatedAlignmentData };
    
  } catch (error) {
    // Check if this is an AbortError, which means the request was canceled
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[TTS] TTS request was aborted');
      isProcessingTTS = false;
      return { sound: null as unknown as Audio.Sound };
    }
    
    console.error('[TTS] Error with ElevenLabs TTS:', error);
    isProcessingTTS = false;
    throw error;
  }
}; 