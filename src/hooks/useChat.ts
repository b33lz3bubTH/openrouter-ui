import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message, ThreadConfig, NewThreadPrompt } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'chat-threads';

const generateDisplayId = (index: number): string => {
  return `SAND-${index + 1}`;
};

const loadThreads = (): ChatThread[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((thread: any) => ({
        ...thread,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
        messages: thread.messages?.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })) || []
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
  const { authData } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewChatPrompt, setShowNewChatPrompt] = useState(false);
  
  // Track active requests to handle concurrent responses
  const activeRequests = useRef<Set<string>>(new Set());

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  // Create new thread - this should show the prompt dialog
  const createNewThread = useCallback(() => {
    setShowNewChatPrompt(true);
    return null;
  }, []);

  // Handle new thread creation with configuration
  const handleNewThreadPrompt = useCallback((prompt: NewThreadPrompt) => {
    if (!authData) return;

    // For OpenRouter, use default user name since there's no email
    const userName = authData.backend === 'openrouter' 
      ? 'User' 
      : ChatService.extractUserName(authData.email || '');
    
    const threadIndex = threads.length;
    
    const config: ThreadConfig = {
      botName: prompt.botName,
      rules: prompt.rules,
      userName
    };

    const newThread: ChatThread = {
      id: uuidv4(),
      title: `${prompt.botName} Chat`,
      displayId: generateDisplayId(threadIndex),
      conversations: [], // Keep for backward compatibility
      messages: [],
      config,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add the new thread and set it as active
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setShowNewChatPrompt(false);
  }, [authData, threads.length]);

  const cancelNewChatPrompt = useCallback(() => {
    setShowNewChatPrompt(false);
  }, []);

  const sendMessage = useCallback(async (content: string, threadId?: string, image?: string) => {
    if (!content.trim() || !authData) return;

    let currentThreadId = threadId || activeThreadId;
    
    // If no thread is active, we need a configuration first
    if (!currentThreadId) {
      setShowNewChatPrompt(true);
      return;
    }

    // Get current thread for context
    const currentThread = threads.find(t => t.id === currentThreadId);
    if (!currentThread || !currentThread.config) {
      console.error('Thread not found or missing config:', { currentThreadId, currentThread });
      return;
    }

    console.log('📝 Sending message:', { content, currentThreadId, currentThread });

    // Generate unique request ID for this message
    const requestId = uuidv4();
    activeRequests.current.add(requestId);

    // Add user message immediately
    const userMessage: Message = {
      id: uuidv4(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    // Add loading assistant message
    const loadingMessage: Message = {
      id: uuidv4(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isLoading: true
    };

    console.log('📝 Adding messages:', { userMessage, loadingMessage });

    // Update thread with user message and loading state immediately
    setThreads(prev => {
      const updated = prev.map(thread => {
        if (thread.id === currentThreadId) {
          const newThread = {
            ...thread,
            messages: [...thread.messages, userMessage, loadingMessage],
            updatedAt: new Date()
          };
          console.log('📝 Updated thread:', newThread);
          return newThread;
        }
        return thread;
      });
      console.log('📝 All threads after update:', updated);
      return updated;
    });

    // Set loading state only if this is the first active request
    if (activeRequests.current.size === 1) {
      setIsLoading(true);
    }

    try {
      // Call the actual backend service with messages excluding loading messages
      const response = await ChatService.sendMessage(
        currentThread.messages.filter(msg => !msg.isLoading), // Don't send loading messages
        content.trim(),
        currentThread.config.userName,
        currentThread.config.botName,
        currentThread.config.rules,
        image // Pass image data if available
      );
      
      console.log('📝 Backend response:', response);
      
      // Only update if this request is still active (not cancelled)
      if (activeRequests.current.has(requestId)) {
        // Update thread with assistant response
        setThreads(prev => {
          const updated = prev.map(thread => {
            if (thread.id === currentThreadId) {
              const newThread = {
                ...thread,
                messages: thread.messages.map(msg => 
                  msg.id === loadingMessage.id 
                    ? { ...msg, content: response, isLoading: false }
                    : msg
                ),
                updatedAt: new Date()
              };
              console.log('📝 Updated thread with response:', newThread);
              return newThread;
            }
            return thread;
          });
          console.log('📝 All threads after response update:', updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Only handle error if request is still active
      if (activeRequests.current.has(requestId)) {
        // Remove loading message on error
        setThreads(prev => prev.map(thread => 
          thread.id === currentThreadId 
            ? {
                ...thread,
                messages: thread.messages.filter(msg => msg.id !== loadingMessage.id)
              }
            : thread
        ));
      }
    } finally {
      // Remove this request from active requests
      activeRequests.current.delete(requestId);
      
      // Only set loading to false if no more active requests
      if (activeRequests.current.size === 0) {
        setIsLoading(false);
      }
    }
  }, [activeThreadId, threads, authData]);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    // Note: We don't cancel active requests when switching threads
    // This allows for better UX - responses will still arrive
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
  }, [activeThreadId]);

  const activeThread = threads.find(thread => thread.id === activeThreadId);

  console.log('📝 Current state:', { 
    threads: threads.length, 
    activeThreadId, 
    activeThread: activeThread?.id,
    activeThreadMessages: activeThread?.messages?.length 
  });

  return {
    threads,
    activeThread,
    activeThreadId,
    isLoading,
    showNewChatPrompt,
    createNewThread,
    handleNewThreadPrompt,
    cancelNewChatPrompt,
    sendMessage,
    selectThread,
    deleteThread
  };
};
