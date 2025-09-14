export interface Conversation {
  user: string;
  bot: string;
}

export interface ChatThread {
  id: string;
  title: string;
  conversations: Conversation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiRequest {
  threadId: string;
  conversations: Conversation[];
  current_prompt: string;
}

export interface ChatStore {
  threads: ChatThread[];
  activeThreadId: string | null;
  isLoading: boolean;
}