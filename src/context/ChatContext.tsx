import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Conversation, ChatContextType, Message, LLMModel, LLMOption } from '../types';
import { generateId, createNewConversationTitle } from '../utils/helpers';
import { callLLM } from '../utils/api';

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

  // Load conversations and settings from storage on initial load or when user changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load data with user-specific keys
        const storedConversations = await loadFromStorage('conversations', []);
        const storedCurrentId = await loadFromStorage('currentConversationId', null);
        const storedLLM = await loadFromStorage('currentLLM', 'Claude 3 Opus');
        const storedLlmOptions = await loadFromStorage('llmOptions', DEFAULT_LLM_OPTIONS);
        
        // Update state with the loaded values
        setConversations(storedConversations);
        setCurrentConversationId(storedCurrentId);
        console.log(`[LLM Persistence] Loading LLM from storage: ${storedLLM}`);
        setCurrentLLM(storedLLM);
        setLlmOptions(storedLlmOptions);
        
        console.log('User data loaded successfully for', userProfile.username);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    // Only load data once the user profile is loaded
    if (!isInitialLoading) {
      loadData();
    }
  }, [userProfile.id, userProfile.isLoggedIn, isInitialLoading]);

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

  const sendMessage = async (content: string) => {
    if (!currentConversationId || !content.trim()) return;
    
    // Create user message
    const userMessage: Message = {
      id: generateId(),
      content,
      role: 'user',
      timestamp: Date.now(),
    };
    
    // Update the conversation with the user message
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === currentConversationId
          ? { 
              ...conv, 
              messages: [...conv.messages, userMessage],
              updatedAt: Date.now(),
              // Update title if this is the first message
              title: conv.messages.length === 0 ? content.substring(0, 30) : conv.title
            }
          : conv
      )
    );
    
    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    // Set loading state
    setIsLoading(true);
    
    try {
      // Get the system prompt from storage
      const systemPrompt = await AsyncStorage.getItem('systemPrompt') || 'You are a helpful assistant named bubl.';

      // Get conversation history for context
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      const conversationHistory = currentConversation?.messages || [];
      
      // Format conversation history as a single string for context
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        // Include last few messages for context (limited to avoid token limits)
        const contextMessages = conversationHistory.slice(-6);
        conversationContext = contextMessages.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n');
        
        // Add the current message
        conversationContext += `\n\nUser: ${content}`;
      } else {
        conversationContext = `User: ${content}`;
      }
      
      // Call the LLM API with the AbortController
      const response = await callLLM({
        model: currentLLM,
        prompt: conversationContext,
        systemPrompt,
        abortController: abortControllerRef.current
      });
      
      // Only add the response if it's not empty (empty indicates aborted)
      if (response.text) {
        // Create AI message with the response
        const aiMessage: Message = {
          id: generateId(),
          content: response.text,
          role: 'assistant',
          timestamp: Date.now(),
        };
        
        // Update conversation with AI response
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === currentConversationId
              ? { 
                  ...conv, 
                  messages: [...conv.messages, aiMessage],
                  updatedAt: Date.now() 
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Error calling LLM API:', error);
      
      // Only add error message if not explicitly aborted
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        // Create error message
        const errorMessage: Message = {
          id: generateId(),
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          role: 'assistant',
          timestamp: Date.now(),
        };
        
        // Update conversation with error message
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === currentConversationId
              ? { 
                  ...conv, 
                  messages: [...conv.messages, errorMessage],
                  updatedAt: Date.now() 
                }
              : conv
          )
        );
      }
    } finally {
      // Clear the AbortController reference and reset loading state
      abortControllerRef.current = null;
      setIsLoading(false);
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
    if (isLoading && abortControllerRef.current) {
      // Abort the fetch request
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
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
        createNewConversation,
        switchConversation,
        sendMessage,
        deleteConversation,
        clearConversations,
        updateConversationTitle,
        setLLM,
        addLLMOption,
        editLLMOption,
        deleteLLMOption,
        login,
        logout,
        stopMessageGeneration
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