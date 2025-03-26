import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, useWindowDimensions, Animated, Easing, Platform, Image, Modal as RNModal, ScrollView, TextInput as RNTextInput, Dimensions, Pressable, Switch, TouchableWithoutFeedback } from 'react-native';
import { IconButton, Menu, Button, Avatar, Divider, Modal, Portal, TextInput } from 'react-native-paper';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import LoadingAnimation from '../components/LoadingAnimation';
import ConversationList from '../components/ConversationList';
import { LLMModel, LLMOption } from '../types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPANDED_WIDTH = 300;
const COLLAPSED_WIDTH = 60;
const ANIMATION_DURATION = 300; // Slightly longer for a smoother animation

// Define refined dark mode colors for a more aesthetically pleasing experience
const darkTheme = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceElevated: '#252525',
  surfaceHighlight: '#2a2a2a',
  primary: '#54C6EB',
  primaryDark: '#3ba8ca',
  primaryLight: '#72d1f0',
  text: '#f3f4f6',
  textSecondary: '#b3b8c3',
  textTertiary: '#9ca3af',
  border: '#383838',
  borderLight: '#4d4d4d',
  divider: '#333333',
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  userBubble: '#333',
  aiBubble: '#e6f7ff',
  inputBackground: '#2a2a2a',
  disabled: '#4d4d4d',
};

// Types for the settings panel props
type SettingsPanelProps = {
  visible: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
  darkTheme: any;
  currentLLM: LLMModel;
  setLLM: (model: LLMModel) => void;
  setLlmMenuVisible: (visible: boolean) => void;
  llmMenuVisible: boolean;
  toggleTheme: () => void;
  llmOptions: LLMOption[];
  addLLMOption: (option: Omit<LLMOption, 'id'>) => void;
  editLLMOption: (id: string, updates: Partial<Omit<LLMOption, 'id'>>) => void;
  deleteLLMOption: (id: string) => void;
};

// Create animation value outside component to prevent re-initialization
const settingsPanelAnimation = new Animated.Value(0);
const isAnimationComplete = { current: false };

