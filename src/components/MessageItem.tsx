import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Message } from '../types';

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
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isDarkMode = false,
  darkThemeColors = darkThemeDefaults
}) => {
  const dimensions = useWindowDimensions();
  const isUser = message.role === 'user';
  
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
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : [
              styles.aiMessageText,
              isDarkMode && { color: darkThemeColors.text }
            ]
          ]}>
            {message.content}
          </Text>
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
  }
});

export default MessageItem; 