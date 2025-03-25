export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getMessagePreview = (content: string): string => {
  return content.length > 60 ? content.substring(0, 60) + '...' : content;
};

export const createNewConversationTitle = (): string => {
  return 'New Chat';
}; 