// Define a simpler SettingsPanel component
const SettingsPanel = (props: SettingsPanelProps) => {
  const {
    visible, 
    onClose, 
    activeTab, 
    setActiveTab, 
    isDark, 
    darkTheme,
    currentLLM,
    setLLM,
    setLlmMenuVisible,
    llmMenuVisible,
    toggleTheme,
    llmOptions,
    addLLMOption,
    editLLMOption,
    deleteLLMOption
  } = props;
  
  // Animation setup
  useEffect(() => {
    if (visible) {
      // Open animation
      Animated.spring(settingsPanelAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }).start();
    } else {
      // Close animation
      Animated.timing(settingsPanelAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);
  
  // Handle LLM selection
  const handleLLMSelection = (model: LLMModel) => {
    console.log(`[LLM Selection] Selected model: ${model}`);
    setLLM(model);
    // Remove the delay to make it feel more instantaneous
    setLlmMenuVisible(false);
  };
  
  // Animations
  const translateY = settingsPanelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });
  
  const opacity = settingsPanelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  // Add state for API keys
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant named bubl.');
  
  // Add state for LLM management
  const [editingLLM, setEditingLLM] = useState<LLMOption | null>(null);
  const [isAddingLLM, setIsAddingLLM] = useState(false);
  const [newLLMName, setNewLLMName] = useState('');
  const [newLLMProvider, setNewLLMProvider] = useState<'OpenAI' | 'Anthropic' | 'Google' | 'Mistral' | 'Other'>('Other');
  const [newLLMDescription, setNewLLMDescription] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  
  // Function to handle saving API keys
  const saveApiKeys = () => {
    console.log('Saving API keys...');
    // Here you would save the keys to secure storage
    // This is just a placeholder - in a real app, you'd use something like
    // AsyncStorage, SecureStore, or a backend API
    
    // Show a saved confirmation
    setKeysSaved(true);
    setTimeout(() => {
      setKeysSaved(false);
    }, 3000);
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch(activeTab) {
      case 'general':
        return (
          <View style={[styles.settingsSection, { minHeight: 500 }]}>
            <Text style={[
              styles.settingsSectionTitle, 
              { color: isDark ? '#e5e7eb' : '#333' }
            ]}>App Settings</Text>
            
            <View style={styles.settingsRow}>
              <Text style={[
                styles.settingLabel, 
                { color: isDark ? '#e5e7eb' : '#333' }
              ]}>Theme</Text>
              <Button 
                mode="outlined" 
                style={[
                  styles.settingButton,
                  { 
                    backgroundColor: isDark 
                      ? 'rgba(84, 198, 235, 0.1)' 
                      : 'rgba(84, 198, 235, 0.05)'
                  }
                ]}
                labelStyle={[
                  styles.settingButtonLabel,
                  isDark && { color: darkTheme.text }
                ]}
                onPress={toggleTheme}
              >
                {isDark ? 'Dark' : 'Light'}
              </Button>
            </View>
            
            <View style={styles.settingsRow}>
              <Text style={[
                styles.settingLabel, 
                { color: isDark ? '#e5e7eb' : '#333' }
              ]}>Font Size</Text>
              <Button 
                mode="outlined" 
                style={[
                  styles.settingButton,
                  { 
                    backgroundColor: isDark 
                      ? 'rgba(84, 198, 235, 0.1)' 
                      : 'rgba(84, 198, 235, 0.05)'
                  }
                ]}
                labelStyle={[
                  styles.settingButtonLabel,
                  isDark && { color: darkTheme.text }
                ]}
              >
                Medium
              </Button>
            </View>
          </View>
        );
        
      case 'ai-config':
        return (
          <View style={{ minHeight: 500 }}>
            <Text style={[styles.settingsSectionTitle, isDark && { color: '#e5e7eb' }]}>
              AI Configuration
            </Text>
            
            {/* Model Selection Section */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsSectionTitle, isDark && { color: '#e5e7eb' }]}>
                Model Selection
              </Text>
              <Text style={[styles.settingDescription, isDark && { color: '#9ca3af' }]}>
                Select which LLM you want to use for generating responses.
              </Text>
              
              <View style={styles.settingsRow}>
                <Text style={[styles.settingLabel, isDark && { color: '#e5e7eb' }]}>Active LLM</Text>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    onPress={() => setLlmMenuVisible(!llmMenuVisible)}
                    style={[
                      styles.llmSelectorButton,
                      isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight },
                    ]}
                  >
                    <Text style={[styles.llmButtonText, isDark && { color: darkTheme.text }]}>
                      {currentLLM}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={isDark ? '#e5e7eb' : '#333'}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                  
                  {llmMenuVisible && (
                    <View style={[
                      styles.llmDropdownContainer,
                      isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight },
                    ]}>
                      {llmOptions.length > 0 ? (
                        llmOptions.map((option) => (
                          <TouchableOpacity
                            key={option.id}
                            style={[
                              styles.dropdownItem,
                              currentLLM === option.name && { backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' },
                            ]}
                            onPress={() => handleLLMSelection(option.name)}
                          >
                            <Text style={[styles.dropdownText, isDark && { color: darkTheme.text }]}>
                              {option.name}
                            </Text>
                            {option.description && (
                              <Text style={[styles.dropdownDescription, isDark && { color: darkTheme.textSecondary }]}>
                                {option.description}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.dropdownItem}>
                          <Text style={[styles.dropdownText, isDark && { color: darkTheme.text }]}>
                            No models available
                          </Text>
                          <Text style={[styles.dropdownDescription, isDark && { color: darkTheme.textSecondary }]}>
                            Add a new model below
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            {/* LLM Management Section */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsSectionTitle, isDark && { color: '#e5e7eb' }]}>
                Manage LLM Options
              </Text>
              <Text style={[styles.settingDescription, isDark && { color: '#9ca3af' }]}>
                Add, edit, or remove LLM options.
              </Text>
              
              {/* List of LLM options */}
              <View style={{ marginVertical: 16 }}>
                {llmOptions.length > 0 ? (
                  llmOptions.map((option) => (
                    <View 
                      key={option.id} 
                      style={[
                        styles.llmOptionItem,
                        isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.llmOptionName, isDark && { color: darkTheme.text }]}>
                          {option.name}
                        </Text>
                        {option.description && (
                          <Text style={[styles.llmOptionDescription, isDark && { color: darkTheme.textSecondary }]}>
                            {option.description}
                          </Text>
                        )}
                        <Text style={[styles.llmOptionProvider, isDark && { color: darkTheme.textTertiary }]}>
                          Provider: {option.provider}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            styles.iconButton,
                            isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight },
                          ]}
                          onPress={() => {
                            setEditingLLM(option);
                            setNewLLMName(option.name);
                            setNewLLMProvider(option.provider);
                            setNewLLMDescription(option.description || '');
                          }}
                        >
                          <Ionicons name="pencil" size={16} color={isDark ? '#e5e7eb' : '#333'} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.iconButton,
                            isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight },
                          ]}
                          onPress={() => {
                            // Confirm before deleting
                            if (confirm(`Are you sure you want to delete ${option.name}?`)) {
                              deleteLLMOption(option.id);
                            }
                          }}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[
                    styles.llmOptionItem,
                    isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight },
                    { justifyContent: 'center', alignItems: 'center', padding: 24 }
                  ]}>
                    <Text style={[styles.llmOptionName, isDark && { color: darkTheme.text }]}>
                      No LLM models configured
                    </Text>
                    <Text style={[styles.llmOptionDescription, isDark && { color: darkTheme.textSecondary }, { textAlign: 'center', marginTop: 8 }]}>
                      Add a new model using the button below
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Add LLM button */}
              <Button
                mode="contained"
                onPress={() => setIsAddingLLM(true)}
                style={[
                  styles.addLLMButton,
                  isDark && { backgroundColor: '#54C6EB' },
                ]}
                icon="plus"
              >
                Add New LLM
              </Button>
              
              {/* Add Reset to Default button */}
              <Button
                mode="outlined"
                onPress={() => {
                  // Show confirmation dialog
                  if (confirm('This will reset all LLM options to default. Customizations will be lost. Continue?')) {
                    // Clear the stored LLM options by setting an empty array
                    // The app will load defaults on next startup
                    AsyncStorage.setItem('llmOptions', JSON.stringify([]));
                    // Reload the page to apply changes
                    if (typeof window !== 'undefined') {
                      window.location.reload();
                    }
                  }
                }}
                style={{
                  borderRadius: 12,
                  marginTop: 12,
                  borderColor: isDark ? darkTheme.border : '#e5e7eb',
                }}
                icon="refresh"
              >
                Reset to Default LLMs
              </Button>
            </View>
            
            {/* API Keys Section */}
            <View style={[styles.settingsSection, { marginBottom: 40 }]}>
              <Text style={[styles.settingsSectionTitle, isDark && { color: '#e5e7eb' }]}>
                API Keys
              </Text>
              <Text style={[styles.settingDescription, isDark && { color: '#9ca3af' }]}>
                Enter your API keys to use with different LLM providers.
              </Text>
              
              <View style={styles.settingsRow}>
                <View style={styles.apiKeyContainer}>
                  <Text style={[styles.settingLabel, isDark && { color: '#e5e7eb' }]}>OpenAI API Key</Text>
                  <TextInput
                    value={openaiKey}
                    onChangeText={setOpenaiKey}
                    placeholder="Enter OpenAI API key"
                    secureTextEntry
                    style={[
                      styles.apiKeyInput,
                      isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight, color: darkTheme.text },
                    ]}
                    placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                  />
                </View>
              </View>
              
              <View style={styles.settingsRow}>
                <View style={styles.apiKeyContainer}>
                  <Text style={[styles.settingLabel, isDark && { color: '#e5e7eb' }]}>Anthropic API Key</Text>
                  <TextInput
                    value={anthropicKey}
                    onChangeText={setAnthropicKey}
                    placeholder="Enter Anthropic API key"
                    secureTextEntry
                    style={[
                      styles.apiKeyInput,
                      isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight, color: darkTheme.text },
                    ]}
                    placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                  />
                </View>
              </View>
              
              <View style={styles.settingsRow}>
                <View style={styles.apiKeyContainer}>
                  <Text style={[styles.settingLabel, isDark && { color: '#e5e7eb' }]}>Mistral API Key</Text>
                  <TextInput
                    value={mistralKey}
                    onChangeText={setMistralKey}
                    placeholder="Enter Mistral API key"
                    secureTextEntry
                    style={[
                      styles.apiKeyInput,
                      isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight, color: darkTheme.text },
                    ]}
                    placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                  />
                </View>
              </View>
              
              <View style={styles.apiKeySaveContainer}>
                <Button
                  mode="contained"
                  onPress={saveApiKeys}
                  style={{ backgroundColor: '#54C6EB', borderRadius: 12 }}
                >
                  Save API Keys
                </Button>
              </View>
            </View>

            {/* System Prompt */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsSectionTitle, isDark && { color: '#e5e7eb' }]}>
                System Prompt
              </Text>
              <Text style={[styles.settingDescription, isDark && { color: '#9ca3af' }]}>
                Customize the system prompt used for all conversations.
              </Text>
              
              <View style={styles.settingsRow}>
                <TextInput
                  value={systemPrompt}
                  onChangeText={setSystemPrompt}
                  style={[
                    styles.apiKeyInput,
                    { minHeight: 100 },
                    isDark && { backgroundColor: darkTheme.surfaceElevated, borderColor: darkTheme.borderLight, color: darkTheme.text },
                  ]}
                  placeholder="Enter system prompt"
                  placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                  multiline
                />
              </View>
              
              <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
                <Button
                  mode="contained"
                  onPress={saveApiKeys} // We'll use the same function to save system prompt
                  style={{ backgroundColor: '#54C6EB', borderRadius: 12 }}
                >
                  Save System Prompt
                </Button>
              </View>
            </View>
            
            {/* Render the LLM modal if adding or editing */}
            {isAddingLLM || editingLLM !== null ? (
              <Modal
                visible={isAddingLLM || editingLLM !== null}
                onDismiss={() => {
                  setEditingLLM(null);
                  setIsAddingLLM(false);
                  setNewLLMName('');
                  setNewLLMProvider('Other');
                  setNewLLMDescription('');
                }}
                contentContainerStyle={[
                  {
                    backgroundColor: isDark ? darkTheme.surfaceElevated : 'white',
                    borderRadius: 24,
                    padding: 28,
                    margin: 20,
                    maxWidth: 500,
                    width: '90%',
                    alignSelf: 'center',
                  }
                ]}
              >
                <View>
                  <Text style={[
                    styles.settingsSectionTitle,
                    { marginBottom: 24, color: isDark ? '#e5e7eb' : '#333' }
                  ]}>{editingLLM !== null ? 'Edit LLM' : 'Add New LLM'}</Text>
                  
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[
                      styles.settingLabel,
                      { color: isDark ? '#e5e7eb' : '#333', marginBottom: 8 }
                    ]}>LLM Name</Text>
                    <TextInput
                      value={newLLMName}
                      onChangeText={setNewLLMName}
                      style={[
                        styles.apiKeyInput,
                        isDark && {
                          backgroundColor: darkTheme.surfaceElevated,
                          borderColor: darkTheme.borderLight,
                          color: darkTheme.text,
                        }
                      ]}
                      placeholder="Enter LLM name"
                      placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                    />
                  </View>
                  
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[
                      styles.settingLabel,
                      { color: isDark ? '#e5e7eb' : '#333', marginBottom: 8 }
                    ]}>Provider</Text>
                    
                    <View style={{ position: 'relative' }}>
                      <Button
                        mode="outlined"
                        onPress={() => setShowProviderDropdown(!showProviderDropdown)}
                        style={[
                          styles.apiKeyInput,
                          { justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row' },
                          isDark && {
                            backgroundColor: darkTheme.surfaceElevated,
                            borderColor: darkTheme.borderLight,
                          }
                        ]}
                        contentStyle={{ flexDirection: 'row-reverse' }}
                        icon={() => (
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={isDark ? darkTheme.text : '#333'}
                          />
                        )}
                      >
                        {newLLMProvider}
                      </Button>
                      
                      {showProviderDropdown && (
                        <View style={[
                          {
                            position: 'absolute',
                            top: 60,
                            left: 0,
                            right: 0,
                            backgroundColor: isDark ? darkTheme.surfaceElevated : 'white',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: isDark ? darkTheme.border : '#e5e7eb',
                            zIndex: 1000,
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            padding: 5,
                          }
                        ]}>
                          {(['OpenAI', 'Anthropic', 'Google', 'Mistral', 'Other'] as const).map(provider => (
                            <TouchableOpacity
                              key={provider}
                              style={[
                                {
                                  padding: 12,
                                  borderRadius: 8,
                                  marginVertical: 2,
                                },
                                newLLMProvider === provider && {
                                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff',
                                }
                              ]}
                              onPress={() => {
                                setNewLLMProvider(provider);
                                setShowProviderDropdown(false);
                              }}
                            >
                              <Text style={{ color: isDark ? darkTheme.text : '#333' }}>
                                {provider}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={{ marginBottom: 24 }}>
                    <Text style={[
                      styles.settingLabel,
                      { color: isDark ? '#e5e7eb' : '#333', marginBottom: 8 }
                    ]}>Description (Optional)</Text>
                    <TextInput
                      value={newLLMDescription}
                      onChangeText={setNewLLMDescription}
                      style={[
                        styles.textAreaInput,
                        { minHeight: 80 },
                        isDark && {
                          backgroundColor: darkTheme.surfaceElevated,
                          borderColor: darkTheme.borderLight,
                          color: darkTheme.text,
                        }
                      ]}
                      placeholder="Enter a short description"
                      placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                      multiline
                    />
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setEditingLLM(null);
                        setIsAddingLLM(false);
                        setNewLLMName('');
                        setNewLLMProvider('Other');
                        setNewLLMDescription('');
                      }}
                      style={[
                        {
                          borderColor: isDark ? darkTheme.border : '#e5e7eb',
                          borderRadius: 12,
                        }
                      ]}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      mode="contained"
                      onPress={() => {
                        if (editingLLM !== null) {
                          // Editing existing LLM
                          editLLMOption(editingLLM.id, {
                            name: newLLMName,
                            provider: newLLMProvider,
                            description: newLLMDescription,
                          });
                        } else {
                          // Adding new LLM
                          addLLMOption({
                            name: newLLMName,
                            provider: newLLMProvider,
                            description: newLLMDescription,
                            apiKeyRequired: true,
                          });
                        }
                        
                        // Reset state and close modal
                        setEditingLLM(null);
                        setIsAddingLLM(false);
                        setNewLLMName('');
                        setNewLLMProvider('Other');
                        setNewLLMDescription('');
                      }}
                      style={[
                        {
                          backgroundColor: '#54C6EB',
                          borderRadius: 12,
                        }
                      ]}
                      disabled={!newLLMName.trim()}
                    >
                      {editingLLM !== null ? 'Update' : 'Add'}
                    </Button>
                  </View>
                </View>
              </Modal>
            ) : null}
          </View>
        );
        
      case 'privacy':
        return (
          <View style={[styles.settingsSection, { minHeight: 500 }]}>
            <Text style={[
              styles.settingsSectionTitle, 
              { color: isDark ? '#e5e7eb' : '#333' }
            ]}>Privacy Settings</Text>
            
            <View style={styles.settingsRow}>
              <Text style={[
                styles.settingLabel, 
                { color: isDark ? '#e5e7eb' : '#333' }
              ]}>Chat History</Text>
              <Button 
                mode="outlined" 
                style={[
                  styles.settingButton,
                  { 
                    backgroundColor: isDark 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : '#fee2e2',
                  }
                ]}
                labelStyle={{ 
                  color: '#ef4444',
                  fontWeight: '500'
                }}
                icon={() => (
                  <Ionicons 
                    name="trash-outline" 
                    size={16} 
                    color="#ef4444" 
                    style={{ marginRight: 8 }}
                  />
                )}
              >
                Clear All
              </Button>
            </View>
            
            <View style={styles.settingsRow}>
              <Text style={[
                styles.settingLabel, 
                { color: isDark ? '#e5e7eb' : '#333' }
              ]}>Data Collection</Text>
              <Button 
                mode="outlined" 
                style={[
                  styles.settingButton,
                  { 
                    backgroundColor: isDark 
                      ? 'rgba(84, 198, 235, 0.1)' 
                      : 'rgba(84, 198, 235, 0.05)'
                  }
                ]}
                labelStyle={[
                  styles.settingButtonLabel,
                  isDark && { color: darkTheme.text }
                ]}
              >
                Opt Out
              </Button>
            </View>
            
            {/* Add placeholder content to ensure consistent height with other tabs */}
            <View style={{ height: 200 }} />
          </View>
        );
        
      default:
        return null;
    }
  };
  
  // Only render if visible
  if (!visible) return null;
  
  return (
    <RNModal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      transparent
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { 
            opacity,
            backgroundColor: isDark 
              ? 'rgba(0, 0, 0, 0.75)' 
              : 'rgba(0, 0, 0, 0.6)',
          }
        ]}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          <TouchableOpacity 
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            activeOpacity={1}
            onPress={onClose}
          />
          
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View 
              style={[
                styles.settingsPanel,
                { 
                  transform: [{ translateY }],
                  backgroundColor: isDark ? darkTheme.surface : '#fff',
                  borderColor: isDark ? darkTheme.border : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                }
              ]}
            >
              <View style={{flex: 1}}>
                {/* Improved Header */}
                <View style={[styles.settingsHeader, 
                  isDark && { 
                    borderBottomColor: darkTheme.border,
                  }
                ]}>
                  <Text style={[styles.settingsPanelTitle, 
                    { color: isDark ? '#f3f4f6' : '#333' }
                  ]}>Settings</Text>
                  <IconButton
                    icon="close"
                    size={28}
                    onPress={onClose}
                    style={styles.settingsCloseButton}
                    iconColor="#54C6EB"
                  />
                </View>
                
                {/* Improved Tab Navigation */}
                <View style={[styles.tabsContainer, 
                  isDark && { 
                    borderBottomColor: darkTheme.border 
                  }
                ]}>
                  <TouchableOpacity 
                    style={[
                      styles.tab, 
                      activeTab === 'general' && {
                        borderBottomColor: '#54C6EB',
                      },
                      isDark && { 
                        borderBottomColor: activeTab === 'general' 
                          ? darkTheme.primary 
                          : 'transparent'
                      }
                    ]}
                    onPress={() => setActiveTab('general')}
                  >
                    <Text style={[
                      styles.tabText, 
                      activeTab === 'general' && styles.activeTabText,
                      isDark && { 
                        color: activeTab === 'general' 
                          ? darkTheme.primary 
                          : darkTheme.textSecondary 
                      }
                    ]}>General</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.tab, 
                      activeTab === 'ai-config' && {
                        borderBottomColor: '#54C6EB',
                      },
                      isDark && { 
                        borderBottomColor: activeTab === 'ai-config' 
                          ? darkTheme.primary 
                          : 'transparent'
                      }
                    ]}
                    onPress={() => setActiveTab('ai-config')}
                  >
                    <Text style={[
                      styles.tabText, 
                      activeTab === 'ai-config' && styles.activeTabText,
                      isDark && { 
                        color: activeTab === 'ai-config' 
                          ? darkTheme.primary 
                          : darkTheme.textSecondary 
                      }
                    ]}>AI Config</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.tab, 
                      activeTab === 'privacy' && {
                        borderBottomColor: '#54C6EB',
                      },
                      isDark && { 
                        borderBottomColor: activeTab === 'privacy' 
                          ? darkTheme.primary 
                          : 'transparent'
                      }
                    ]}
                    onPress={() => setActiveTab('privacy')}
                  >
                    <Text style={[
                      styles.tabText, 
                      activeTab === 'privacy' && styles.activeTabText,
                      isDark && { 
                        color: activeTab === 'privacy' 
                          ? darkTheme.primary 
                          : darkTheme.textSecondary 
                      }
                    ]}>Privacy</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Content Area */}
                <View style={[styles.settingsContentWrapper, { flex: 1 }]}>
                  <ScrollView 
                    style={styles.settingsContent}
                    contentContainerStyle={styles.settingsContentContainer}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle={isDark ? "white" : "black"}
                    bounces={true}
                    overScrollMode="always"
                    nestedScrollEnabled={true}
                  >
                    {renderTabContent()}
                  </ScrollView>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        {/* LLM Dropdown - Rendered as a floating overlay separate from the content */}
        {llmMenuVisible && activeTab === 'ai-config' && (
          <View 
            style={[
              styles.llmDropdownOverlay,
              {
                backgroundColor: isDark ? darkTheme.surfaceElevated : '#fff',
                borderColor: isDark ? darkTheme.border : '#e5e7eb',
                borderWidth: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
              }
            ]}
          >
            {/* Claude options with improved styling */}
            <TouchableOpacity 
              style={[
                styles.dropdownItem,
                currentLLM === 'Claude 3 Opus' && { 
                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' 
                }
              ]}
              onPress={() => handleLLMSelection('Claude 3 Opus')}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: isDark ? darkTheme.text : '#333',
                fontWeight: currentLLM === 'Claude 3 Opus' ? '700' : '500',
                fontSize: 16
              }}>Claude 3 Opus</Text>
              {currentLLM === 'Claude 3 Opus' && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={isDark ? '#54C6EB' : '#54C6EB'} 
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.dropdownItem,
                currentLLM === 'Claude 3 Sonnet' && { 
                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' 
                }
              ]}
              onPress={() => handleLLMSelection('Claude 3 Sonnet')}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: isDark ? darkTheme.text : '#333',
                fontWeight: currentLLM === 'Claude 3 Sonnet' ? '700' : '500',
                fontSize: 16
              }}>Claude 3 Sonnet</Text>
              {currentLLM === 'Claude 3 Sonnet' && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={isDark ? '#54C6EB' : '#54C6EB'} 
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.dropdownItem,
                currentLLM === 'Claude 3 Haiku' && { 
                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' 
                }
              ]}
              onPress={() => handleLLMSelection('Claude 3 Haiku')}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: isDark ? darkTheme.text : '#333',
                fontWeight: currentLLM === 'Claude 3 Haiku' ? '700' : '500',
                fontSize: 16
              }}>Claude 3 Haiku</Text>
              {currentLLM === 'Claude 3 Haiku' && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={isDark ? '#54C6EB' : '#54C6EB'} 
                />
              )}
            </TouchableOpacity>
            
            <Divider style={{ marginVertical: 6, backgroundColor: isDark ? darkTheme.border : '#e5e7eb' }} />
            
            {/* GPT options with improved styling */}
            <TouchableOpacity 
              style={[
                styles.dropdownItem,
                currentLLM === 'GPT-4o' && { 
                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' 
                }
              ]}
              onPress={() => handleLLMSelection('GPT-4o')}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: isDark ? darkTheme.text : '#333',
                fontWeight: currentLLM === 'GPT-4o' ? '700' : '500',
                fontSize: 16
              }}>GPT-4o</Text>
              {currentLLM === 'GPT-4o' && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={isDark ? '#54C6EB' : '#54C6EB'} 
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.dropdownItem,
                currentLLM === 'GPT-4' && { 
                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' 
                }
              ]}
              onPress={() => handleLLMSelection('GPT-4')}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: isDark ? darkTheme.text : '#333',
                fontWeight: currentLLM === 'GPT-4' ? '700' : '500',
                fontSize: 16
              }}>GPT-4</Text>
              {currentLLM === 'GPT-4' && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={isDark ? '#54C6EB' : '#54C6EB'} 
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.dropdownItem,
                currentLLM === 'GPT-3.5' && { 
                  backgroundColor: isDark ? 'rgba(84, 198, 235, 0.2)' : '#e6f7ff' 
                }
              ]}
              onPress={() => handleLLMSelection('GPT-3.5')}
              activeOpacity={0.7}
            >
              <Text style={{ 
                color: isDark ? darkTheme.text : '#333',
                fontWeight: currentLLM === 'GPT-3.5' ? '700' : '500',
                fontSize: 16
              }}>GPT-3.5</Text>
              {currentLLM === 'GPT-3.5' && (
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color={isDark ? '#54C6EB' : '#54C6EB'} 
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </RNModal>
  );
};

