import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Conversation, ChatContextType, Message, LLMModel, LLMOption } from '../types';
import { generateId, createNewConversationTitle } from '../utils/helpers';
import { callLLM } from '../utils/api';
import { speakText, stopSpeech } from '../utils/tts';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Move the DEFAULT_LLM_OPTIONS to outside the component to prevent recreation
// Near the top of the file, just after the ChatContext declaration, but before the component

// Default LLM options
const DEFAULT_LLM_OPTIONS: LLMOption[] = [
  {
    id: 'claude-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Most powerful Claude model for complex tasks',
    apiKeyRequired: true,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance and efficiency',
    apiKeyRequired: true,
  },
  {
    id: 'claude-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Fastest Claude model',
    apiKeyRequired: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Latest and most capable GPT model',
    apiKeyRequired: true,
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'Powerful reasoning capabilities',
    apiKeyRequired: true,
  },
  {
    id: 'gpt-3.5',
    name: 'GPT-3.5',
    provider: 'OpenAI',
    description: 'Fast and cost-effective',
    apiKeyRequired: true,
  },
];

// Mock AI response function
const getMockResponse = (message: string): string => {
  const responses = [
    "I'm an AI assistant. How can I help you today?",
    "That's an interesting question. Let me think about that.",
    "I'm here to assist with any information or tasks you need help with.",
    "I don't have personal opinions, but I can provide information on that topic.",
    "Thanks for your message. I'm here to help you with any questions you have."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

// Mock user profile for demonstration
const MOCK_USER_PROFILE = {
  id: 'user123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
  isLoggedIn: false, // Default to not logged in
};

export const ChatProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLLM, setCurrentLLM] = useState<LLMModel>('Claude 3 Opus');
  const [llmOptions, setLlmOptions] = useState<LLMOption[]>(DEFAULT_LLM_OPTIONS);
  // Replace messageAborted with abortController ref
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Add user profile state with default not logged in
  const [userProfile, setUserProfile] = useState(MOCK_USER_PROFILE);
  // Add loading state for initial app load
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(false);
  const [ttsVoice, setTTSVoice] = useState<string>('EXAVITQu4vr4xnSDxMaL'); // Rachel voice ID as default
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  // Helper function to get storage keys with user ID prefix
  const getUserStorageKey = (key: string) => {
    return userProfile.isLoggedIn 
      ? `user_${userProfile.id}_${key}` 
      : key;
  };

  // Save data to appropriate storage based on platform
  const saveToStorage = async (key: string, data: any) => {
    const userKey = getUserStorageKey(key);
    console.log(`Saving to storage: ${userKey}`);
    
    try {
      const jsonValue = JSON.stringify(data);
      // Use localStorage in web environment, AsyncStorage otherwise
      if (Platform.OS === 'web') {
        localStorage.setItem(userKey, jsonValue);
      }
      await AsyncStorage.setItem(userKey, jsonValue);
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  };

  // Load data from appropriate storage based on platform
  const loadFromStorage = async (key: string, defaultValue: any = null) => {
    const userKey = getUserStorageKey(key);
    console.log(`Loading from storage: ${userKey}`);
    
    try {
      // First try localStorage in web environment
      if (Platform.OS === 'web') {
        const value = localStorage.getItem(userKey);
        if (value) {
          console.log(`Found ${key} in localStorage`);
          return JSON.parse(value);
        }
      }
      
      // Then try AsyncStorage
      const value = await AsyncStorage.getItem(userKey);
      if (value) {
        console.log(`Found ${key} in AsyncStorage`);
        return JSON.parse(value);
      }
      
      console.log(`No stored value found for ${key}, using default`);
      return defaultValue;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return defaultValue;
    }
  };

  // Load user profile on initial app load
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsInitialLoading(true);
        const storedUserProfile = await AsyncStorage.getItem('userProfile');
        
        if (storedUserProfile) {
          const parsedProfile = JSON.parse(storedUserProfile);
          console.log('Loaded user profile from storage:', parsedProfile.username);
          setUserProfile(parsedProfile);
        } else {
          console.log('No stored user profile found, using default');
          // Ensure we're not logged in by default
          setUserProfile({...MOCK_USER_PROFILE, isLoggedIn: false});
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadUserProfile();
  }, []);

  // Load saved conversations from AsyncStorage on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load conversations
        const storedConversations = await loadFromStorage('conversations', []);
        setConversations(storedConversations || []);
        
        // Load other settings
        const storedLLM = await loadFromStorage('currentLLM', 'Claude 3 Sonnet');
        setCurrentLLM(storedLLM);
        
        // Load TTS settings
        const ttsEnabled = await loadFromStorage('ttsEnabled', false);
        const savedVoice = await loadFromStorage('ttsSelectedVoice', 'EXAVITQu4vr4xnSDxMaL');
        
        setIsTTSEnabled(ttsEnabled);
        setTTSVoice(savedVoice);
        
        console.log('Settings loaded successfully:', {
          conversations: storedConversations?.length,
          currentLLM: storedLLM,
          ttsEnabled,
          ttsVoice: savedVoice
        });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    saveToStorage('conversations', conversations);
    if (currentConversationId) {
      saveToStorage('currentConversationId', currentConversationId);
    }
  }, [conversations, currentConversationId, userProfile.id]);

  // Save current LLM to storage when it changes
  useEffect(() => {
    console.log(`[LLM Persistence] Saving LLM to storage: ${currentLLM}`);
    saveToStorage('currentLLM', currentLLM);
  }, [currentLLM, userProfile.id]);
  
  // Save LLM options to storage when they change
  useEffect(() => {
    saveToStorage('llmOptions', llmOptions);
  }, [llmOptions, userProfile.id]);

  // Save TTS settings to storage when they change
  useEffect(() => {
    saveToStorage('isTTSEnabled', isTTSEnabled);
  }, [isTTSEnabled, userProfile.id]);
  
  useEffect(() => {
    saveToStorage('ttsVoice', ttsVoice);
  }, [ttsVoice, userProfile.id]);

  // User login/logout functions
  const login = async (userData: typeof MOCK_USER_PROFILE) => {
    const loggedInUser = {...userData, isLoggedIn: true};
    setUserProfile(loggedInUser);
    
    // Save user profile to storage for persistence
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(loggedInUser));
      console.log('User profile saved to storage:', loggedInUser.username);
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
    
    // Load user-specific data after login
    console.log('User logged in:', userData.username);
  };
  
  const logout = async () => {
    console.log('User logged out');
    
    // Clear user-specific data from state
    setConversations([]);
    setCurrentConversationId(null);
    setCurrentLLM('Claude 3 Opus');
    setLlmOptions(DEFAULT_LLM_OPTIONS);
    
    // Update user profile state to logged out
    const loggedOutUser = {...MOCK_USER_PROFILE, isLoggedIn: false};
    setUserProfile(loggedOutUser);
    
    // Save logged out state to storage
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(loggedOutUser));
      console.log('Logged out user profile saved to storage');
    } catch (error) {
      console.error('Failed to save logged out user profile:', error);
    }
  };

  const createNewConversation = () => {
    const newId = generateId();
    const newConversation: Conversation = {
      id: newId,
      title: createNewConversationTitle(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newId);
  };

  const switchConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const setLLM = (model: LLMModel) => {
    setCurrentLLM(model);
  };
  
  // Add a new LLM option
  const addLLMOption = (option: Omit<LLMOption, 'id'>) => {
    const newOption: LLMOption = {
      ...option,
      id: generateId(),
      isCustom: true
    };
    
    setLlmOptions([...llmOptions, newOption]);
  };
  
  // Edit an existing LLM option
  const editLLMOption = (id: string, updates: Partial<Omit<LLMOption, 'id'>>) => {
    setLlmOptions(prevOptions => 
      prevOptions.map(option => 
        option.id === id
          ? { ...option, ...updates }
          : option
      )
    );
    
    // If we're editing the currently selected LLM, update the name if it changed
    if (updates.name && llmOptions.find(opt => opt.id === id)?.name === currentLLM) {
      setCurrentLLM(updates.name);
    }
  };
  
  // Delete an LLM option
  const deleteLLMOption = (id: string) => {
    const optionToDelete = llmOptions.find(opt => opt.id === id);
    
    // Calculate the updated options list
    const updatedOptions = llmOptions.filter(option => option.id !== id);
    
    // Update the state with the filtered options
    setLlmOptions(updatedOptions);
    
    // Handle the case where the deleted LLM was the current one
    if (optionToDelete && optionToDelete.name === currentLLM) {
      // If there are remaining options, switch to the first one
      if (updatedOptions.length > 0) {
        setCurrentLLM(updatedOptions[0].name);
      } else {
        // If no options are left, set a placeholder value
        setCurrentLLM('No Models Available');
      }
    }
    
    // Explicitly save the updated options to storage
    saveToStorage('llmOptions', updatedOptions);
  };

  // Toggle TTS on/off
  const toggleTTS = () => {
    const newValue = !isTTSEnabled;
    setIsTTSEnabled(newValue);
    
    // Save to AsyncStorage
    try {
      AsyncStorage.setItem('ttsEnabled', newValue.toString());
      console.log('TTS enabled state saved:', newValue);
    } catch (error) {
      console.error('Failed to save TTS enabled state:', error);
    }
  };
  
  // Change the TTS voice
  const changeTTSVoice = (voiceId: string) => {
    setTTSVoice(voiceId);
    
    // Save to AsyncStorage
    try {
      AsyncStorage.setItem('ttsSelectedVoice', voiceId);
      console.log('Selected TTS voice saved:', voiceId);
    } catch (error) {
      console.error('Failed to save TTS voice:', error);
    }
  };
  
  const stopTTS = async () => {
    // Cancel any ongoing TTS request
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }
    
    // Stop any playing audio
    await stopSpeech();
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // If TTS is playing, stop it
    console.log('[ChatContext] sendMessage called, stopping any active TTS');
    await stopTTS();
    
    // Find the current conversation or create a new one
    let conversation: Conversation;
    
    if (currentConversationId && conversations.some(conv => conv.id === currentConversationId)) {
      conversation = conversations.find(conv => conv.id === currentConversationId)!;
    } else {
      // Create a new conversation if none exists
      const newId = generateId();
      conversation = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setConversations(prev => [...prev, conversation]);
      setCurrentConversationId(newId);
    }
    
    // Add user message to conversation
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    // Create a placeholder for the assistant message
    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    
    // Update the conversation with the new messages
    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMessage, assistantMessage],
      updatedAt: new Date().toISOString(),
    };
    
    // Update the conversations list with the updated conversation
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      )
    );
    
    // Set loading state to show indicator
    setIsLoading(true);
    
    // Create a single abort controller for both LLM and TTS requests
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    ttsAbortControllerRef.current = abortController;
    
    try {
      // Format the conversation history as a prompt
      const conversationHistory = updatedConversation.messages
        .slice(0, -1) // Exclude the placeholder assistant message
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      // Call the LLM API
      console.log('[ChatContext] Calling LLM API with model:', currentLLM);
      const response = await callLLM({
        model: currentLLM,
        prompt: conversationHistory,
        systemPrompt: "You are a helpful assistant.",
        abortController
      });
      
      // If the request was aborted, don't update the message
      if (abortControllerRef.current === null) {
        console.log('[ChatContext] LLM request was aborted, not updating message');
        return;
      }
      
      // Update the assistant message with the response
      const responseText = response.text.trim();
      console.log('[ChatContext] Received response from LLM, length:', responseText.length);
      
      // Update conversations with the response
      setConversations(prevConversations => {
        const convIndex = prevConversations.findIndex(conv => conv.id === updatedConversation.id);
        if (convIndex === -1) return prevConversations;
        
        const conversation = prevConversations[convIndex];
        const messages = [...conversation.messages];
        const assistantMsgIndex = messages.findIndex(msg => msg.id === assistantMessage.id);
        
        if (assistantMsgIndex !== -1) {
          messages[assistantMsgIndex] = {
            ...messages[assistantMsgIndex],
            content: responseText,
            isLoading: false,
          };
        }
        
        // Update the conversation with the new messages
        const updatedConv = {
          ...conversation,
          messages,
          title: conversation.messages.length <= 2 ? createNewConversationTitle(userMessage.content) : conversation.title,
          updatedAt: new Date().toISOString(),
        };
        
        // Create a new array with the updated conversation
        const updatedConversations = [...prevConversations];
        updatedConversations[convIndex] = updatedConv;
        
        return updatedConversations;
      });
      
      // We don't need to manually trigger TTS here - the MessageItem component
      // will automatically play for the latest AI message when it renders
      // This prevents duplicate TTS playback
      console.log('[ChatContext] Message updated, TTS will be handled by MessageItem');
      
    } catch (error) {
      console.error('[ChatContext] Error sending message:', error);
      
      // Update the assistant message to show the error
      setConversations(prevConversations => {
        const convIndex = prevConversations.findIndex(conv => conv.id === updatedConversation.id);
        if (convIndex === -1) return prevConversations;
        
        const conversation = prevConversations[convIndex];
        const messages = [...conversation.messages];
        const assistantMsgIndex = messages.findIndex(msg => msg.id === assistantMessage.id);
        
        if (assistantMsgIndex !== -1) {
          messages[assistantMsgIndex] = {
            ...messages[assistantMsgIndex],
            content: 'Sorry, there was an error generating a response. Please try again.',
            isLoading: false,
            isError: true,
          };
        }
        
        // Update the conversation with the new messages
        const updatedConv = {
          ...conversation,
          messages,
          updatedAt: new Date().toISOString(),
        };
        
        // Create a new array with the updated conversation
        const updatedConversations = [...prevConversations];
        updatedConversations[convIndex] = updatedConv;
        
        return updatedConversations;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      ttsAbortControllerRef.current = null;
    }
  };

  const deleteConversation = (id: string) => {
    // Simple validation
    if (!id) return;
    
    // Safe approach: create a new array without the deleted conversation
    const newConversations = conversations.filter(conv => conv.id !== id);
    
    // Update state with the new array
    setConversations(newConversations);
    
    // Update current conversation if needed
    if (currentConversationId === id) {
      if (newConversations.length > 0) {
        setCurrentConversationId(newConversations[0].id);
      } else {
        setCurrentConversationId(null);
      }
    }
    
    // Save to AsyncStorage
    AsyncStorage.setItem('conversations', JSON.stringify(newConversations));
    if (currentConversationId === id) {
      if (newConversations.length > 0) {
        AsyncStorage.setItem('currentConversationId', newConversations[0].id);
      } else {
        AsyncStorage.removeItem('currentConversationId');
      }
    }
  };

  const clearConversations = () => {
    // No need to check if there are conversations - setting to empty array is idempotent
    setConversations([]);
    setCurrentConversationId(null);
    
    // Update storage
    AsyncStorage.setItem('conversations', JSON.stringify([]));
    AsyncStorage.removeItem('currentConversationId');
  };

  const updateConversationTitle = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return; // Don't update if title is empty
    
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === id
          ? { 
              ...conv, 
              title: newTitle,
              updatedAt: Date.now() 
            }
          : conv
      )
    );
  };

  // Update stopMessageGeneration to abort the request
  const stopMessageGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Also stop TTS
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }
    
    // Call stopSpeech to stop any playing audio
    stopSpeech();
    
    setIsLoading(false);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversationId,
        isLoading,
        currentLLM,
        llmOptions,
        userProfile,
        isInitialLoading,
        isTTSEnabled,
        ttsVoice,
        createNewConversation,
        switchConversation,
        sendMessage,
        deleteConversation,
        clearConversations,
        updateConversationTitle,
        stopMessageGeneration,
        setLLM,
        addLLMOption,
        editLLMOption,
        deleteLLMOption,
        login,
        logout,
        toggleTTS,
        changeTTSVoice,
        stopTTS,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 