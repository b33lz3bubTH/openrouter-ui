import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message } from '@/types/chat';

const STORAGE_KEY = 'chat-threads';

const generateDisplayId = (index: number): string => {
  return `SAND-${index + 1}`;
};

// Mock API responses with realistic LLM timing
const getMockResponse = async (message: string, requestId: string): Promise<string> => {
  // Simulate real LLM response time (5-12 seconds)
  const delay = 5000 + Math.random() * 7000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const responses = [
    `Based on your question "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}", here's what I found. This is a detailed response with comprehensive insights from current sources and real-time data. The analysis shows multiple perspectives and I've gathered information from various reliable sources to provide you with the most accurate answer possible.`,
    `I've analyzed your query about "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}". Here are the key findings from the latest information available across multiple sources. This comprehensive response includes current data, expert opinions, and practical insights that should help you understand the topic thoroughly.`,
    `Great question! Regarding "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}", the current data suggests several important points that I'll break down for you. After processing information from multiple reliable sources, here's a detailed explanation that covers the main aspects of your inquiry.`,
    `Let me help with that. Based on real-time analysis of "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}", here's a comprehensive answer with the most up-to-date information. I've synthesized data from various sources to provide you with accurate, relevant, and actionable insights.`,
    `That's an interesting question about "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}". Let me provide you with a detailed explanation based on the latest available information. This response incorporates current research, expert analysis, and practical considerations to give you a complete understanding.`,
    `I understand you're asking about "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}". Here's what I can tell you from current sources and real-time data. This comprehensive analysis includes multiple viewpoints and the most recent information available on this topic.`
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
      // Get mock response (this runs concurrently)
      const response = await getMockResponse(content.trim(), requestId);
      
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
      console.error('Error sending message:', error);
      
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
