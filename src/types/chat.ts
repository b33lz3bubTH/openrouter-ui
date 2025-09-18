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

// Backend API types based on the cURL example
export interface BackendContextMessage {
  [key: string]: string; // Dynamic keys for user names with their messages
}

export interface BackendChatRequest {
  context: BackendContextMessage[];
  message: string;
  user: string;
  rules: string;
}

// Updated to match actual backend response format
export interface BackendChatResponse {
  reply: string;
  transcript_sent: string;
}

// Thread configuration for roleplay
export interface ThreadConfig {
  botName: string;
  rules: string;
  userName: string;
}

export interface ChatThread {
  id: string;
  title: string;
  displayId: string; // e.g., "SAND-4"
  conversations: Conversation[]; // Keep for backward compatibility
  messages: Message[];
  config?: ThreadConfig; // Roleplay configuration
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

// Simple API request for Perplexity proxy
export interface PerplexityRequest {
  message: string;
}

// New chat thread creation
export interface NewThreadPrompt {
  botName: string;
  rules: string;
}
