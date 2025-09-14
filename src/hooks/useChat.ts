import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message } from '@/types/chat';

const mockPerplexityResponse = async (message: string): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const responses = [
    `Based on your question about "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}", I can provide some insights. This is a detailed response from Perplexity AI that would normally be generated based on real-time web search and AI analysis.`,
    `Interesting question! Let me break this down for you. According to recent sources, there are several key points to consider regarding "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}". Here's what the latest information suggests...`,
    `Great question! I've searched through the most current information available. Here's a comprehensive answer to your query about "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}". The key findings indicate...`,
    `Let me help you with that. Based on the latest data and sources, here's what I found about "${message.slice(0, 30)}${message.length > 30 ? '...' : ''}". This information is current as of today and includes insights from multiple reliable sources...`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

export const useChat = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createNewThread = useCallback(() => {
    const newThread: ChatThread = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
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

    const userMessage: Message = {
      id: uuidv4(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    // Add user message
    setThreads(prev => prev.map(thread => 
      thread.id === currentThreadId 
        ? {
            ...thread,
            messages: [...thread.messages, userMessage],
            title: thread.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : thread.title,
            updatedAt: new Date()
          }
        : thread
    ));

    // Add typing indicator
    const typingMessage: Message = {
      id: uuidv4(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true
    };

    setThreads(prev => prev.map(thread => 
      thread.id === currentThreadId 
        ? {
            ...thread,
            messages: [...thread.messages, typingMessage]
          }
        : thread
    ));

    setIsLoading(true);

    try {
      const response = await mockPerplexityResponse(content);
      
      // Remove typing indicator and add real response
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? {
              ...thread,
              messages: thread.messages.filter(msg => !msg.isTyping).concat({
                id: uuidv4(),
                content: response,
                role: 'assistant',
                timestamp: new Date()
              }),
              updatedAt: new Date()
            }
          : thread
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove typing indicator on error
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? {
              ...thread,
              messages: thread.messages.filter(msg => !msg.isTyping)
            }
          : thread
      ));
    } finally {
      setIsLoading(false);
    }
  }, [activeThreadId, createNewThread]);

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