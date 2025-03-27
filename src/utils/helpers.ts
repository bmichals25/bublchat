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

export const createNewConversationTitle = (content?: string): string => {
  if (content) {
    // Create a title based on the first message content
    const trimmedContent = content.trim();
    // Get the first 30 characters or the first sentence, whichever is shorter
    const firstSentence = trimmedContent.split(/[.!?]/, 1)[0];
    const shortTitle = firstSentence.length > 30 ? firstSentence.substring(0, 30) + '...' : firstSentence;
    return shortTitle || 'New Chat';
  }
  return 'New Chat';
}; 