// Define the Message type
type Message = {
  id?: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: number;
};

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Get LLM options from ChatContext
  const { 
    currentConversationId, 
    conversations, 
    isLoading, 
    currentLLM: contextLLM, 
    setLLM: setContextLLM,
    llmOptions, 
    addLLMOption, 
    editLLMOption, 
    deleteLLMOption, 
    createNewConversation, 
    updateConversationTitle 
  } = useChat();
  
  const [currentLLM, setCurrentLLM] = useState<LLMModel>(contextLLM || 'Claude 3 Sonnet');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [llmMenuVisible, setLlmMenuVisible] = useState(false);
  
  // Set LLM function to update both the local state and context
  const setLLM = (model: LLMModel) => {
    setCurrentLLM(model);
    setContextLLM(model);
  };
  
  // Theme
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(!isDark);
  
  // Create refs to measure components
  const llmButtonRef = useRef(null);
  
  // ScrollView ref
  const scrollViewRef = useRef<ScrollView>(null);
  
  // State for account menu dropdown
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  
  // Debug useEffect to track LLM menu visibility changes
  useEffect(() => {
    console.log(`[LLM-MENU] Menu visibility changed to: ${llmMenuVisible}`);
  }, [llmMenuVisible]);
  
  // Add new state for handling the account button hover effect
  const [isAccountHovered, setIsAccountHovered] = useState(false);
  const accountNameWidth = useRef(new Animated.Value(0)).current;
  const accountNameOpacity = useRef(new Animated.Value(0)).current;
  
  // Add new state for options dropdown
  const [titleOptionsVisible, setTitleOptionsVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleEditText, setTitleEditText] = useState('');
  const optionsHeight = useRef(new Animated.Value(0)).current;
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  
  // Get theme from context
  const { theme } = useTheme();
  
  // Get position of the settings panel for accurate dropdown positioning
  const settingsPanelRef = useRef<View>(null);
  const [settingsPanelPosition, setSettingsPanelPosition] = useState({ x: 0, y: 0 });
  
  // Measure the settings panel position
  useEffect(() => {
    if (settingsVisible && activeTab === 'ai-config') {
      setTimeout(() => {
        if (settingsPanelRef.current) {
          settingsPanelRef.current.measureInWindow((x, y, width, height) => {
            console.log('Settings panel position:', { x, y, width, height });
            setSettingsPanelPosition({ x, y });
          });
        }
      }, 300); // Delay to ensure panel is fully rendered
    }
  }, [settingsVisible, activeTab]);
  
  // Handle LLM selection in the ChatScreen component
  const handleLLMSelection = (model: LLMModel) => {
    console.log(`[LLM] Selected model: ${model}`);
    setCurrentLLM(model);
    // Provide visual feedback by briefly highlighting the selected item
    setSelectedItem(model);
    
    // Close after a short delay to provide visual feedback
    setTimeout(() => {
      setSelectedItem(null);
    }, 1000);
  };
  
  // Add state for tracking currently selected item (for visual feedback)
  const [selectedItem, setSelectedItem] = useState<LLMModel | null>(null);
  
  // Log llmMenuVisible changes
  useEffect(() => {
    console.log('[LLM-MENU] Menu visibility changed to:', llmMenuVisible);
  }, [llmMenuVisible]);
  
  // Add a renderCount to track re-renders of the Menu component
  const llmMenuRenderCount = useRef(0);
  
  // Handle initial setup and window resizing
  const dimensions = useWindowDimensions();
  const [showSidebar, setShowSidebar] = useState(dimensions.width > 768);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Create a ref for the message list to enable auto-scrolling
  const flatListRef = useRef<FlatList>(null);
  
  // Use Animated Values with useRef to avoid recreating them
  const animatedValues = useRef({
    width: new Animated.Value(EXPANDED_WIDTH),
    contentOpacity: new Animated.Value(1),
    collapsedOpacity: new Animated.Value(0),
    // Add a value for main content margin
    mainContentMargin: new Animated.Value(dimensions.width > 768 ? EXPANDED_WIDTH : 0),
  }).current;
  
  // Handle initial setup and window resizing
  useEffect(() => {
    // Show sidebar automatically on larger screens
    const handleResize = () => {
      const shouldShowSidebar = dimensions.width > 768;
      setShowSidebar(shouldShowSidebar);
      
      // Reset collapsed state when screen size changes
      if (dimensions.width <= 768) {
        setIsCollapsed(false);
        // Reset animated values when the sidebar is hidden
        animatedValues.width.setValue(EXPANDED_WIDTH);
        animatedValues.contentOpacity.setValue(1);
        animatedValues.collapsedOpacity.setValue(0);
        animatedValues.mainContentMargin.setValue(0);
      } else {
        // For larger screens, set margin based on sidebar state
        animatedValues.mainContentMargin.setValue(isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
      }
    };
    
    handleResize();
    setIsInitialized(true);
  }, [dimensions.width]);
  
  // Animation to collapse/expand sidebar - Only run after initialization
  useEffect(() => {
    // Skip animation on first render
    if (!isInitialized) return;
    
    const { width, contentOpacity, collapsedOpacity, mainContentMargin } = animatedValues;
    
    // Clean up any running animations
    width.stopAnimation();
    contentOpacity.stopAnimation();
    collapsedOpacity.stopAnimation();
    mainContentMargin.stopAnimation();

    if (isCollapsed) {
      // Collapsing: Run animations in parallel for smoother effect
        Animated.parallel([
        // Fade content transitions
          Animated.timing(contentOpacity, {
            toValue: 0,
            duration: ANIMATION_DURATION * 0.6,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(collapsedOpacity, {
            toValue: 1,
            duration: ANIMATION_DURATION * 0.6,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic),
          }),
        // Width and margin transitions
          Animated.timing(width, {
            toValue: COLLAPSED_WIDTH,
          duration: ANIMATION_DURATION,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.cubic),
          }),
        // Animate main content margin
          Animated.timing(mainContentMargin, {
            toValue: dimensions.width > 768 ? COLLAPSED_WIDTH : 0,
          duration: ANIMATION_DURATION,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.cubic),
          }),
      ]).start();
    } else {
      // Expanding: Run animations in parallel for smoother effect
        Animated.parallel([
        // Fade content transitions
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION * 0.6,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(collapsedOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION * 0.6,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        // Width and margin transitions
          Animated.timing(width, {
            toValue: EXPANDED_WIDTH,
          duration: ANIMATION_DURATION,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.cubic),
          }),
        // Animate main content margin
          Animated.timing(mainContentMargin, {
            toValue: dimensions.width > 768 ? EXPANDED_WIDTH : 0,
          duration: ANIMATION_DURATION,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.cubic),
          }),
      ]).start();
    }
  }, [isCollapsed, animatedValues, dimensions.width, isInitialized]);
  
  // Animation for account button hover effect
  useEffect(() => {
    if (isAccountHovered) {
        Animated.parallel([
        Animated.timing(accountNameWidth, {
          toValue: 100,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(accountNameOpacity, {
            toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(accountNameWidth, {
          toValue: 0,
          duration: 200,
            easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
          }),
        Animated.timing(accountNameOpacity, {
            toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isAccountHovered]);
  
  // Find the current conversation from the conversations array
  const currentConversation = currentConversationId 
    ? conversations.find(conv => conv.id === currentConversationId)
    : null;
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (currentConversation?.messages.length && flatListRef.current) {
      // Use a small timeout to ensure the layout is complete before scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentConversation?.messages.length]);
  
  const toggleCollapse = () => {
    // We'll only use the isCollapsed state to control the animation
    // and keep the sidebar always visible but at different widths
    setIsCollapsed(!isCollapsed);
  };
  
  // Interpolate translateX for the collapsed content to slide in from right
  const collapsedTranslateX = animatedValues.collapsedOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  
  // Interpolate translateX for the expanded content
  const expandedTranslateX = animatedValues.contentOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });
  
  // Main content margin or position based on sidebar state
  const mainContentStyle = dimensions.width > 768 
    ? { marginLeft: animatedValues.mainContentMargin } 
    : {};
  
  // Interpolate translateX for the sidebar to slide off screen when collapsed
  const sidebarTranslateX = animatedValues.width.interpolate({
    inputRange: [COLLAPSED_WIDTH, EXPANDED_WIDTH],
    outputRange: [-EXPANDED_WIDTH, 0],
    extrapolate: 'clamp',
  });
  
  // Add a parent wrapper component for both the sidebar and the button
  const SidebarWithButton = () => (
    <>
      {/* Sidebar for conversation list */}
        <Animated.View 
          style={[
            styles.sidebar, 
            dimensions.width <= 768 && styles.absoluteSidebar,
            { 
              width: animatedValues.width,
              transform: [{ translateX: sidebarTranslateX }],
              backgroundColor: isDark ? darkTheme.surface : '#e6f7ff',
              borderRightWidth: isDark ? 1 : 0,
              borderRightColor: darkTheme.border,
              shadowColor: isDark ? '#000' : '#000',
              shadowOpacity: isDark ? 0.3 : 0.1,
            }
          ]}
        >
          {/* Expanded sidebar content */}
          <Animated.View 
            style={[
              styles.expandedContent,
              { 
                opacity: animatedValues.contentOpacity,
                transform: [{ translateX: expandedTranslateX }],
                // Hide completely when opacity is 0 to avoid interaction
                pointerEvents: isCollapsed ? 'none' : 'auto'
              }
            ]}
          >
            <ConversationList />
            {dimensions.width <= 768 && (
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowSidebar(false)}
                style={styles.closeSidebarButton}
              />
            )}
            <IconButton
              icon="chevron-left"
              size={24}
              onPress={toggleCollapse}
              style={styles.collapseButton}
              mode="contained"
            containerColor="#54C6EB"
              iconColor="#fff"
            />
        </Animated.View>
          </Animated.View>
          
      {/* Toggle button - always visible */}
          <Animated.View 
            style={[
          styles.toggleButtonWrapper,
              { 
                opacity: animatedValues.collapsedOpacity,
            // Use a measured value for X translation to ensure smooth animation
            transform: [{ translateX: animatedValues.collapsedOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0], // Slide from left
              extrapolate: 'clamp'
            }) }],
          }
        ]}
      >
              <IconButton
          icon="menu"
                size={24}
          onPress={() => {
            setIsCollapsed(false);
          }}
          style={styles.persistentToggleButton}
                mode="contained"
          containerColor={darkTheme.primary}
                iconColor="#fff"
              />
      </Animated.View>
    </>
  );
  
  // Implement ProfilePanel component
  const ProfilePanel = () => {
    const translateY = useRef(new Animated.Value(1000)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      if (profileVisible) {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 300,
            easing: Easing.in(Easing.exp),
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [profileVisible]);
    
    return (
      <RNModal
        visible={profileVisible}
        onRequestClose={() => setProfileVisible(false)}
        animationType="none"
        transparent
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalTouchable} 
            activeOpacity={1}
            onPress={() => setProfileVisible(false)}
          >
            <Animated.View
              style={[
                styles.settingsPanel,
                { transform: [{ translateY }] }
              ]}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()} 
                style={{flex: 1}}
              >
                <View style={styles.settingsHeader}>
                  <Text style={styles.settingsPanelTitle}>Profile</Text>
                  <IconButton
                    icon="close"
                    size={24}
                    onPress={() => setProfileVisible(false)}
                    style={styles.settingsCloseButton}
                    iconColor="#54C6EB"
                  />
                </View>
                
                {/* Fixed height content container with scrolling */}
                <View style={styles.settingsContentWrapper}>
                  <ScrollView 
                    style={styles.settingsContent}
                    contentContainerStyle={styles.settingsContentContainer}
                    showsVerticalScrollIndicator={true}
                  >
                    <View style={styles.profileHeader}>
                      <Avatar.Icon 
                        size={100} 
                        icon="account" 
                        color="#fff" 
                        style={[
                          styles.profileAvatar,
                          isDark && { backgroundColor: darkTheme.primaryDark }
                        ]} 
                      />
                      <Text style={[styles.profileName, { color: isDark ? '#f3f4f6' : '#333' }]}>John Doe</Text>
                      <Text style={[styles.profileEmail, { color: isDark ? '#9ca3af' : '#6b7280' }]}>john.doe@example.com</Text>
                    </View>
                    
                    <Divider style={styles.profileDivider} />
                    
                    <View style={styles.settingsSection}>
                      <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Personal Information</Text>
                      
                      <View style={styles.profileInfoRow}>
                        <Text style={[styles.profileLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Name</Text>
                        <TextInput 
                          style={[
                            styles.profileInput,
                            isDark && {
                              borderColor: darkTheme.borderLight,
                              backgroundColor: darkTheme.surfaceElevated,
                              color: darkTheme.text,
                            }
                          ]}
                          value="John Doe"
                          placeholder="Enter your name"
                        />
                      </View>
                      
                      <View style={styles.profileInfoRow}>
                        <Text style={[styles.profileLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Email</Text>
                        <TextInput 
                          style={[
                            styles.profileInput,
                            isDark && {
                              borderColor: darkTheme.borderLight,
                              backgroundColor: darkTheme.surfaceElevated,
                              color: darkTheme.text,
                            }
                          ]}
                          value="john.doe@example.com"
                          placeholder="Enter your email"
                          keyboardType="email-address"
                        />
                      </View>
                      
                      <View style={styles.profileInfoRow}>
                        <Text style={[styles.profileLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Username</Text>
                        <TextInput 
                          style={[
                            styles.profileInput,
                            isDark && {
                              borderColor: darkTheme.borderLight,
                              backgroundColor: darkTheme.surfaceElevated,
                              color: darkTheme.text,
                            }
                          ]}
                          value="johndoe"
                          placeholder="Enter your username"
                        />
                      </View>
                    </View>
                    
                    <View style={styles.settingsSection}>
                      <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Password</Text>
                      
                      <View style={styles.profileInfoRow}>
                        <Text style={[styles.profileLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Current Password</Text>
                        <TextInput 
                          style={[
                            styles.profileInput,
                            isDark && {
                              borderColor: darkTheme.borderLight,
                              backgroundColor: darkTheme.surfaceElevated,
                              color: darkTheme.text,
                            }
                          ]}
                          placeholder="Enter current password"
                          secureTextEntry
                        />
                      </View>
                      
                      <View style={styles.profileInfoRow}>
                        <Text style={[styles.profileLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>New Password</Text>
                        <TextInput 
                          style={[
                            styles.profileInput,
                            isDark && {
                              borderColor: darkTheme.borderLight,
                              backgroundColor: darkTheme.surfaceElevated,
                              color: darkTheme.text,
                            }
                          ]}
                          placeholder="Enter new password"
                          secureTextEntry
                        />
                      </View>
                      
                      <View style={styles.profileInfoRow}>
                        <Text style={[styles.profileLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Confirm Password</Text>
                        <TextInput 
                          style={[
                            styles.profileInput,
                            isDark && {
                              borderColor: darkTheme.borderLight,
                              backgroundColor: darkTheme.surfaceElevated,
                              color: darkTheme.text,
                            }
                          ]}
                          placeholder="Confirm new password"
                          secureTextEntry
                        />
                      </View>
                    </View>
                    
                    <View style={styles.profileButtonContainer}>
                      <TouchableOpacity style={styles.saveButton}>
                        <Text style={[styles.saveButtonText, { color: isDark ? '#f3f4f6' : '#333' }]}>Save Changes</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </RNModal>
    );
  };
  
  // Add function to toggle options visibility
  const toggleTitleOptions = () => {
    setTitleOptionsVisible(!titleOptionsVisible);
    
    Animated.parallel([
      Animated.timing(optionsHeight, {
        toValue: titleOptionsVisible ? 0 : 160,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(optionsOpacity, {
        toValue: titleOptionsVisible ? 0 : 1,
        duration: 250,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Add function to handle title editing
  const handleTitleEdit = () => {
    setEditingTitle(true);
    setTitleEditText(currentConversation?.title || '');
  };

  // Add function to save edited title
  const saveTitleEdit = () => {
    if (currentConversation?.id && titleEditText.trim()) {
      updateConversationTitle(currentConversation.id, titleEditText);
    }
    setEditingTitle(false);
  };
  
  // Define the handle send function
  const handleSend = () => {
    if (!currentMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      text: currentMessage,
      sender: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    
    // Simulate AI response with the current LLM model
    setIsTyping(true);
    setTimeout(() => {
      const aiMessage: Message = {
        text: `I'm currently running ${currentLLM}. This is a simulated response to: "${currentMessage}"`,
        sender: 'ai',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      
      // Auto-scroll to the new message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };
  
  return (
    <View style={[
      styles.container, 
      { backgroundColor: isDark ? darkTheme.background : '#fff' }
    ]}>
      <SidebarWithButton />
      
      {/* Account Menu Button */}
      <View style={styles.accountMenuContainer}>
        <Menu
          visible={accountMenuVisible}
          onDismiss={() => setAccountMenuVisible(false)}
          anchor={
            <Pressable 
              style={[
                styles.accountButton,
                isDark && { 
                  backgroundColor: darkTheme.surfaceElevated,
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                }
              ]}
              onPress={() => setAccountMenuVisible(true)}
              onHoverIn={() => setIsAccountHovered(true)}
              onHoverOut={() => setIsAccountHovered(false)}
            >
              <View style={styles.accountButtonContent}>
                <IconButton
                  icon="account-circle"
                  size={36}
                  iconColor="#54C6EB"
                  style={{ margin: 0 }}
                />
                <Animated.View style={[
                  styles.accountNameContainer,
                  { 
                    width: accountNameWidth,
                    opacity: accountNameOpacity,
                  }
                ]}>
                  <Text style={[
                    styles.accountName,
                    { color: isDark ? '#f3f4f6' : '#333' }
                  ]} numberOfLines={1}>John Doe</Text>
                </Animated.View>
              </View>
            </Pressable>
          }
          contentStyle={[
            styles.menuContent,
            isDark && { 
              backgroundColor: darkTheme.surfaceElevated,
              borderColor: darkTheme.border,
              borderWidth: 1,
            }
          ]}
          style={styles.menu}
        >
          <Menu.Item
            leadingIcon="account"
            onPress={() => {
              console.log('Profile selected');
              setAccountMenuVisible(false);
              setProfileVisible(true);
            }}
            title="Profile"
            titleStyle={styles.menuItemTitle}
          />
          <Menu.Item
            leadingIcon="cog"
            onPress={() => {
              console.log('Settings selected');
              setAccountMenuVisible(false);
              // Reset the tab to general when opening settings panel
              setActiveTab('general');
              setSettingsVisible(true);
            }}
            title="Settings"
            titleStyle={styles.menuItemTitle}
          />
          <Menu.Item
            leadingIcon="logout"
            onPress={() => {
              console.log('Logout selected');
              setAccountMenuVisible(false);
            }}
            title="Logout"
            titleStyle={styles.menuItemTitle}
          />
        </Menu>
      </View>
      
      {/* Settings Panel */}
      <SettingsPanel
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        darkTheme={darkTheme}
        currentLLM={currentLLM}
        setLLM={setLLM}
        setLlmMenuVisible={setLlmMenuVisible}
        llmMenuVisible={llmMenuVisible}
        toggleTheme={toggleTheme}
        llmOptions={llmOptions}
        addLLMOption={addLLMOption}
        editLLMOption={editLLMOption}
        deleteLLMOption={deleteLLMOption}
      />
      
      {/* Profile Panel */}
      <ProfilePanel />
      
      {/* Main chat area */}
      <Animated.View style={[
        styles.chatContainer, 
        { backgroundColor: isDark ? darkTheme.background : '#fff' },
        showSidebar && dimensions.width > 768 ? { marginLeft: animatedValues.mainContentMargin } : { left: 0 }
      ]}>
        {/* Chat messages or welcome screen */}
        {currentConversation ? (
          <View style={styles.mainContent}>
            <View style={[
              styles.messagesContainer,
              isDark && {
                backgroundColor: darkTheme.background,
              }
            ]}>
              <View style={styles.chatTitleWrapper}>
                <View style={styles.titleRow}>
                  {editingTitle ? (
                    <View style={styles.editTitleContainer}>
                      <TextInput
                        style={[
                          styles.titleEditInput,
                          isDark && {
                            backgroundColor: darkTheme.surfaceElevated,
                            borderColor: darkTheme.borderLight,
                            color: darkTheme.text,
                          }
                        ]}
                        value={titleEditText}
                        onChangeText={setTitleEditText}
                        autoFocus
                        onBlur={saveTitleEdit}
                        onSubmitEditing={saveTitleEdit}
                        placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                      />
                      <TouchableOpacity
                        style={styles.titleEditSaveButton}
                        onPress={saveTitleEdit}
                      >
                        <IconButton
                          icon="check"
                          size={20}
                          iconColor="#fff"
                          style={styles.saveButtonIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={[
                        styles.chatTitle,
                        { color: isDark ? darkTheme.text : '#333' }
                      ]}>
                        {currentConversation.messages.length === 0 ? "New Chat" : currentConversation.title}
                      </Text>
                      <TouchableOpacity onPress={handleTitleEdit} style={styles.editTitleButton}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          iconColor={isDark ? darkTheme.textSecondary : '#6b7280'}
                          style={styles.editIcon}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={toggleTitleOptions} style={styles.optionsToggleButton}>
                        <IconButton
                          icon={titleOptionsVisible ? "chevron-up" : "chevron-down"}
                          size={26}
                          iconColor={darkTheme.primary}
                          style={styles.toggleIcon}
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                
                <Animated.View 
                  style={[
                    styles.optionsContainer,
                    {
                      height: optionsHeight,
                      opacity: optionsOpacity,
                      overflow: titleOptionsVisible ? 'visible' : 'hidden',
                      backgroundColor: isDark ? darkTheme.surfaceElevated : '#f5f7fa',
                      borderColor: isDark ? darkTheme.border : 'transparent',
                      borderWidth: isDark ? 1 : 0,
                    }
                  ]}
                >
                  <View style={styles.optionSection}>
                    <Text style={[styles.optionSectionTitle, { color: isDark ? darkTheme.text : '#54C6EB' }]}>Model</Text>
                    <View style={styles.modelOptions}>
                      <TouchableOpacity 
                        style={[
                          styles.modelOption, 
                          isDark && { 
                            backgroundColor: darkTheme.surface,
                            borderColor: darkTheme.borderLight,
                          },
                          selectedItem === 'Claude 3 Opus' ? { backgroundColor: '#54C6EB20' } : {}
                        ]}
                        onPress={() => handleLLMSelection('Claude 3 Opus')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modelOptionText, styles.activeModelOptionText]}>Claude 3 Opus</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.modelOption,
                          isDark && { 
                            backgroundColor: darkTheme.surface,
                            borderColor: darkTheme.borderLight,
                          },
                          selectedItem === 'Claude 3 Sonnet' ? { backgroundColor: '#54C6EB20' } : {}
                        ]}
                        onPress={() => handleLLMSelection('Claude 3 Sonnet')}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.modelOptionText,
                          isDark && { color: darkTheme.textSecondary }
                        ]}>Claude 3 Sonnet</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.modelOption,
                          isDark && { 
                            backgroundColor: darkTheme.surface,
                            borderColor: darkTheme.borderLight,
                          },
                          selectedItem === 'Claude 3 Haiku' ? { backgroundColor: '#54C6EB20' } : {}
                        ]}
                        onPress={() => handleLLMSelection('Claude 3 Haiku')}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.modelOptionText,
                          isDark && { color: darkTheme.textSecondary }
                        ]}>Claude 3 Haiku</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.optionSection}>
                    <View style={styles.privateRow}>
                      <Text style={[styles.optionSectionTitle, { color: isDark ? darkTheme.text : '#54C6EB' }]}>Private Mode</Text>
                      <Switch
                        value={false}
                        onValueChange={(value) => console.log('Private mode:', value)}
                        trackColor={{ false: '#e5e7eb', true: '#a7d8f0' }}
                        thumbColor="#54C6EB"
                      />
                    </View>
                    <Text style={[styles.optionDescription, { color: isDark ? darkTheme.textTertiary : '#6b7280' }]}>
                      Messages in private mode won't be saved to history
                    </Text>
                  </View>
                </Animated.View>
              </View>
              
              {currentConversation.messages.length === 0 && !isLoading ? (
                <View style={[
                  styles.emptyStateContainer,
                  isDark && { 
                    backgroundColor: darkTheme.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: darkTheme.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                  }
                ]}>
                  <Text style={[
                    styles.emptyStateText,
                    { color: isDark ? darkTheme.textSecondary : '#6b7280' }
                  ]}>
                    Send a message to start a conversation with bubl.
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={currentConversation.messages}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <MessageItem 
                      message={item} 
                      isDarkMode={isDark}
                      darkThemeColors={darkTheme}
                    />
                  )}
                  contentContainerStyle={[
                    styles.messagesList,
                    isDark && {
                      backgroundColor: darkTheme.background,
                    }
                  ]}
                  ListHeaderComponent={<View style={styles.messagesListHeaderSpacer} />}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
              )}
              {isLoading && <LoadingAnimation />}
            </View>
            
            <View style={[
              styles.messageInputContainer,
              isDark && {
                backgroundColor: darkTheme.surface,
                borderTopWidth: 1,
                borderTopColor: darkTheme.border,
              }
            ]}>
              <ChatInput 
                isDarkMode={isDark}
                darkThemeColors={darkTheme}
              />
            </View>
          </View>
        ) : (
          <View style={[
            styles.welcomeContainer,
            { backgroundColor: isDark ? darkTheme.background : '#fff' }
          ]}>
            <Text style={[
              styles.welcomeTitle,
              { color: darkTheme.primary }
            ]}>Welcome to bubl</Text>
            <Text style={[
              styles.welcomeSubtitle,
              { color: isDark ? darkTheme.textSecondary : '#6b7280' }
            ]}>
              Start a new conversation to begin chatting with bubl
            </Text>
            <TouchableOpacity 
              style={[
                styles.welcomeButton,
                isDark && {
                  backgroundColor: darkTheme.primary,
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                }
              ]}
              onPress={createNewConversation}
            >
              <Text style={[
                styles.welcomeButtonText,
                { color: '#fff' }
              ]}>New Conversation</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    position: 'relative',
  },
  sidebar: {
    backgroundColor: '#e6f7ff',
    zIndex: 10,
    borderRightWidth: 0,
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  absoluteSidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    backgroundColor: '#e6f7ff',
  },
  expandedContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
  },
  collapsedContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSidebarButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  collapseButton: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    backgroundColor: '#54C6EB',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  chatContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mainContent: {
    flex: 1,
    paddingTop: 0,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesList: {
    flexGrow: 1,
    padding: 0,
    paddingHorizontal: 145,
    backgroundColor: '#fcfcfc',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#54C6EB',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  welcomeButton: {
    backgroundColor: '#54C6EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButtonWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    zIndex: 1000,
  },
  persistentToggleButton: {
    backgroundColor: '#54C6EB',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountMenuContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1500,
  },
  accountButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    margin: 0,
    zIndex: 1500,
    overflow: 'hidden',
  },
  accountButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  accountNameContainer: {
    overflow: 'hidden',
    marginRight: 10,
  },
  accountName: {
    color: '#54C6EB',
    fontSize: 14,
    fontWeight: '600',
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
    zIndex: 2000,
  },
  menu: {
    marginTop: 45,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 900,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%'
  },
  settingsPanel: {
    backgroundColor: '#fff',
    borderRadius: 28,
    width: '96%',
    maxWidth: 850,
    height: 700, // Fixed height instead of auto
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
    overflow: 'hidden',
    zIndex: 1000,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  settingsPanelTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.3,
  },
  settingsCloseButton: {
    margin: 0,
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  tab: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    marginRight: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#54C6EB',
  },
  tabText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#54C6EB',
    fontWeight: '700',
  },
  settingsContentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  settingsContent: {
    flex: 1,
  },
  settingsContentContainer: {
    padding: 40,
    paddingBottom: 80,
  },
  settingsSection: {
    marginBottom: 36,
    maxWidth: 760,
    alignSelf: 'center',
  },
  settingsSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#54C6EB',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  settingsRow: {
    marginBottom: 24,
    width: '100%',
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  settingButton: {
    borderColor: '#54C6EB',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 24,
    height: 50,
    minWidth: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButtonLabel: {
    color: '#54C6EB',
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '500',
  },
  textAreaInput: {
    width: '100%',
    borderColor: '#e5e7eb',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    backgroundColor: '#f9fafb',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    backgroundColor: '#54C6EB',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  profileInfoRow: {
    marginBottom: 10,
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  profileInput: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9fafb',
    minHeight: 40,
    textAlignVertical: 'top',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileButtonContainer: {
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#54C6EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatTitleWrapper: {
    paddingHorizontal: 145,
    paddingTop: 30,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  editTitleButton: {
    marginLeft: 10,
  },
  editIcon: {
    margin: 0,
  },
  optionsToggleButton: {
    marginLeft: 5,
  },
  toggleIcon: {
    margin: 0,
  },
  optionsContainer: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionSection: {
    marginBottom: 15,
  },
  optionSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  modelOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  modelOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeModelOption: {
    backgroundColor: '#54C6EB',
    borderColor: '#54C6EB',
  },
  modelOptionText: {
    color: '#333',
    fontWeight: '500',
  },
  activeModelOptionText: {
    color: '#fff',
  },
  privateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  editTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleEditInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    borderWidth: 1,
    borderColor: '#54C6EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  titleEditSaveButton: {
    marginLeft: 10,
    backgroundColor: '#54C6EB',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonIcon: {
    margin: 0,
  },
  headerRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1500,
  },
  settingsButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    margin: 0,
    zIndex: 1500,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 999990,
  },
  simpleLLMDropdown: {
    position: 'absolute',
    top: -200,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 30,
    zIndex: 3000,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    pointerEvents: 'box-none',
  },
  llmDropdownModal: {
    position: 'absolute',
    right: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 999999,
  },
  messagesListHeaderSpacer: {
    height: 20,
  },
  messageInputContainer: {
    padding: 16,
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  llmDropdownOverlay: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -140,
    width: 280,
    borderRadius: 18,
    padding: 10,
    paddingVertical: 8,
    zIndex: 5000,
    elevation: 50,
  },
  settingDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6b7280',
    marginBottom: 20,
  },
  apiKeyContainer: {
    marginBottom: 16,
    width: '100%',
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  apiKeyInput: {
    width: '100%',
    borderColor: '#e5e7eb',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    paddingRight: 50,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9fafb',
    height: 50,
  },
  apiKeyVisibilityButton: {
    position: 'absolute',
    right: 16,
    padding: 5,
  },
  apiKeySaveContainer: {
    marginTop: 16,
    marginBottom: 30, // Add bottom margin
    flexDirection: 'row',
    alignItems: 'center',
  },
  apiKeySaveButton: {
    backgroundColor: '#54C6EB',
    borderRadius: 14,
    paddingHorizontal: 24,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  apiKeySaveButtonLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  keySavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keySavedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  addLLMButton: {
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: '#54C6EB',
  },
  llmOptionItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  llmOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  llmOptionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  llmOptionProvider: {
    fontSize: 12,
    color: '#9ca3af',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  llmDropdownContainer: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 280,
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    padding: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  dropdownDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  llmSelectorButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  llmButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  defaultModelBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultModelText: {
    fontSize: 10,
    color: '#4f46e5',
    fontWeight: '500',
  },
});

export default ChatScreen; 