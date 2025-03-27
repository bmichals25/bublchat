import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Message } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import { speakText, stopSpeech } from '../utils/tts';
import { useChat } from '../context/ChatContext';
import ProgressiveText from './ProgressiveText';

// Define refined dark mode colors for MessageItem to match Chat screen
const darkThemeDefaults = {
  surface: '#1e1e1e',
  surfaceElevated: '#252525',
  primary: '#54C6EB',
  primaryDark: '#3ba8ca',
  text: '#f3f4f6',
  textSecondary: '#b3b8c3',
  textTertiary: '#9ca3af',
  border: '#383838',
};

interface MessageItemProps {
  message: Message;
  isDarkMode?: boolean;
  darkThemeColors?: any;
  isLatestAIMessage?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isDarkMode = false,
  darkThemeColors = darkThemeDefaults,
  isLatestAIMessage = false
}) => {
  const dimensions = useWindowDimensions();
  const isUser = message.role === 'user';
  const { isTTSEnabled } = useChat();
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [alignmentData, setAlignmentData] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(true);
  const hasPlayedRef = useRef(false);
  const playbackInitiatedRef = useRef(false);
  const [showContent, setShowContent] = useState(isUser); // Only show user content immediately
  
  // Clean up on unmount
  useEffect(() => {
    console.log('[MessageItem] Mount component for message:', message.id);
    return () => {
      console.log('[MessageItem] Unmount component for message:', message.id);
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [message.id]);
  
  // Reset state when message content changes
  useEffect(() => {
    console.log('[MessageItem] Content changed for message:', message.id);
    hasPlayedRef.current = false;
    setIsComplete(false);
    setShowContent(isUser); // Reset showContent when message content changes
    playbackInitiatedRef.current = false;
  }, [message.content, isUser, message.id]);
  
  // Auto-play for the latest AI message when TTS is enabled
  useEffect(() => {
    // Only play automatically if:
    // 1. It's an AI message
    // 2. It's the latest AI message
    // 3. TTS is enabled
    // 4. It hasn't been played yet
    // 5. The message is not loading
    // 6. Playback hasn't been initiated yet
    if (!isUser && isLatestAIMessage && isTTSEnabled && !hasPlayedRef.current && 
        !message.isLoading && message.content && !playbackInitiatedRef.current) {
      console.log('[MessageItem] Auto-playing message:', message.id);
      playbackInitiatedRef.current = true; // Mark that we've initiated playback
      handlePlay(true);
    }
  }, [isUser, isLatestAIMessage, isTTSEnabled, message.isLoading, message.content, message.id]);
  
  const handlePlay = async (autoPlay = false) => {
    console.log('[MessageItem] handlePlay called, autoPlay:', autoPlay, 'for message:', message.id);
    
    // If already playing, stop it
    if (isPlaying && sound) {
      console.log('[MessageItem] Stopping current playback for message:', message.id);
      await sound.stopAsync();
      setIsPlaying(false);
      setSound(null);
      return;
    }
    
    // Don't play if the message is loading
    if (message.isLoading) {
      console.log('[MessageItem] Message is loading, not playing:', message.id);
      return;
    }
    
    try {
      // First, stop any currently playing audio
      console.log('[MessageItem] Stopping any existing speech before playing message:', message.id);
      await stopSpeech();
      
      console.log('[MessageItem] Starting TTS for message:', message.id);
      const result = await speakText({
        text: message.content,
      });
      
      if (!result.sound) {
        console.error('[MessageItem] No sound returned from speakText for message:', message.id);
        return;
      }
      
      setSound(result.sound);
      setAlignmentData(result.alignmentData);
      setIsPlaying(true);
      setIsComplete(false);
      setShowContent(true); // Show content when playback starts
      hasPlayedRef.current = true;
      
      // Set up handler for when audio finishes
      result.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            console.log('[MessageItem] Playback finished for message:', message.id);
            setIsPlaying(false);
            setIsComplete(true);
            // Don't unload the sound here so we can keep the alignment data
          } else if (status.isPlaying) {
            // This ensures we're actually playing
            setShowContent(true);
          }
        }
      });
    } catch (error) {
      console.error('[MessageItem] Error playing TTS for message:', message.id, error);
      setIsPlaying(false);
      setShowContent(true); // Show content on error
    }
  };
  
  const handleComplete = () => {
    console.log('[MessageItem] Text playback complete for message:', message.id);
    setIsComplete(true);
  };

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.aiContainer,
    ]}>
      <View style={[
        styles.messageWrapper,
        isUser ? styles.userMessageWrapper : styles.aiMessageWrapper,
        { maxWidth: dimensions.width > 600 ? '70%' : '85%' }
      ]}>
        <View style={[
          styles.messageBubble,
          isUser 
            ? [
                styles.userMessage,
                isDarkMode && { 
                  backgroundColor: darkThemeColors.primary,
                  shadowOpacity: 0.15,
                }
              ] 
            : [
                styles.aiMessage,
                isDarkMode && { 
                  backgroundColor: darkThemeColors.surfaceElevated,
                  borderColor: darkThemeColors.border,
                  borderWidth: 1,
                  shadowOpacity: 0.15, 
                }
              ],
        ]}>
          {/* Only show content if it's a user message or if we explicitly set showContent for AI messages */}
          {showContent ? (
            <>
              {/* Show progressive text for AI messages that are currently being played */}
              {!isUser && isPlaying && sound && alignmentData ? (
                <ProgressiveText
                  text={message.content}
                  sound={sound}
                  alignmentData={alignmentData}
                  textColor={isDarkMode ? darkThemeColors.text : '#111827'}
                  fontSize={16}
                  isDark={isDarkMode}
                  onComplete={handleComplete}
                />
              ) : (
                <Text style={[
                  styles.messageText,
                  isUser ? styles.userMessageText : [
                    styles.aiMessageText,
                    isDarkMode && { color: darkThemeColors.text }
                  ]
                ]}>
                  {message.content}
                </Text>
              )}
            </>
          ) : (
            // Show a placeholder or loading indicator when content is hidden
            <Text style={[
              styles.messageText,
              { color: isDarkMode ? darkThemeColors.textTertiary : '#9ca3af' }
            ]}>
              {message.isLoading ? "Generating response..." : "Starting text-to-speech..."}
            </Text>
          )}
          
          {/* Only show the TTS button for AI messages when TTS is enabled */}
          {!isUser && isTTSEnabled && (
            <TouchableOpacity 
              style={styles.ttsButton}
              onPress={() => handlePlay()}
            >
              <MaterialIcons 
                name={isPlaying ? "stop" : "volume-up"} 
                size={20} 
                color={isDarkMode ? darkThemeColors.primary : "#54C6EB"} 
              />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[
          styles.timestamp,
          isUser ? styles.userTimestamp : styles.aiTimestamp,
          isDarkMode && { color: darkThemeColors.textTertiary }
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 0,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    flexDirection: 'column',
    maxWidth: '80%',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 2,
    position: 'relative',
  },
  userMessage: {
    backgroundColor: '#54C6EB',
    borderTopRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  aiMessage: {
    backgroundColor: '#f7f9fc',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    marginHorizontal: 4,
    marginTop: 2,
  },
  userTimestamp: {
    color: '#6b7280',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#6b7280',
    textAlign: 'left',
  },
  ttsButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  }
});

export default MessageItem; 