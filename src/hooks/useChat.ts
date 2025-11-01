import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatThread, Message, ThreadConfig, NewThreadPrompt, MediaUploadResult } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';
import { Logger } from '@/utils/logger';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { markEventProcessed, setProcessingEvent, addBatchedTextEvent, addTextEvent, setBatchTimer, clearBatchTimer } from '@/store/chatEventSlice';
import { addOptimisticMessage, updateMessageContent, updateMessageDeliveredState } from '@/store/chatPaginationSlice';
import { MediaService } from '@/services/mediaService';
import { SummarySchedulerService } from '@/services/summarySchedulerService';
import { MessageBatchingService } from '@/services/messageBatchingService';

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
  const [showNewChatPrompt, setShowNewChatPrompt] = useState(false);
  
  // Track processing state for batched messages
  const processingBatches = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        // First, run migration to ensure compatibility with older versions
        Logger.log('Initializing chat system with migration check');
        await SummarySchedulerService.migrateExistingThreads();

        // Then load threads
        const loadedThreads = await loadThreads();
        setThreads(loadedThreads);

        Logger.log('Chat system initialized successfully');
      } catch (error) {
        Logger.error('Error during chat system initialization', error);
        // Still try to load threads even if migration fails
        try {
          const loadedThreads = await loadThreads();
          setThreads(loadedThreads);
        } catch (loadError) {
          Logger.error('Failed to load threads after migration error', loadError);
          setThreads([]);
        }
      }
    })();
  }, []);

  // Debounce thread saving to prevent excessive saves
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveThreads(threads);
    }, 500); // Save after 500ms of no changes

    return () => clearTimeout(timeoutId);
  }, [threads]);

  // Process Redux events with optimistic UI and 10-second debounce batching
  useEffect(() => {
    const processEvents = async () => {
      const pendingEvents = chatEvents.pendingEvents.filter(event => 
        !chatEvents.processingEventId || event.id !== chatEvents.processingEventId
      );

      for (const event of pendingEvents) {
        // Handle text events with optimistic UI and batching
        if (event.type === 'text') {
          const threadId = event.threadId;
          const currentThread = threads.find(t => t.id === threadId);
          
          if (!currentThread) {
            dispatch(markEventProcessed(event.id));
            continue;
          }

          // Create optimistic user message
          const lastMessage = currentThread.messages[currentThread.messages.length - 1];
          const nextSequence = lastMessage?.sequence ? lastMessage.sequence + 1 : 1;
          
          const optimisticMessage = {
            id: event.id, // Use event ID as message ID for tracking
            content: event.content,
            role: 'user' as const,
            timestamp: event.timestamp,
            sequence: nextSequence,
            isDelivered: undefined, // Pending - will be updated after LLM responds (true = success, false = failed)
            threadId: threadId, // Add threadId for proper thread matching
          };

          // Add to Redux immediately (optimistic UI)
          dispatch(addOptimisticMessage(optimisticMessage));

          // Add to MessageBatchingService with flush callback
          MessageBatchingService.addMessage(
            threadId,
            event.content,
            event.id,
            (messages, messageIds) => {
              // This callback is called when batch is flushed
              // Create ONE batched_text event with all messages combined
              
              Logger.log('📦 Batch flushed - creating single batched event', {
                threadId,
                messageCount: messages.length,
                messageIds,
              });

              // Combine all messages into a single string (separated by newlines)
              // This allows the backend to process them together in one LLM call
              const combinedContent = messages.join('\n\n');

              // Create ONE batched_text event with all messages combined
              dispatch(addBatchedTextEvent({
                content: combinedContent,
                threadId,
                userId: event.userId,
                messageCount: messages.length,
                messageIds: messageIds, // Pass all message IDs for batch updates
              }));

              // Update all message contents but keep isDelivered as undefined (pending)
              // Will be updated to true when LLM succeeds, false when LLM fails
              messageIds.forEach((messageId, index) => {
                dispatch(updateMessageContent({
                  messageId: messageId,
                  content: messages[index],
                  isLoading: false,
                }));
              });
            }
          );

          // Mark event as processed immediately (already shown optimistically)
          dispatch(markEventProcessed(event.id));
        } 
        // Handle batched text events (backend processing)
        else if (event.type === 'batched_text') {
          const batchKey = `${event.threadId}-${event.timestamp}`;
          
          // Prevent duplicate processing
          if (processingBatches.current.has(batchKey)) {
            dispatch(markEventProcessed(event.id));
            continue;
          }
          
          processingBatches.current.add(batchKey);
          dispatch(setProcessingEvent(event.id));
          
          try {
            await processChatEvent(event);
            dispatch(markEventProcessed(event.id));
          } catch (error) {
            console.error('Error processing batched chat event:', error);
            dispatch(markEventProcessed(event.id));
          } finally {
            processingBatches.current.delete(batchKey);
          }
        }
        // Handle other events immediately
        else {
          dispatch(setProcessingEvent(event.id));
          
          try {
            await processChatEvent(event);
            dispatch(markEventProcessed(event.id));
          } catch (error) {
            console.error('Error processing chat event:', error);
            dispatch(markEventProcessed(event.id));
          }
        }
      }
    };

    if (chatEvents.pendingEvents.length > 0) {
      processEvents();
    }
  }, [chatEvents.pendingEvents, dispatch, chatEvents.processingEventId, threads]);

  // Process individual chat events
  const processChatEvent = useCallback(async (event: any) => {
    if (!authData) return;

    // Get the target thread from the event, not from activeThreadId
    const targetThreadId = event.threadId;
    const currentThread = threads.find(t => t.id === targetThreadId);
    if (!currentThread || !currentThread.config) return;

    const lastMessage = currentThread.messages[currentThread.messages.length - 1];
    const nextSequence = lastMessage?.sequence ? lastMessage.sequence + 1 : 1;

    // For batched messages, handle differently - optimistic messages already exist in Redux
    const isBatched = event.type === 'batched_text';
    const messageIds = event.metadata?.messageIds || [];
    const messageCount = event.metadata?.messageCount || 1;

    let userMessage: Message;
    let loadingMessage: Message;

    if (isBatched && messageIds.length > 0) {
      // For batched messages, don't create user messages in thread state
      // They're already in Redux. Just create a loading assistant message
      loadingMessage = {
        id: uuidv4(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        sequence: nextSequence + messageCount,
        isLoading: true,
        eventType: event.type
      };

      // Update thread with loading state only
      setThreads(prev => prev.map(thread => 
        thread.id === targetThreadId 
          ? { ...thread, messages: [...thread.messages, loadingMessage], updatedAt: new Date() }
          : thread
      ));

      // Don't create userMessage for batched - already in Redux
      userMessage = {
        id: messageIds[0], // Use first message ID for reference
        content: event.content,
        role: 'user',
        timestamp: new Date(event.timestamp || Date.now()),
        sequence: nextSequence,
        isDelivered: true,
        eventType: event.type
      };
    } else {
      // For single messages, create normally
      userMessage = {
        id: uuidv4(),
        content: event.content,
        role: 'user',
        timestamp: new Date(event.timestamp || Date.now()),
        sequence: nextSequence,
        isDelivered: true,
        eventType: event.type,
        mediaRef: event.metadata?.mediaRef || event.metadata?.imageData
      };

      loadingMessage = {
        id: uuidv4(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        sequence: nextSequence + 1,
        isLoading: true,
        eventType: event.type
      };

      // Update thread with user message and loading state
      setThreads(prev => prev.map(thread => 
        thread.id === targetThreadId 
          ? { ...thread, messages: [...thread.messages, userMessage, loadingMessage], updatedAt: new Date() }
          : thread
      ));
    }

    try {
      let response = '';

      if (event.type === 'image_request') {
        // Handle image request - show placeholder response
        response = 'I see you\'ve shared an image with me. Let me analyze it and provide you with relevant information or assistance.';
      } else if (event.type === 'media_request') {
        // Handle media request - get next media from bot
        try {
          const nextMedia = await MediaService.getNextMedia(targetThreadId);
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
      } else if (event.type === 'text' || event.type === 'batched_text') {
        // Handle regular text message or batched messages
        const roleplayRules = currentThread.config.rules;
        const context = await ChatService.generateContext(targetThreadId, roleplayRules);
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
        });

        Logger.log(isBatched ? '📦 Processing batched message (single LLM call)' : '📝 Processing single message', {
          threadId: targetThreadId,
          messageCount,
          contentLength: event.content.length,
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
            targetThreadId,
            event.metadata?.imageData
          ),
          timeoutPromise
        ]);
      }

      // Update thread with assistant response
      setThreads(prev => prev.map(thread => 
        thread.id === targetThreadId
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

      // Mark user message(s) as delivered in Redux (LLM call succeeded)
      if (isBatched && messageIds.length > 0) {
        // Mark ALL batched messages as delivered
        messageIds.forEach(messageId => {
          dispatch(updateMessageDeliveredState({
            messageId: messageId,
            isDelivered: true,
          }));
        });
      } else {
        // Mark single message as delivered
        dispatch(updateMessageDeliveredState({
          messageId: userMessage.id,
          isDelivered: true,
        }));
      }

      // Save messages to database
      if (isBatched && messageIds.length > 0) {
        // Save all batched messages individually
        // Parse combined content back to individual messages
        const individualMessages = event.content.split('\n\n');
        for (let i = 0; i < messageIds.length && i < individualMessages.length; i++) {
          await ChatService.saveMessage(
            targetThreadId,
            messageIds[i],
            individualMessages[i],
            'user',
            Date.now(),
            nextSequence + i,
            true
          );
        }
      } else {
        // Save single message
        await ChatService.saveMessage(
          targetThreadId,
          userMessage.id,
          userMessage.content,
          userMessage.role,
          userMessage.timestamp.getTime(),
          userMessage.sequence,
          true,
          userMessage.mediaRef
        );
      }

      // Increment message count for summary tracking (user message)
      await SummarySchedulerService.incrementMessageCount(targetThreadId);

      if (response && response.trim() !== '') {
        await ChatService.saveMessage(
          targetThreadId,
          loadingMessage.id,
          response,
          loadingMessage.role,
          loadingMessage.timestamp.getTime(),
          loadingMessage.sequence,
          true,
          loadingMessage.mediaRef
        );
        console.log('📸 Saved assistant message with mediaRef:', { messageId: loadingMessage.id, mediaRef: loadingMessage.mediaRef });

        // Increment message count for summary tracking
        await SummarySchedulerService.incrementMessageCount(targetThreadId);
      }

      if (event.type === 'text' || event.type === 'batched_text') {
        // Handle summary generation with proper error handling and atomicity
        try {
          const shouldGenerate = await SummarySchedulerService.shouldGenerateOrRetry(targetThreadId);
          if (shouldGenerate) {
            const currentThread = threads.find(t => t.id === targetThreadId);
            if (currentThread && currentThread.config) {
              const recentMessages = currentThread.messages
                .filter(msg => !msg.isLoading && !isMediaMessage(msg.content))
                .slice(-5);

              console.log('🔄 Attempting summary generation', {
                threadId: targetThreadId,
                recentMessagesCount: recentMessages.length
              });

              const summary = await SummarySchedulerService.generateSummaryStrict(
                targetThreadId,
                currentThread.config.rules,
                currentThread.config.botName,
                recentMessages
              );

              // Atomic save operation - thread-specific
              await SummarySchedulerService.saveSummary(targetThreadId, summary);
              console.log('✅ Summary generated and saved for thread', {
                threadId: targetThreadId,
                summaryLength: summary.length
              });
            }
          } else {
            console.log('⏭️ Skipping summary generation', {
              threadId: targetThreadId,
              reason: 'not needed'
            });
          }
        } catch (summaryError) {
          console.error('❌ Summary generation failed for thread', {
            threadId: targetThreadId,
            error: summaryError instanceof Error ? summaryError.message : String(summaryError)
          });

          // Set retry mode so we attempt summary generation on every subsequent message
          await SummarySchedulerService.setRetryMode(targetThreadId);

          // Don't rethrow - summary failure shouldn't break chat flow
          // Next message will retry automatically via shouldGenerateOrRetry
        }
      }

    } catch (error) {
      console.error('Error processing chat event:', error);
      
      // Mark user message(s) as failed in Redux (LLM call failed)
      if (isBatched && messageIds.length > 0) {
        // Mark ALL batched messages as failed
        messageIds.forEach(messageId => {
          dispatch(updateMessageDeliveredState({
            messageId: messageId,
            isDelivered: false,
          }));
        });
      } else {
        // Mark single message as failed
        dispatch(updateMessageDeliveredState({
          messageId: userMessage.id,
          isDelivered: false,
        }));
      }
      
      // Mark user message as undelivered and show error for assistant message
      setThreads(prev => prev.map(thread => 
        thread.id === targetThreadId 
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

      // Save user message(s) as undelivered
      if (isBatched && messageIds.length > 0) {
        // Save all batched messages as undelivered
        const individualMessages = event.content.split('\n\n');
        for (let i = 0; i < messageIds.length && i < individualMessages.length; i++) {
          await ChatService.saveMessage(
            targetThreadId,
            messageIds[i],
            individualMessages[i],
            'user',
            Date.now(),
            nextSequence + i,
            false
          );
        }
      } else {
        // Save single message as undelivered
        await ChatService.saveMessage(
          targetThreadId,
          userMessage.id,
          userMessage.content,
          userMessage.role,
          userMessage.timestamp.getTime(),
          userMessage.sequence,
          false,
          userMessage.mediaRef
        );
      }
    }
  }, [authData, threads, dispatch]);

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
    // Force flush any pending batches for the current thread before switching
    if (activeThreadId && activeThreadId !== threadId) {
      MessageBatchingService.forceFlush(activeThreadId);
    }
    setActiveThreadId(threadId);
    // Note: We don't cancel active requests when switching threads
    // This allows for better UX - responses will still arrive
  }, [activeThreadId]);

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

  // Memoize active thread to prevent unnecessary re-renders
  const activeThread = useMemo(() =>
    threads.find(thread => thread.id === activeThreadId),
    [threads, activeThreadId]
  );

  // Memoize thread count to prevent logging on every render
  const threadCount = threads.length;

  // Only log when important state changes
  useEffect(() => {
    console.log('📝 Current state changed:', {
      threads: threadCount,
      activeThreadId,
      activeThread: activeThread?.id,
      activeThreadMessages: activeThread?.messages?.length
    });
  }, [threadCount, activeThreadId, activeThread?.id, activeThread?.messages?.length]);

  return {
    threads,
    activeThread,
    activeThreadId,
    isLoading: false, // No global loading state - each message handles its own loading
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
