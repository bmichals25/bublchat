import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Message } from '../types';
import { MaterialIcons } from '@expo/vector-icons';
import { speakText, stopSpeech } from '../utils/tts';
import { useChat } from '../context/ChatContext';
import ProgressiveText from './ProgressiveText';
import LipSync from './CharacterAvatar/LipSync';

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
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const windowDimensions = useWindowDimensions();
  const isMobile = windowDimensions.width < 768;
  
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
      handlePlay();
    }
  }, [isUser, isLatestAIMessage, isTTSEnabled, message.isLoading, message.content, message.id]);
  
  const handlePlay = async () => {
    console.log('[MessageItem] handlePlay called for message:', message.id);
    
    if (isPlaying && sound) {
      console.log('[MessageItem] Stopping current playback for message:', message.id);
      await stopSpeech();
      setIsPlaying(false);
      setSound(null);
      return;
    }
    
    setShowContent(false); // Hide content initially while TTS loads
    
    try {
      console.log('[MessageItem] Starting TTS for message:', message.id);
      const result = await speakText({
        text: message.content,
        detailed_metadata: true // Request detailed metadata for lip-sync
      });
      
      if (!result.sound) {
        console.error('[MessageItem] No sound returned from speakText for message:', message.id);
        return;
      }
      
      setSound(result.sound);
      setAlignmentData(result.alignmentData);
      setIsPlaying(true);
      setIsComplete(false);
      setShowContent(true); // Show content once TTS is loaded
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
    setIsPlaying(false);
    setSound(null);
  };

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.aiContainer,
      isDarkMode && isUser ? { backgroundColor: darkThemeColors.userBubble } : null,
      isDarkMode && !isUser ? { backgroundColor: darkThemeColors.surfaceElevated } : null
    ]}>
      <View style={styles.messageHeader}>
        <Text style={[
          styles.roleBadge,
          isUser ? styles.userBadge : styles.aiBadge,
          isDarkMode && !isUser ? { color: darkThemeColors.primary } : null,
          isDarkMode && isUser ? { color: isDarkMode ? darkThemeColors.text : '#333' } : null
        ]}>
          {isUser ? 'You' : 'AI'}
        </Text>
        
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
        >
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={20}
            color={isDarkMode ? darkThemeColors.textTertiary : '#6b7280'}
          />
        </TouchableOpacity>
      </View>
      
      {isExpanded && (
        <View style={styles.messageContent}>
          {showContent ? (
            <>
              {/* Show lip-sync character for AI messages that are currently being played */}
              {!isUser && isPlaying && sound && alignmentData ? (
                <LipSync
                  text={message.content}
                  sound={sound}
                  alignmentData={alignmentData}
                  characterSize={150}
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
      )}
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
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  userBadge: {
    color: '#ffffff',
  },
  aiBadge: {
    color: '#111827',
  },
  expandButton: {
    padding: 4,
  },
  messageContent: {
    padding: 8,
  },
});

export default MessageItem; 