import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Conversation, ApiRequest } from '@/types/chat';

const STORAGE_KEY = 'chat-threads';

const mockPerplexityResponse = async (request: ApiRequest): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const responses = [
    `Based on your question "${request.current_prompt.slice(0, 30)}${request.current_prompt.length > 30 ? '...' : ''}", here's what I found. This is a detailed response from Perplexity AI.`,
    `I've analyzed your query about "${request.current_prompt.slice(0, 30)}${request.current_prompt.length > 30 ? '...' : ''}". Here are the key insights from current sources.`,
    `Great question! Regarding "${request.current_prompt.slice(0, 30)}${request.current_prompt.length > 30 ? '...' : ''}", the latest information suggests several important points.`,
    `Let me help with that. Based on real-time data about "${request.current_prompt.slice(0, 30)}${request.current_prompt.length > 30 ? '...' : ''}", here's a comprehensive answer.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

const loadThreads = (): ChatThread[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((thread: any) => ({
        ...thread,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt)
      }));
    }
  } catch (error) {
    console.error('Error loading threads:', error);
  }
  return [];
};

const saveThreads = (threads: ChatThread[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch (error) {
    console.error('Error saving threads:', error);
  }
};

export const useChat = () => {
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const createNewThread = useCallback(() => {
    const newThread: ChatThread = {
      id: uuidv4(),
      title: 'New Chat',
      conversations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    return newThread.id;
  }, []);

  const sendMessage = useCallback(async (content: string, threadId?: string) => {
    if (!content.trim()) return;

    let currentThreadId = threadId || activeThreadId;
    
    if (!currentThreadId) {
      currentThreadId = createNewThread();
    }

    // Get current thread to build conversations array
    const currentThread = threads.find(t => t.id === currentThreadId);
    if (!currentThread) return;

    setIsLoading(true);

    try {
      // Prepare API request
      const apiRequest: ApiRequest = {
        threadId: currentThreadId,
        conversations: currentThread.conversations,
        current_prompt: content.trim()
      };

      const response = await mockPerplexityResponse(apiRequest);
      
      // Create new conversation
      const newConversation: Conversation = {
        user: content.trim(),
        bot: response
      };

      // Update thread with new conversation
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? {
              ...thread,
              conversations: [...thread.conversations, newConversation],
              title: thread.conversations.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : thread.title,
              updatedAt: new Date()
            }
          : thread
      ));
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeThreadId, createNewThread, threads]);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
  }, [activeThreadId]);

  const activeThread = threads.find(thread => thread.id === activeThreadId);

  return {
    threads,
    activeThread,
    activeThreadId,
    isLoading,
    createNewThread,
    sendMessage,
    selectThread,
    deleteThread
  };
};