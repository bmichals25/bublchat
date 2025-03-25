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

export interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  createNewConversation: () => void;
  switchConversation: (id: string) => void;
  sendMessage: (content: string) => void;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;
  updateConversationTitle: (id: string, newTitle: string) => void;
} 