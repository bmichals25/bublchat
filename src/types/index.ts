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

export type LLMModel = string;

export interface LLMOption {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Mistral' | 'Other';
  description?: string;
  apiKeyRequired?: boolean;
  isCustom?: boolean;
}

export interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  currentLLM: LLMModel;
  llmOptions: LLMOption[];
  createNewConversation: () => void;
  switchConversation: (id: string) => void;
  sendMessage: (content: string) => void;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;
  updateConversationTitle: (id: string, newTitle: string) => void;
  setLLM: (model: LLMModel) => void;
  addLLMOption: (option: Omit<LLMOption, 'id'>) => void;
  editLLMOption: (id: string, updates: Partial<Omit<LLMOption, 'id'>>) => void;
  deleteLLMOption: (id: string) => void;
} 