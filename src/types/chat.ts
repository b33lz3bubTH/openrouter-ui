export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sequence?: number;
  isLoading?: boolean;
  hasImage?: boolean;
  isDelivered?: boolean;
  error?: boolean;
  mediaRef?: string; // Reference to media used in this message
  eventType?: 'text' | 'image_request' | 'media_request' | 'file_upload'; // Track the event type that created this message
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
  profilePicture?: string; // Optional profile picture reference
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

// Media management interfaces
export interface BotMedia {
  id: string;
  botId: string;
  mediaId: string;
  type: 'image' | 'video';
  mimeType: string;
  blobData: ArrayBuffer; // Store actual blob data
  blobRef: string; // Blob URL reference
  optimizedDimensions?: {
    width: number;
    height: number;
  };
  createdAt: Date;
  lastUsedAt: Date;
  rotationIndex: number; // For round-robin selection
}

export interface MediaReference {
  id: string;
  messageId: string;
  mediaId: string;
  botId: string;
  createdAt: Date;
}

export interface MediaUploadResult {
  success: boolean;
  mediaId?: string;
  blobRef?: string; // Add blobRef for preview
  error?: string;
  optimizedDimensions?: {
    width: number;
    height: number;
  };
  type: 'image' | 'video';
}
