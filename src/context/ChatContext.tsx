import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, ChatContextType, Message, LLMModel, LLMOption } from '../types';
import { generateId, createNewConversationTitle } from '../utils/helpers';

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

export const ChatProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLLM, setCurrentLLM] = useState<LLMModel>('Claude 3 Opus');
  const [llmOptions, setLlmOptions] = useState<LLMOption[]>(DEFAULT_LLM_OPTIONS);

  // Load conversations and settings from AsyncStorage on initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedConversations = await AsyncStorage.getItem('conversations');
        const storedCurrentId = await AsyncStorage.getItem('currentConversationId');
        const storedLLM = await AsyncStorage.getItem('currentLLM');
        const storedLlmOptions = await AsyncStorage.getItem('llmOptions');
        
        if (storedConversations) {
          setConversations(JSON.parse(storedConversations));
        }
        
        if (storedCurrentId) {
          setCurrentConversationId(storedCurrentId);
        }

        if (storedLLM) {
          setCurrentLLM(JSON.parse(storedLLM) as LLMModel);
        }
        
        // Handle LLM options loading
        if (storedLlmOptions) {
          try {
            const parsedOptions = JSON.parse(storedLlmOptions);
            // Always use stored options, even if array is empty
            // This ensures deleted models stay deleted
            setLlmOptions(parsedOptions);
          } catch (e) {
            console.error('Error parsing stored LLM options:', e);
            // Only use defaults on parsing error
            setLlmOptions(DEFAULT_LLM_OPTIONS);
          }
        } else {
          // First time loading (no saved options yet) - use defaults
          setLlmOptions(DEFAULT_LLM_OPTIONS);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, []);

  // Save conversations and settings to AsyncStorage whenever they change
  useEffect(() => {
    const saveConversations = async () => {
      try {
        await AsyncStorage.setItem('conversations', JSON.stringify(conversations));
        
        if (currentConversationId) {
          await AsyncStorage.setItem('currentConversationId', currentConversationId);
        }
      } catch (error) {
        console.error('Failed to save conversations:', error);
      }
    };
    
    saveConversations();
  }, [conversations, currentConversationId]);

  // Save current LLM to AsyncStorage when it changes
  useEffect(() => {
    const saveLLM = async () => {
      try {
        await AsyncStorage.setItem('currentLLM', JSON.stringify(currentLLM));
      } catch (error) {
        console.error('Failed to save LLM setting:', error);
      }
    };
    
    saveLLM();
  }, [currentLLM]);
  
  // Save LLM options to AsyncStorage when they change
  useEffect(() => {
    const saveLlmOptions = async () => {
      try {
        await AsyncStorage.setItem('llmOptions', JSON.stringify(llmOptions));
      } catch (error) {
        console.error('Failed to save LLM options:', error);
      }
    };
    
    saveLlmOptions();
  }, [llmOptions]);

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
  };

  const sendMessage = (content: string) => {
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
    
    // Simulate AI thinking
    setIsLoading(true);
    
    // Generate mock response after a delay (include the LLM model info)
    setTimeout(() => {
      // We can include the selected LLM in the response for demonstration
      const modelPrefix = `Using ${currentLLM}: `;
      const aiMessage: Message = {
        id: generateId(),
        content: modelPrefix + getMockResponse(content),
        role: 'assistant',
        timestamp: Date.now(),
      };
      
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
      
      setIsLoading(false);
    }, 1000);
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

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversationId,
        isLoading,
        currentLLM,
        llmOptions,
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