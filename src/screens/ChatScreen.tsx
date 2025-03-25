import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, useWindowDimensions, Animated, Easing, Platform, Image, Modal, ScrollView, TextInput, Dimensions, Pressable, Switch } from 'react-native';
import { IconButton, Menu, Button, Divider, Avatar } from 'react-native-paper';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import MessageItem from '../components/MessageItem';
import ChatInput from '../components/ChatInput';
import LoadingAnimation from '../components/LoadingAnimation';
import ConversationList from '../components/ConversationList';

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
};

const ChatScreen: React.FC = () => {
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
  
  const { currentConversationId, conversations, isLoading, createNewConversation, updateConversationTitle } = useChat();
  
  // State for account menu dropdown
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  // State for settings panel visibility
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  
  // State for settings panel tabs
  const [activeTab, setActiveTab] = useState('general');
  
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
  const { theme, toggleTheme, isDark } = useTheme();
  
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
  
  // Settings panel component with animation
  const SettingsPanel = () => {
    const [animation] = useState(new Animated.Value(0));
    const contentHeight = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      if (settingsVisible) {
        Animated.spring(animation, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(animation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    }, [settingsVisible]);
    
    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });
    
    const opacity = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    // Render different tab content based on activeTab
    const renderTabContent = () => {
      switch (activeTab) {
        case 'general':
          return (
            <View style={styles.tabContentContainer}>
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Appearance</Text>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Theme</Text>
                  <Button 
                    mode="outlined" 
                    style={styles.settingButton}
                    labelStyle={styles.settingButtonLabel}
                    onPress={toggleTheme}
                  >
                    {isDark ? 'Dark' : 'Light'}
                  </Button>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={styles.settingLabel}>Font Size</Text>
                  <Button 
                    mode="outlined" 
                    style={styles.settingButton}
                    labelStyle={styles.settingButtonLabel}
                  >
                    Medium
                  </Button>
                </View>
              </View>
              
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Account</Text>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Email</Text>
                  <Text style={[styles.settingValue, { color: isDark ? '#9ca3af' : '#6b7280' }]}>user@example.com</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Subscription</Text>
                  <Text style={[styles.settingValue, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Free</Text>
                </View>
              </View>
            </View>
          );
        case 'ai-config':
          return (
            <View style={styles.tabContentContainer}>
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>LLM Configuration</Text>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>LLM Selection</Text>
                  <Button 
                    mode="outlined" 
                    style={styles.settingButton}
                    labelStyle={styles.settingButtonLabel}
                  >
                    Claude 3 Opus
                  </Button>
                </View>
              </View>
              
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>System Prompt</Text>
                <TextInput
                  style={[
                    styles.textAreaInput,
                    isDark && {
                      backgroundColor: darkTheme.surfaceElevated,
                      borderColor: darkTheme.borderLight,
                      color: darkTheme.text,
                    }
                  ]}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter system prompt here..."
                  placeholderTextColor={isDark ? darkTheme.textTertiary : '#9ca3af'}
                  defaultValue="You are a helpful assistant named bubl."
                />
              </View>
              
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Speech Settings</Text>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>TTS Model</Text>
                  <Button 
                    mode="outlined" 
                    style={styles.settingButton}
                    labelStyle={styles.settingButtonLabel}
                  >
                    Anthropic Sonnet
                  </Button>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>STT Model</Text>
                  <Button 
                    mode="outlined" 
                    style={styles.settingButton}
                    labelStyle={styles.settingButtonLabel}
                  >
                    Whisper Large
                  </Button>
                </View>
              </View>
              
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Tools Configuration</Text>
                <View style={styles.toolsList}>
                  <View style={styles.toolItem}>
                    <Text style={[styles.toolName, { color: isDark ? '#e5e7eb' : '#333' }]}>Web Search</Text>
                    <Button 
                      mode="text"
                      compact
                      style={styles.toolButton}
                      labelStyle={{ color: '#54C6EB' }}
                      icon="check-circle"
                    >
                      Enabled
                    </Button>
                  </View>
                  <Divider style={styles.toolDivider} />
                  <View style={styles.toolItem}>
                    <Text style={[styles.toolName, { color: isDark ? '#e5e7eb' : '#333' }]}>Image Generation</Text>
                    <Button 
                      mode="text"
                      compact
                      style={styles.toolButton}
                      labelStyle={{ color: '#54C6EB' }}
                      icon="check-circle"
                    >
                      Enabled
                    </Button>
                  </View>
                  <Divider style={styles.toolDivider} />
                  <View style={styles.toolItem}>
                    <Text style={[styles.toolName, { color: isDark ? '#e5e7eb' : '#333' }]}>Document Analysis</Text>
                    <Button 
                      mode="text"
                      compact
                      style={styles.toolButton}
                      labelStyle={{ color: '#9ca3af' }}
                      icon="close-circle"
                    >
                      Disabled
                    </Button>
                  </View>
                </View>
                <Button 
                  mode="outlined"
                  icon="plus"
                  style={[styles.settingButton, { marginTop: 16, alignSelf: 'flex-start' }]}
                  labelStyle={styles.settingButtonLabel}
                >
                  Add Tool
                </Button>
              </View>
            </View>
          );
        case 'privacy':
          return (
            <View style={styles.tabContentContainer}>
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: isDark ? '#f3f4f6' : '#54C6EB' }]}>Privacy</Text>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Chat History</Text>
                  <Button 
                    mode="outlined" 
                    style={[styles.settingButton, { backgroundColor: '#fee2e2' }]}
                    labelStyle={{ color: '#ef4444' }}
                  >
                    Clear All
                  </Button>
                </View>
                <View style={styles.settingsRow}>
                  <Text style={[styles.settingLabel, { color: isDark ? '#e5e7eb' : '#333' }]}>Data Collection</Text>
                  <Button 
                    mode="outlined" 
                    style={styles.settingButton}
                    labelStyle={styles.settingButtonLabel}
                  >
                    Opt Out
                  </Button>
                </View>
              </View>
            </View>
          );
        default:
          return null;
      }
    };
    
    return (
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { 
              opacity,
              backgroundColor: isDark 
                ? 'rgba(0, 0, 0, 0.75)' 
                : 'rgba(0, 0, 0, 0.6)'
            }
          ]}
          pointerEvents={settingsVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity 
            style={styles.modalTouchable}
            activeOpacity={1}
            onPress={() => setSettingsVisible(false)}
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
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()} 
                style={{flex: 1}}
              >
                <View style={styles.settingsHeader}>
                  <Text style={[styles.settingsPanelTitle, { color: isDark ? '#f3f4f6' : '#333' }]}>Settings</Text>
              <IconButton
                    icon="close"
                size={24}
                    onPress={() => setSettingsVisible(false)}
                    style={styles.settingsCloseButton}
                    iconColor="#54C6EB"
              />
            </View>
                
                {/* Tabs navigation - just update active tab, don't change visibility */}
                <View style={styles.tabsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.tab, 
                      activeTab === 'general' && styles.activeTab,
                      isDark && { 
                        borderBottomColor: activeTab === 'general' 
                          ? darkTheme.primary 
                          : darkTheme.border 
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
                      activeTab === 'ai-config' && styles.activeTab,
                      isDark && { 
                        borderBottomColor: activeTab === 'ai-config' 
                          ? darkTheme.primary 
                          : darkTheme.border 
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
                      activeTab === 'privacy' && styles.activeTab,
                      isDark && { 
                        borderBottomColor: activeTab === 'privacy' 
                          ? darkTheme.primary 
                          : darkTheme.border 
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
                
                <Divider style={[
                  styles.tabDivider,
                  isDark && { backgroundColor: darkTheme.divider }
                ]} />
                
                {/* Fixed height content container with scrolling */}
                <View style={styles.settingsContentWrapper}>
                  <ScrollView 
                    style={styles.settingsContent}
                    contentContainerStyle={styles.settingsContentContainer}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle={isDark ? "white" : "black"}
                  >
                    {renderTabContent()}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    );
  };
  
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
      <Modal
        transparent
        visible={profileVisible}
        onRequestClose={() => setProfileVisible(false)}
        animationType="none"
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
      </Modal>
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
              // Set the default active tab when opening settings
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
      <SettingsPanel />
      
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
                          styles.activeModelOption
                        ]}
                        onPress={() => console.log('GPT-4 selected')}
                      >
                        <Text style={[styles.modelOptionText, styles.activeModelOptionText]}>GPT-4</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.modelOption,
                          isDark && { 
                            backgroundColor: darkTheme.surface,
                            borderColor: darkTheme.borderLight,
                          }
                        ]}
                        onPress={() => console.log('GPT-3.5 selected')}
                      >
                        <Text style={[
                          styles.modelOptionText,
                          isDark && { color: darkTheme.textSecondary }
                        ]}>GPT-3.5</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.modelOption,
                          isDark && { 
                            backgroundColor: darkTheme.surface,
                            borderColor: darkTheme.borderLight,
                          }
                        ]}
                        onPress={() => console.log('Claude selected')}
                      >
                        <Text style={[
                          styles.modelOptionText,
                          isDark && { color: darkTheme.textSecondary }
                        ]}>Claude</Text>
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
  },
  settingsPanel: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    height: 600,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
  },
  settingsPanelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsCloseButton: {
    margin: 0,
  },
  settingsContentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  settingsContent: {
    flex: 1,
  },
  settingsContentContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#54C6EB',
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  settingButton: {
    borderColor: '#54C6EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  settingButtonLabel: {
    color: '#54C6EB',
    fontSize: 14,
  },
  modalTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  activeTab: {
    borderBottomColor: '#54C6EB',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#54C6EB',
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },
  textAreaInput: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
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
  toolsList: {
    marginBottom: 20,
  },
  toolItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toolName: {
    fontSize: 16,
    color: '#333',
  },
  toolButton: {
    padding: 0,
    margin: 0,
  },
  toolDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 10,
  },
  tabContentContainer: {
    width: '100%',
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
  messagesListHeaderSpacer: {
    height: 20,
  },
  messageInputContainer: {
    padding: 16,
  },
});

export default ChatScreen; 