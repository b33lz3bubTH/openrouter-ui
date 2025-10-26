import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message, ThreadConfig, NewThreadPrompt } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';
import { Logger } from '@/utils/logger';

const STORAGE_KEY = 'chat-threads';

const generateDisplayId = (index: number): string => {
  return `SAND-${index + 1}`;
};

const loadThreads = async (): Promise<ChatThread[]> => {
  try {
    Logger.log('Loading threads');
    const conversations = await ChatService.getConversations();
    const threads: ChatThread[] = [];

    for (const conversation of conversations) {
      await ChatService.fixMessageSequences(conversation.id); // Fix sequences before loading messages
      const messages = await ChatService.getMessagesByConversation(conversation.id);
      const config = await ChatService.getThreadConfig(conversation.id);
      Logger.log('Loaded messages for conversation', { conversationId: conversation.id, messages, config });
      threads.push({
        id: conversation.id,
        title: conversation.title,
        displayId: generateDisplayId(threads.length),
        conversations: [],
        messages: messages
          .filter((msg) => msg.content.trim() !== '') // Filter out empty messages (failed responses)
          .map((msg) => ({
            id: msg.id,
            role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            sequence: msg.sequence, // Ensure sequence is included
            isDelivered: msg.isDelivered !== false, // Default to true if not specified
          }))
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0)), // Sort by sequence
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        config: config || {
          botName: 'Bot',
          rules: '',
          userName: 'User',
        },
      });
    }

    Logger.log('Loaded threads', { threads });
    return threads;
  } catch (error) {
    Logger.error('Error loading threads', error);
    return [];
  }
};

const saveThreads = async (threads: ChatThread[]): Promise<void> => {
  try {
    Logger.log('Saving threads', { threads });
    for (const thread of threads) {
      await ChatService.saveConversation(
        thread.id,
        thread.title,
        thread.createdAt.getTime(),
        thread.updatedAt.getTime()
      );

      // Save thread config if it exists
      if (thread.config) {
        await ChatService.saveThreadConfig(
          thread.id,
          thread.config.botName,
          thread.config.rules,
          thread.config.userName
        );
      }

      for (let i = 0; i < thread.messages.length; i++) {
        const message = thread.messages[i];
        await ChatService.saveMessage(
          thread.id,
          message.id,
          message.content,
          message.role,
          message.timestamp.getTime(),
          message.sequence, // Pass the sequence number to preserve ordering
          message.isDelivered // Pass the delivery status
        );
      }
    }
    Logger.log('Threads saved successfully');
  } catch (error) {
    Logger.error('Error saving threads', error);
  }
};

const clearThreads = async (): Promise<void> => {
  try {
    Logger.log('Clearing all threads and associated data');
    const conversations = await ChatService.getConversations();
    for (const conversation of conversations) {
      await ChatService.clearMessages(); // Clear all messages
    }
    await ChatService.clearConversations(); // Clear all conversations using ChatService
    Logger.log('All threads and associated data cleared');
  } catch (error) {
    Logger.error('Error clearing threads and associated data', error);
  }
};

export const useChat = () => {
  const { authData } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewChatPrompt, setShowNewChatPrompt] = useState(false);
  
  // Track active requests to handle concurrent responses
  const activeRequests = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const loadedThreads = await loadThreads();
      setThreads(loadedThreads);
    })();
  }, []);

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

    // Calculate next sequence number
    const lastMessage = currentThread.messages[currentThread.messages.length - 1];
    const nextSequence = lastMessage?.sequence ? lastMessage.sequence + 1 : 1;

    // Add user message immediately
    const userMessage: Message = {
      id: uuidv4(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      sequence: nextSequence,
      isDelivered: true // User messages are delivered immediately
    };

    // Add loading assistant message
    const loadingMessage: Message = {
      id: uuidv4(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      sequence: nextSequence + 1,
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
      // Generate context for the message
      const roleplayRules = currentThread.config.rules;
      const context = await ChatService.generateContext(currentThreadId, roleplayRules);
      Logger.log('Sending message with context', { content, context });

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
                    ? { ...msg, content: response, isLoading: false, sequence: msg.sequence }
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

        // Save both user message and assistant response to database
        try {
          // Save user message (delivered)
          await ChatService.saveMessage(
            currentThreadId,
            userMessage.id,
            userMessage.content,
            userMessage.role,
            userMessage.timestamp.getTime(),
            userMessage.sequence,
            true // Mark as delivered
          );

          // Only save assistant response if it has content
          if (response && response.trim() !== '') {
            await ChatService.saveMessage(
              currentThreadId,
              loadingMessage.id,
              response,
              loadingMessage.role,
              loadingMessage.timestamp.getTime(),
              loadingMessage.sequence,
              true // Mark as delivered
            );
          }

          Logger.log('Saved user message and assistant response to database', { 
            userMessage, 
            assistantMessage: response && response.trim() !== '' ? { id: loadingMessage.id, content: response, role: loadingMessage.role } : null
          });
        } catch (saveError) {
          Logger.error('Error saving messages to database', { userMessage, response, saveError });
        }
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Only handle error if request is still active
      if (activeRequests.current.has(requestId)) {
        // Mark user message as undelivered and remove loading message on error
        setThreads(prev => prev.map(thread => 
          thread.id === currentThreadId 
            ? {
                ...thread,
                messages: thread.messages.map(msg => 
                  msg.id === userMessage.id 
                    ? { ...msg, isDelivered: false }
                    : msg
                ).filter(msg => msg.id !== loadingMessage.id)
              }
            : thread
        ));

        // Save the user message to database even on error (but mark as undelivered)
        try {
          await ChatService.saveMessage(
            currentThreadId,
            userMessage.id,
            userMessage.content,
            userMessage.role,
            userMessage.timestamp.getTime(),
            userMessage.sequence,
            false // Mark as undelivered
          );
          Logger.log('Saved undelivered user message to database', { userMessage });
        } catch (saveError) {
          Logger.error('Error saving undelivered user message', { userMessage, saveError });
        }
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

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      Logger.log('Deleting thread', { threadId });
      
      // Delete from database first
      await ChatService.deleteThread(threadId);
      
      // Then remove from UI state
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      
      // Clear active thread if it was the deleted one
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      
      Logger.log('Successfully deleted thread from UI and database', { threadId });
    } catch (error) {
      Logger.error('Error deleting thread', { threadId, error });
      // Still remove from UI even if database deletion fails
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
    }
  }, [activeThreadId]);

  const updateThreadConfig = useCallback((threadId: string, config: ThreadConfig) => {
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, config }
        : thread
    ));
  }, []);

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
    deleteThread,
    updateThreadConfig
  };
};

export { clearThreads };
