import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView, NativeSyntheticEvent, TextInputKeyPressEventData, Text, Animated } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useChat } from '../context/ChatContext';

// Define dark theme colors to match the main screen
const darkThemeDefaults = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceElevated: '#252525',
  primary: '#54C6EB',
  primaryDark: '#3ba8ca',
  text: '#f3f4f6',
  textSecondary: '#b3b8c3',
  textTertiary: '#9ca3af',
  border: '#383838',
  inputBackground: '#2a2a2a',
};

// Create a style for web platform
const webStyles = Platform.OS === 'web' 
  ? { 
    // This is the key property that prevents highlighting
    // of the input container on focus in web browsers
    WebkitTapHighlightColor: 'transparent',
    MozTapHighlightColor: 'transparent',
    tapHighlightColor: 'transparent',
  } 
  : {};

interface ChatInputProps {
  isDarkMode?: boolean;
  darkThemeColors?: any;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  isDarkMode = false,
  darkThemeColors = darkThemeDefaults 
}) => {
  const [inputText, setInputText] = useState('');
  const [isMacOS, setIsMacOS] = useState(false);
  const { sendMessage, currentConversationId, isLoading, stopMessageGeneration } = useChat();
  
  // Animation values for the glowing border effect
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Start the animation when component mounts
  useEffect(() => {
    // Create a cycling animation that repeats indefinitely
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 3000, // 3 seconds for a complete cycle
        useNativeDriver: false,
      })
    ).start();
  }, []);
  
  // Interpolate the animated value to create a cycling gradient effect
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: isDarkMode 
      ? ['#54C6EB', '#4AEBCA', '#40D876', '#4AEBCA', '#54C6EB'] 
      : ['#54C6EB', '#4AEBCA', '#40D876', '#4AEBCA', '#54C6EB'],
  });
  
  const glowOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: isDarkMode ? [0.4, 0.7, 0.4] : [0.6, 1, 0.6],
  });
  
  const shadowRadius = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [4, 8, 4],
  });
  
  // Detect if running on macOS for keyboard shortcut text
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if user is on macOS using navigator.platform (works in most browsers)
      const platform = navigator.platform || '';
      setIsMacOS(platform.includes('Mac'));
    }
  }, []);
  
  const handleSend = () => {
    if (isLoading) {
      // If we're currently loading, stop the message generation instead
      stopMessageGeneration();
      return;
    }
    
    if (inputText.trim() === '' || !currentConversationId) return;
    
    sendMessage(inputText);
    setInputText('');
  };

  // Handle key press events for Enter/Return key
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const { key } = e.nativeEvent;
    
    // Check if Enter/Return was pressed
    if (key === 'Enter' || key === 'Return') {
      // On web, check for modifier keys
      if (Platform.OS === 'web') {
        // For web, we need to access the original event
        // @ts-ignore - accessing web-specific properties
        const nativeEvent = e.nativeEvent.originalEvent || e.nativeEvent;
        
        // If Command (macOS) or Control (Windows/Linux) is pressed with Enter/Return, add a new line
        if (nativeEvent.metaKey || nativeEvent.ctrlKey) {
          // Allow default behavior for new line
          return;
        }
        
        // If only Enter/Return is pressed (no modifiers), send the message
        e.preventDefault(); // Prevent default to avoid new line
        handleSend();
      }
    }
  };

  // Get the appropriate keyboard shortcut text
  const getKeyboardShortcutText = () => {
    if (Platform.OS !== 'web') {
      return 'bubl can make mistakes. Consider checking important information.';
    }
    return `Press Enter to send, ${isMacOS ? '⌘+Enter' : 'Ctrl+Enter'} for a new line.`;
  };

  // Generate a random disclaimer for the chat input
  const getRandomDisclaimer = () => {
    const disclaimers = [
      'Messages may be reviewed to improve our systems.',
      'Your feedback helps us improve.',
      'Information provided may not always be accurate.',
      'bubl can make mistakes. Consider checking important information.',
    ];
    
    return disclaimers[Math.floor(Math.random() * disclaimers.length)];
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
      style={styles.keyboardAvoidingView}
    >
      <View style={[
        styles.container,
        isDarkMode && {
          backgroundColor: darkThemeColors.surface,
          borderTopColor: darkThemeColors.border,
        }
      ]}>
        <Animated.View style={[
          styles.inputContainerWrapper,
          {
            borderColor: borderColor,
            shadowColor: borderColor,
            shadowOpacity: glowOpacity,
            shadowRadius: shadowRadius,
          },
          isDarkMode && {
            // Enhance glow effect for dark mode
            elevation: 10,
            ...(Platform.OS === 'web' ? {
              // @ts-ignore - web-only properties
              boxShadow: `0 0 12px rgba(84, 198, 235, 0.6)`,
            } : {}),
          }
        ]}>
          <View style={[
            styles.inputContainer,
            isDarkMode && {
              backgroundColor: darkThemeColors.inputBackground,
            }
          ]}>
            <TextInput
              style={[
                styles.textInput,
                isDarkMode && {
                  color: darkThemeColors.text,
                }
              ]}
              placeholder="Message bubl..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              placeholderTextColor={isDarkMode ? darkThemeColors.textTertiary : "#9CA3AF"}
              selectionColor={darkThemeColors.primary}
              underlineColorAndroid="transparent"
              onKeyPress={handleKeyPress}
              editable={!isLoading}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && !isLoading && [
                  styles.sendButtonDisabled,
                  isDarkMode && {
                    backgroundColor: darkThemeColors.border,
                  }
                ],
                isLoading && {
                  backgroundColor: isDarkMode ? darkThemeColors.primaryLight : '#54C6EB',
                },
                inputText.trim() && !isLoading && isDarkMode && {
                  backgroundColor: darkThemeColors.primary,
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                }
              ]}
              onPress={handleSend}
              disabled={!isLoading && (!inputText.trim() || !currentConversationId)}
            >
              <IconButton
                icon={isLoading ? "stop" : "send"}
                size={24}
                iconColor={
                  isLoading
                    ? "#ffffff"
                    : inputText.trim() 
                      ? "#ffffff" 
                      : isDarkMode 
                        ? darkThemeColors.textTertiary 
                        : "#9CA3AF"
                }
                style={styles.sendIcon}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        <View style={styles.disclaimer}>
          <View style={styles.disclaimerTextContainer}>
            <Text style={[
              styles.disclaimerText,
              isDarkMode && {
                color: darkThemeColors.textTertiary,
              }
            ]}>
              {getKeyboardShortcutText()}
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    width: '100%',
  },
  container: {
    borderTopWidth: 0,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 160,
    paddingVertical: 24,
    backgroundColor: '#fff',
    width: '100%',
  },
  inputContainerWrapper: {
    borderWidth: 2,
    borderRadius: 26,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web-only properties
      boxShadow: '0 0 10px rgba(84, 198, 235, 0.8)',
    } : {}),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 80,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    maxHeight: 150,
    paddingTop: 8,
    paddingBottom: 8,
    color: '#111827',
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      outlineWidth: 0,
      outlineColor: 'transparent',
      // @ts-ignore - web-only properties
      WebkitAppearance: 'none',
    } : {}),
  },
  sendButton: {
    backgroundColor: '#54C6EB',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  sendIcon: {
    margin: 0,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disclaimerTextContainer: {
    flex: 1,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default ChatInput; 