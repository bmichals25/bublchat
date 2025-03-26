export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type LLMModel = 'Claude 3 Opus' | 'Claude 3 Sonnet' | 'Claude 3 Haiku' | 'GPT-4o' | 'GPT-4' | 'GPT-3.5';

export interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  currentLLM: LLMModel;
  createNewConversation: () => void;
  switchConversation: (id: string) => void;
  sendMessage: (content: string) => void;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;
  updateConversationTitle: (id: string, newTitle: string) => void;
  setLLM: (model: LLMModel) => void;
} 