export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number | string;
  isLoading?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number | string;
  updatedAt: number | string;
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  isLoggedIn: boolean;
}

export interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  currentLLM: LLMModel;
  llmOptions: LLMOption[];
  userProfile: UserProfile;
  isInitialLoading: boolean;
  isTTSEnabled: boolean;
  ttsVoice: string;
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
  login: (userData: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  stopMessageGeneration: () => void;
  toggleTTS: () => void;
  changeTTSVoice: (voiceId: string) => void;
  stopTTS: () => Promise<void>;
} 