import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message, ThreadConfig, NewThreadPrompt, MediaUploadResult } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';
import { Logger } from '@/utils/logger';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { markEventProcessed, setProcessingEvent } from '@/store/chatEventSlice';
import { MediaService } from '@/services/mediaService';

// Helper function to check if message contains media-related content
const isMediaMessage = (content: string): boolean => {
  if (!content || content.trim() === '') return true;
  
  // Check for media request patterns
  if (content.includes('<request img>') || content.includes('<request media>')) {
    return true;
  }
  
  // Check for Media ID patterns using regex
  const mediaIdPattern = /\[Media ID:\s*[^\]]+\]/i;
  if (mediaIdPattern.test(content)) {
    return true;
  }
  
  return false;
};

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
            role: (msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user') as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            sequence: msg.sequence, // Ensure sequence is included
            isDelivered: msg.isDelivered !== false, // Default to true if not specified
            mediaRef: msg.mediaRef, // Include mediaRef for persistence
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
  const dispatch = useDispatch();
  const chatEvents = useSelector((state: RootState) => state.chatEvents);
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

  // Process Redux events
  useEffect(() => {
    const processEvents = async () => {
      const pendingEvents = chatEvents.pendingEvents.filter(event => 
        event.threadId === activeThreadId && 
        event.id !== chatEvents.processingEventId
      );

      for (const event of pendingEvents) {
        dispatch(setProcessingEvent(event.id));
        
        try {
          await processChatEvent(event);
          dispatch(markEventProcessed(event.id));
        } catch (error) {
          console.error('Error processing chat event:', error);
          dispatch(markEventProcessed(event.id));
        }
      }
    };

    if (activeThreadId && chatEvents.pendingEvents.length > 0) {
      processEvents();
    }
  }, [chatEvents.pendingEvents, activeThreadId, dispatch, chatEvents.processingEventId]);

  // Process individual chat events
  const processChatEvent = useCallback(async (event: any) => {
    if (!authData || !activeThreadId) return;

    const currentThread = threads.find(t => t.id === activeThreadId);
    if (!currentThread || !currentThread.config) return;

    const lastMessage = currentThread.messages[currentThread.messages.length - 1];
    const nextSequence = lastMessage?.sequence ? lastMessage.sequence + 1 : 1;

    // Create user message based on event type
    const userMessage: Message = {
      id: uuidv4(),
      content: event.content,
      role: 'user',
      timestamp: new Date(),
      sequence: nextSequence,
      isDelivered: true,
      eventType: event.type,
      mediaRef: event.metadata?.mediaRef || event.metadata?.imageData
    };

    // Create loading assistant message
    const loadingMessage: Message = {
      id: uuidv4(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      sequence: nextSequence + 1,
      isLoading: true,
      eventType: event.type
    };

    console.log('📸 Created messages:', { 
      userMessage: { id: userMessage.id, content: userMessage.content, mediaRef: userMessage.mediaRef },
      loadingMessage: { id: loadingMessage.id, mediaRef: loadingMessage.mediaRef }
    });

    // Update thread with user message and loading state
    setThreads(prev => prev.map(thread => 
      thread.id === activeThreadId 
        ? { ...thread, messages: [...thread.messages, userMessage, loadingMessage], updatedAt: new Date() }
        : thread
    ));

    // Set loading state
    setIsLoading(true);

    try {
      let response = '';

      if (event.type === 'image_request') {
        // Handle image request - show placeholder response
        response = 'I see you\'ve shared an image with me. Let me analyze it and provide you with relevant information or assistance.';
      } else if (event.type === 'media_request') {
        // Handle media request - get next media from bot
        try {
          const nextMedia = await MediaService.getNextMedia(activeThreadId);
          if (nextMedia) {
            response = `Here's the media you requested: [Media ID: ${nextMedia.mediaId}]`;
            loadingMessage.mediaRef = nextMedia.mediaId;
            console.log('📸 Media request processed:', { mediaId: nextMedia.mediaId, messageId: loadingMessage.id });
          } else {
            response = 'Sorry, I don\'t have any media to share at the moment.';
          }
        } catch (error) {
          console.error('Error getting roleplayRules and next media:', error);
          response = 'Sorry, I encountered an error while retrieving media.';
        }
      } else if (event.type === 'text') {
        // Handle regular text message
        const roleplayRules = currentThread.config.rules;
        const context = await ChatService.generateContext(activeThreadId, roleplayRules);
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
        });

        response = await Promise.race([
          ChatService.sendMessage(
            currentThread.messages.filter(msg => 
              !msg.isLoading && !isMediaMessage(msg.content)
            ),
            event.content,
            currentThread.config.userName,
            currentThread.config.botName,
            currentThread.config.rules,
            activeThreadId,
            event.metadata?.imageData
          ),
          timeoutPromise
        ]);
      }

      // Update thread with assistant response
      setThreads(prev => prev.map(thread => 
        thread.id === activeThreadId 
          ? {
              ...thread,
              messages: thread.messages.map(msg => 
                msg.id === loadingMessage.id 
                  ? { ...msg, content: response, isLoading: false }
                  : msg
              ),
              updatedAt: new Date()
            }
          : thread
      ));

      // Save messages to database
      await ChatService.saveMessage(
        activeThreadId,
        userMessage.id,
        userMessage.content,
        userMessage.role,
        userMessage.timestamp.getTime(),
        userMessage.sequence,
        true,
        userMessage.mediaRef
      );

      if (response && response.trim() !== '') {
        await ChatService.saveMessage(
          activeThreadId,
          loadingMessage.id,
          response,
          loadingMessage.role,
          loadingMessage.timestamp.getTime(),
          loadingMessage.sequence,
          true,
          loadingMessage.mediaRef
        );
        console.log('📸 Saved assistant message with mediaRef:', { messageId: loadingMessage.id, mediaRef: loadingMessage.mediaRef });
      }

    } catch (error) {
      console.error('Error processing chat event:', error);
      
      // Mark user message as undelivered and show error for assistant message
      setThreads(prev => prev.map(thread => 
        thread.id === activeThreadId 
          ? {
              ...thread,
              messages: thread.messages.map(msg => 
                msg.id === userMessage.id 
                  ? { ...msg, isDelivered: false }
                  : msg.id === loadingMessage.id
                  ? { ...msg, isLoading: false, error: true }
                  : msg
              ),
              updatedAt: new Date()
            }
          : thread
      ));

      // Save user message as undelivered
      await ChatService.saveMessage(
        activeThreadId,
        userMessage.id,
        userMessage.content,
        userMessage.role,
        userMessage.timestamp.getTime(),
        userMessage.sequence,
        false,
        userMessage.mediaRef
      );
    } finally {
      setIsLoading(false);
    }
  }, [authData, activeThreadId, threads]);

  // Create new thread - this should show the prompt dialog
  const createNewThread = useCallback(() => {
    setShowNewChatPrompt(true);
    return null;
  }, []);

  // Handle new thread creation with configuration
  const handleNewThreadPrompt = useCallback(async (prompt: NewThreadPrompt & { uploadedMedia?: MediaUploadResult[] }) => {
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

    // Handle uploaded media if any
    if (prompt.uploadedMedia && prompt.uploadedMedia.length > 0) {
      try {
        // Import MediaService dynamically
        const { MediaService } = await import('@/services/mediaService');
        
        // Move media from temp bot ID to actual thread ID
        for (const mediaResult of prompt.uploadedMedia) {
          if (mediaResult.success && mediaResult.mediaId) {
            // Update the botId in the media record
            await MediaService.moveMediaToBot(mediaResult.mediaId, newThread.id);
          }
        }
        
        // Set first image as profile picture
        const firstImage = prompt.uploadedMedia.find(m => m.success);
        if (firstImage?.mediaId) {
          config.profilePicture = firstImage.mediaId;
        }
        
        console.log('📸 Media transferred to new thread:', {
          threadId: newThread.id,
          mediaCount: prompt.uploadedMedia.length
        });
      } catch (error) {
        console.error('Error handling uploaded media:', error);
      }
    }

    // Add the new thread and set it as active
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setShowNewChatPrompt(false);
  }, [authData, threads.length]);

  const cancelNewChatPrompt = useCallback(() => {
    setShowNewChatPrompt(false);
  }, []);

  const sendMessage = useCallback(async (content: string, threadId?: string, image?: string, mediaRef?: string) => {
    // This function is now deprecated in favor of Redux events
    // It's kept for backward compatibility but should not be used
    console.warn('sendMessage is deprecated. Use Redux events instead.');
  }, []);

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
