import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message } from '@/types/chat';

const STORAGE_KEY = 'chat-threads';

const generateDisplayId = (index: number): string => {
  return `SAND-${index + 1}`;
};

// Backend API request structure
interface BackendRequest {
  threadId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  currentMessage: string;
}

// Mock API responses with realistic LLM timing and context
const getMockResponse = async (backendRequest: BackendRequest): Promise<string> => {
  // Log what's being sent to backend
  console.log('🚀 SENDING TO BACKEND:', JSON.stringify(backendRequest, null, 2));
  
  // Simulate real LLM response time (5-12 seconds)
  const delay = 5000 + Math.random() * 7000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const { currentMessage, messages } = backendRequest;
  const contextLength = messages.length;
  
  const responses = [
    `Based on your question "${currentMessage.slice(0, 30)}${currentMessage.length > 30 ? '...' : ''}" and our conversation history (${contextLength} previous messages), here's what I found. This response considers the full context of our discussion and provides comprehensive insights from current sources.`,
    `I've analyzed your query about "${currentMessage.slice(0, 30)}${currentMessage.length > 30 ? '...' : ''}" in the context of our ${contextLength} previous exchanges. Here are the key findings that build upon our conversation thread.`,
    `Great follow-up question! Regarding "${currentMessage.slice(0, 30)}${currentMessage.length > 30 ? '...' : ''}", considering our conversation history, the current data suggests several important points that I'll break down for you.`,
    `Let me help with that. Based on your question "${currentMessage.slice(0, 30)}${currentMessage.length > 30 ? '...' : ''}" and the context from our ${contextLength} previous messages, here's a comprehensive answer with the most up-to-date information.`,
    `That's an interesting question about "${currentMessage.slice(0, 30)}${currentMessage.length > 30 ? '...' : ''}". Considering our conversation thread, let me provide you with a detailed explanation that builds on what we've discussed.`,
    `I understand you're asking about "${currentMessage.slice(0, 30)}${currentMessage.length > 30 ? '...' : ''}". Based on our conversation context (${contextLength} messages), here's what I can tell you from current sources and real-time data.`
  ];
  
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  // Log the mock response
  console.log('✅ MOCK RESPONSE:', response);
  
  return response;
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
  const [threads, setThreads] = useState<ChatThread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track active requests to handle concurrent responses
  const activeRequests = useRef<Set<string>>(new Set());

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  // Create new thread - this should clear context and start fresh
  const createNewThread = useCallback(() => {
    // Clear the current active thread to create fresh context
    setActiveThreadId(null);
    
    // Return null to indicate no thread is active (fresh state)
    return null;
  }, []);

  const sendMessage = useCallback(async (content: string, threadId?: string) => {
    if (!content.trim()) return;

    let currentThreadId = threadId || activeThreadId;
    
    // Auto-create thread if none exists (fresh context)
    if (!currentThreadId) {
      const threadIndex = threads.length;
      
      // Create thread title with 100 char limit and truncation
      const threadTitle = content.length > 100 
        ? content.slice(0, 100) + '...' 
        : content;
      
      const newThread: ChatThread = {
        id: uuidv4(),
        title: threadTitle,
        displayId: generateDisplayId(threadIndex),
        conversations: [], // Keep for backward compatibility
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add the new thread and set it as active
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
      currentThreadId = newThread.id;
    }

    // Get current thread for context
    const currentThread = threads.find(t => t.id === currentThreadId);
    if (!currentThread) return;

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

    // Update thread with user message and loading state immediately
    setThreads(prev => {
      return prev.map(thread => {
        if (thread.id === currentThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, userMessage, loadingMessage],
            updatedAt: new Date()
          };
        }
        return thread;
      });
    });

    // Set loading state only if this is the first active request
    if (activeRequests.current.size === 1) {
      setIsLoading(true);
    }

    try {
      // Prepare backend request with full conversation context
      const backendRequest: BackendRequest = {
        threadId: currentThreadId,
        messages: currentThread.messages
          .filter(msg => !msg.isLoading) // Don't send loading messages
          .map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          })),
        currentMessage: content.trim()
      };

      // Get mock response with full context (this runs concurrently)
      const response = await getMockResponse(backendRequest);
      
      // Only update if this request is still active (not cancelled)
      if (activeRequests.current.has(requestId)) {
        // Update thread with assistant response
        setThreads(prev => {
          return prev.map(thread => {
            if (thread.id === currentThreadId) {
              return {
                ...thread,
                messages: thread.messages.map(msg => 
                  msg.id === loadingMessage.id 
                    ? { ...msg, content: response, isLoading: false }
                    : msg
                ),
                updatedAt: new Date()
              };
            }
            return thread;
          });
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
  }, [activeThreadId, threads]);

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
