import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, Alert, TextInput, Platform, Image, ScrollView } from 'react-native';
import { Button, IconButton, Divider, Menu } from 'react-native-paper';
import { Conversation } from '../types';
import { useChat } from '../context/ChatContext';
import { formatDate, getMessagePreview } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CharacterAvatar from './CharacterAvatar';
import CharacterDisplay from './CharacterDisplay';

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
  cardBackground: 'rgba(40, 40, 40, 0.8)',
  activeCardBackground: '#4A4A8C',
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onPress: () => void;
  isDarkMode?: boolean;
  darkThemeColors?: any;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ 
  conversation, 
  isActive, 
  onPress,
  isDarkMode = false,
  darkThemeColors = darkThemeDefaults
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);
  const [menuVisible, setMenuVisible] = useState(false);
  const { updateConversationTitle, deleteConversation } = useChat();
  
  const lastMessage = conversation.messages.length > 0 
    ? conversation.messages[conversation.messages.length - 1] 
    : null;
  
  // Edit title functions
  const handleSave = () => {
    updateConversationTitle(conversation.id, editedTitle);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditedTitle(conversation.title); // Reset to original
    setIsEditing(false);
  };
  
  // Menu functions
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  
  const handleEdit = () => {
    closeMenu();
    setIsEditing(true);
  };
  
  // Delete function - simplified approach
  const handleDelete = () => {
    closeMenu();
    
    // Native confirm dialog for web
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this conversation?')) {
        deleteConversation(conversation.id);
      }
    } 
    // Alert for native platforms
    else {
      Alert.alert(
        'Delete Conversation',
        'Are you sure you want to delete this conversation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => deleteConversation(conversation.id)
          }
        ]
      );
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.conversationItem, 
        isDarkMode && {
          backgroundColor: isActive 
            ? darkThemeColors.activeCardBackground 
            : darkThemeColors.cardBackground
        },
        !isDarkMode && isActive && styles.activeConversation
      ]} 
      onPress={onPress}
      activeOpacity={isEditing ? 1 : 0.7}
      disabled={isEditing}
    >
      <View style={styles.conversationInfo}>
        {isEditing ? (
          <View style={styles.editTitleContainer}>
            <TextInput
              style={[
                styles.titleInput,
                isDarkMode && {
                  borderColor: darkThemeColors.primary,
                  backgroundColor: darkThemeColors.inputBackground,
                  color: darkThemeColors.text
                }
              ]}
              value={editedTitle}
              onChangeText={setEditedTitle}
              autoFocus
              selectTextOnFocus
              maxLength={40}
              placeholderTextColor={isDarkMode ? darkThemeColors.textTertiary : "#9CA3AF"}
            />
            <View style={styles.editButtonsContainer}>
              <IconButton
                icon="check"
                size={20}
                iconColor={darkThemeColors.primary}
                onPress={handleSave}
                style={styles.editButton}
              />
              <IconButton
                icon="close"
                size={20}
                iconColor={isDarkMode ? darkThemeColors.textTertiary : "#6b7280"}
                onPress={handleCancel}
                style={styles.editButton}
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={[
              styles.conversationTitle, 
              isDarkMode && {
                color: isActive ? "#ffffff" : darkThemeColors.text
              },
              !isDarkMode && isActive && styles.activeConversationText
            ]} numberOfLines={1}>
              {conversation.title}
            </Text>
            {lastMessage && (
              <Text style={[
                styles.messagePreview,
                isDarkMode && {
                  color: isActive ? "#e6e6e6" : darkThemeColors.textSecondary
                },
                !isDarkMode && isActive && styles.activeConversationText
              ]} numberOfLines={1}>
                {getMessagePreview(lastMessage.content)}
              </Text>
            )}
            <Text style={[
              styles.conversationDate,
              isDarkMode && {
                color: isActive ? "#cccccc" : darkThemeColors.textTertiary
              },
              !isDarkMode && isActive && styles.activeConversationText
            ]}>
              {formatDate(conversation.updatedAt)}
            </Text>
          </>
        )}
      </View>
      
      {!isEditing && (
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          contentStyle={[
            styles.menuContent,
            isDarkMode && {
              backgroundColor: darkThemeColors.surfaceElevated,
            }
          ]}
          style={styles.menu}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={20}
              iconColor={isActive 
                ? "#fff" 
                : isDarkMode 
                  ? darkThemeColors.textSecondary 
                  : "#6b7280"
              }
              onPress={openMenu}
              style={styles.menuButton}
            />
          }
        >
          <Menu.Item
            leadingIcon="pencil"
            onPress={handleEdit}
            title="Edit title"
            titleStyle={[
              styles.menuItemTitle,
              isDarkMode && {
                color: darkThemeColors.text
              }
            ]}
          />
          <Menu.Item
            leadingIcon="delete"
            onPress={handleDelete}
            title="Delete"
            titleStyle={styles.deleteMenuItemTitle}
          />
        </Menu>
      )}
    </TouchableOpacity>
  );
};

