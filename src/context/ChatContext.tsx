import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, ChatContextType, Message } from '../types';
import { generateId, createNewConversationTitle } from '../utils/helpers';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

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

  // Load conversations from AsyncStorage on initial load
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const storedConversations = await AsyncStorage.getItem('conversations');
        const storedCurrentId = await AsyncStorage.getItem('currentConversationId');
        
        if (storedConversations) {
          setConversations(JSON.parse(storedConversations));
        }
        
        if (storedCurrentId) {
          setCurrentConversationId(storedCurrentId);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };
    
    loadConversations();
  }, []);

  // Save conversations to AsyncStorage whenever they change
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
    
    // Generate mock response after a delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: generateId(),
        content: getMockResponse(content),
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
        createNewConversation,
        switchConversation,
        sendMessage,
        deleteConversation,
        clearConversations,
        updateConversationTitle,
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