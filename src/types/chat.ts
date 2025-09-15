export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
  hasImage?: boolean;
}

export interface Conversation {
  user: string;
  bot: string;
}

export interface ChatThread {
  id: string;
  title: string;
  displayId: string; // e.g., "SAND-4"
  conversations: Conversation[]; // Keep for backward compatibility
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  avatar?: string;
  initials: string;
}

// Simple API request for Perplexity proxy
export interface PerplexityRequest {
  message: string;
}