interface ConversationListProps {
  isCollapsed?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({ isCollapsed = false }) => {
  const { 
    conversations, 
    currentConversationId, 
    switchConversation, 
    createNewConversation,
    deleteConversation,
    clearConversations 
  } = useChat();
  
  const { isDark, darkTheme } = useTheme();

  // Simple clear all handler
  const handleClearAll = () => {
    // Native confirm dialog for web
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to clear all conversations? This action cannot be undone.')) {
        clearConversations();
      }
    } 
    // Alert for native platforms
    else {
      Alert.alert(
        'Clear all conversations',
        'Are you sure you want to clear all conversations? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: clearConversations }
        ]
      );
    }
  };

  return (
    <View style={[
      styles.container,
      isDark && {
        backgroundColor: darkTheme.background,
        borderRightColor: darkTheme.border,
        borderRightWidth: 1
      }
    ]}>
      <View style={styles.header}>
        <Image 
          source={isDark 
            ? require('../../assets/bubl_logo_dark.png') 
            : require('../../assets/bubl_logo.png')
          } 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      
      {!isCollapsed && (
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={createNewConversation}
          style={[
            styles.newChatButton,
            isDark && {
              backgroundColor: darkTheme.primary,
            }
          ]}
          labelStyle={styles.newChatButtonLabel}
        >
          New Chat
        </Button>
      )}
      
      {!isCollapsed && (
        <View style={styles.conversationsContainer}>
          {conversations.length > 0 ? (
            <>
              <View style={styles.listHeader}>
                <Text style={[
                  styles.listTitle,
                  isDark && {
                    color: darkTheme.text
                  }
                ]}>
                  Recent conversations
                </Text>
                {conversations.length > 1 && (
                  <TouchableOpacity onPress={handleClearAll}>
                    <Text style={[
                      styles.clearAllText,
                      isDark && {
                        color: darkTheme.textSecondary
                      }
                    ]}>
                      Clear all
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ConversationItem
                    conversation={item}
                    isActive={item.id === currentConversationId}
                    onPress={() => switchConversation(item.id)}
                    isDarkMode={isDark}
                    darkThemeColors={darkTheme}
                  />
                )}
                ItemSeparatorComponent={() => (
                  <Divider style={isDark ? { backgroundColor: darkTheme.border } : {}} />
                )}
                style={styles.list}
              />
            </>
          ) : (
            <View style={[
              styles.emptyState,
              isDark && {
                backgroundColor: 'rgba(30, 30, 30, 0.5)',
                borderRadius: 12,
                marginTop: 20,
                padding: 30
              }
            ]}>
              <Text style={[
                styles.emptyStateTitle,
                isDark && {
                  color: darkTheme.text
                }
              ]}>
                No conversations yet
              </Text>
              <Text style={[
                styles.emptyStateSubtitle,
                isDark && {
                  color: darkTheme.textSecondary
                }
              ]}>
                Start a new conversation to begin chatting with bubl
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Character display at the bottom */}
      <CharacterDisplay 
        isCollapsed={isCollapsed} 
        size={Number(isCollapsed ? 80 : 400)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f7ff',
    borderRightWidth: 0,
    paddingHorizontal: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    paddingVertical: 24,
    borderBottomWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 80,
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10a37f',
  },
  newChatButton: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#54C6EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newChatButtonLabel: {
    fontSize: 16,
  },
  conversationsContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  list: {
    flex: 1,
  },
  characterContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 10,
    marginTop: 10,
  },
  characterContainerCollapsed: {
    marginTop: 'auto',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    borderTopWidth: 0,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  activeConversation: {
    backgroundColor: '#8A89C0',
    borderLeftWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
  },
  messagePreview: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  conversationDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activeConversationText: {
    color: '#fff',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  editTitleContainer: {
    flex: 1,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#54C6EB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    fontSize: 15,
    backgroundColor: '#f8fbff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    margin: 0,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  menuContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    padding: 5,
  },
  menu: {
    marginTop: 35,
    marginLeft: 10,
  },
  menuButton: {
    margin: 0,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  deleteMenuItemTitle: {
    fontSize: 16,
    color: '#ef4444',
  },
});

export default ConversationList; 