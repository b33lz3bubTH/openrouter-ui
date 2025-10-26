import { ScrollArea } from '@/components/ui/scroll-area';
import { SplineLogo } from '@/components/ui/SplineLogo';
import { ChatThread, Message } from '@/types/chat';
import { User, Bot, Loader2, AlertCircle, ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatService } from '@/services/chatService';
import { Button } from '@/components/ui/button';

interface ChatAreaProps {
  activeThread: ChatThread | undefined;
  isLoading: boolean;
}

export const ChatArea = ({ activeThread, isLoading }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Debug logging
  console.log('📝 ChatArea props:', { 
    activeThread: activeThread?.id, 
    messagesCount: activeThread?.messages?.length,
    isLoading,
    displayedMessagesCount: displayedMessages.length,
    hasMoreMessages,
    totalMessageCount
  });

  // Load initial messages when thread changes
  const loadInitialMessages = useCallback(async (threadId: string) => {
    try {
      setIsInitialLoad(true);
      const [recentMessages, totalCount] = await Promise.all([
        ChatService.getRecentMessages(threadId, 11),
        ChatService.getMessageCount(threadId)
      ]);

      const filteredMessages = recentMessages
        .filter((msg) => msg.content.trim() !== '')
        .map((msg) => ({
          id: msg.id,
          role: (msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user') as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          sequence: msg.sequence,
          isDelivered: msg.isDelivered !== false,
        }));

      setDisplayedMessages(filteredMessages);
      setTotalMessageCount(totalCount);
      // Force show button if we have any messages (for testing)
      setHasMoreMessages(filteredMessages.length > 0); // Show button if we have any messages
      
      console.log('📝 Loaded initial messages:', { 
        threadId, 
        loaded: filteredMessages.length, 
        total: totalCount,
        hasMore: filteredMessages.length > 0,
        reason: filteredMessages.length > 0 ? 'Have messages, showing load more button' : 'No messages'
      });
    } catch (error) {
      console.error('Error loading initial messages:', error);
    } finally {
      setIsInitialLoad(false);
    }
  }, []);

  // Load more messages manually (simplified)
  const loadMoreMessages = useCallback(async () => {
    if (!activeThread?.id || isLoadingMore || !hasMoreMessages) return;

    try {
      setIsLoadingMore(true);
      
      const oldestMessage = displayedMessages[0];
      if (!oldestMessage) return;

      const olderMessages = await ChatService.getOlderMessages(
        activeThread.id, 
        oldestMessage.sequence || 0, 
        10
      );

      const filteredOlderMessages = olderMessages
        .filter((msg) => msg.content.trim() !== '')
        .map((msg) => ({
          id: msg.id,
          role: (msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user') as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          sequence: msg.sequence,
          isDelivered: msg.isDelivered !== false,
        }));

      if (filteredOlderMessages.length > 0) {
        setDisplayedMessages(prev => [...filteredOlderMessages, ...prev]);
        setHasMoreMessages(filteredOlderMessages.length === 10);
        console.log('📝 Loaded more messages:', { 
          loaded: filteredOlderMessages.length,
          hasMore: filteredOlderMessages.length === 10
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeThread?.id, displayedMessages, isLoadingMore, hasMoreMessages]);

  // Load initial messages when thread changes
  useEffect(() => {
    if (activeThread?.id) {
      loadInitialMessages(activeThread.id);
    }
  }, [activeThread?.id, loadInitialMessages]);

  // Force scroll to bottom when thread changes and messages are loaded
  useEffect(() => {
    if (activeThread?.id && displayedMessages.length > 0 && !isInitialLoad) {
      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          console.log('📝 Thread changed, scrolling to bottom using scrollIntoView:', {
            threadId: activeThread.id,
            messagesCount: displayedMessages.length
          });
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      };
      
      // Multiple attempts with longer delays for thread changes
      setTimeout(scrollToBottom, 100);
      setTimeout(scrollToBottom, 300);
      setTimeout(scrollToBottom, 600);
    }
  }, [activeThread?.id, displayedMessages.length, isInitialLoad]);

  // Handle scroll events for infinite scroll
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) {
      console.log('📝 Scroll container not found');
      return;
    }

    console.log('📝 Setting up scroll listener for pagination');

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      
      console.log('📝 Scroll event:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        hasMoreMessages,
        isLoadingMore,
        displayedMessagesCount: displayedMessages.length
      });
      
      // More aggressive scroll detection - trigger when near the top
      if (scrollTop <= 300 && hasMoreMessages && !isLoadingMore && !isManualLoading) {
        console.log('📝 Scrolled near top, loading more messages!');
        loadMoreMessages();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also add a manual trigger for testing
    console.log('📝 Scroll listener added, current state:', {
      hasMoreMessages,
      isLoadingMore,
      displayedMessagesCount: displayedMessages.length
    });
    
    return () => {
      console.log('📝 Removing scroll listener');
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages, displayedMessages.length, isManualLoading]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!isInitialLoad && displayedMessages.length > 0) {
      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          console.log('📝 Auto-scrolling to bottom on initial load using scrollIntoView:', {
            messagesCount: displayedMessages.length
          });
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      };
      
      // More aggressive attempts for initial load
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 200);
      setTimeout(scrollToBottom, 500);
      setTimeout(scrollToBottom, 1000);
    }
  }, [isInitialLoad, displayedMessages.length]);

  // Handle new messages from activeThread (real-time updates)
  useEffect(() => {
    if (activeThread?.messages && activeThread.messages.length > 0) {
      // Get the latest messages from activeThread that aren't already in displayedMessages
      const latestMessages = activeThread.messages.slice(-5); // Get last 5 messages
      const existingIds = new Set(displayedMessages.map(msg => msg.id));
      const newMessages = latestMessages.filter(msg => !existingIds.has(msg.id));
      
      if (newMessages.length > 0) {
        setDisplayedMessages(prev => [...prev, ...newMessages]);
        
        // Auto-scroll to bottom when new messages arrive
        const scrollToBottom = () => {
          if (messagesEndRef.current) {
            console.log('📝 Scrolling to bottom for new messages using scrollIntoView:', {
              newMessagesCount: newMessages.length
            });
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        };
        
        // More aggressive attempts for new messages
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 200);
        setTimeout(scrollToBottom, 500);
      }
    }
  }, [activeThread?.messages, displayedMessages]);

  // MutationObserver to detect DOM changes and force scroll to bottom
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      // Only scroll to bottom if we're not loading more messages (to avoid interfering with pagination)
      if (!isLoadingMore && messagesEndRef.current) {
        const scrollToBottom = () => {
          console.log('📝 DOM changed, forcing scroll to bottom using scrollIntoView');
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        };
        
        // More aggressive attempts for DOM changes
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 200);
        setTimeout(scrollToBottom, 500);
      }
    });

    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [isLoadingMore]);

  if (!activeThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="text-center max-w-md">
          <h2 className="text-4xl font-bold mb-4 text-foreground drop-shadow-lg my-5">
            Welcome to Sand
          </h2>
          <p className="leading-relaxed text-lg text-muted-foreground drop-shadow">
            Start a conversation by typing a message below. I'll help you with any questions you have.
          </p>
        </div>
      </div>
    );
  }

  if (displayedMessages.length === 0 && !isInitialLoad) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="text-center max-w-md my-5">
          <h2 className="text-3xl font-bold mb-3 text-foreground drop-shadow-lg">
            {activeThread.title}
          </h2>
          <p className="leading-relaxed mb-6 text-muted-foreground drop-shadow">
            This is a new conversation. Type a message below to get started.
          </p>
        </div>
      </div>
    );
  }


  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 bg-transparent">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Loading indicator for loading more messages */}
        {isLoadingMore && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading older messages...</span>
            </div>
          </div>
        )}

        {/* Load more messages button */}
        {console.log('📝 Button visibility check:', { hasMoreMessages, isLoadingMore, shouldShow: hasMoreMessages && !isLoadingMore })}
        {hasMoreMessages && !isLoadingMore && (
          <div className="text-center py-2">
            <Button
              onClick={loadMoreMessages}
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-full p-0 hover:bg-accent"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        )}

        {displayedMessages.map((message) => {
          console.log('📝 Rendering message:', message);
          return (
            <div key={message.id} className="space-y-4">
              {message.role === 'user' ? (
                // User Message
                <div className="flex justify-end">
                  <div className="flex items-start space-x-3 max-w-[80%]">
                    <div className={`rounded-2xl px-4 py-3 ${message.isDelivered === false ? 'bg-destructive/20 border border-destructive/30' : 'bg-muted'}`}>
                      <p className={`text-sm leading-relaxed ${message.isDelivered === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {message.content}
                      </p>
                      {message.hasImage && (
                        <div className="mt-2 text-xs text-muted-foreground/70">
                          📎 Image attached
                        </div>
                      )}
                      {message.isDelivered === false && (
                        <div className="mt-2 flex items-center text-xs text-destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Message not delivered
                        </div>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                // Assistant Message
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
                      <div className="relative">
                        <div className="w-3 h-3 bg-background rounded-sm transform rotate-12 absolute"></div>
                        <div className="w-3 h-3 bg-muted rounded-sm transform -rotate-12"></div>
                      </div>
                    </div>
                    <div className="bg-card border rounded-2xl px-4 py-3 min-w-[100px]">
                      {message.isLoading ? (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-sm">{activeThread?.config?.botName} is typing...</span>
                        </div>
                      ) : (
                        <p className="text-card-foreground text-sm leading-relaxed">
                          {message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Show global loading indicator when there are active requests
        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sand is processing multiple requests...</span>
            </div>
          </div>
        )} */}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
