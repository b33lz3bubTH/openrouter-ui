import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatThread, Message } from '@/types/chat';
import { User, Loader2, AlertCircle, ChevronUp, UserCog2Icon, UserIcon, Bot } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { 
  loadInitialMessages, 
  loadMoreMessages, 
  addNewMessages, 
  resetPagination, 
  setCurrentThread,
  updateMessageErrorState,
  updateMessageDeliveredState 
} from '@/store/chatPaginationSlice';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';

interface ChatAreaProps {
  activeThread: ChatThread | undefined;
  isLoading: boolean;
}

export const ChatArea = ({ activeThread, isLoading }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  
  const {
    displayedMessages: reduxMessages,
    isLoadingMore,
    hasMoreMessages,
    isInitialLoad,
    currentThreadId
  } = useSelector((state: RootState) => state.chatPagination);

  // Convert Redux messages back to proper Message format for rendering
  const displayedMessages: Message[] = reduxMessages.map(msg => ({
    ...msg,
    timestamp: new Date(msg.timestamp) // Convert number back to Date
  }));

  console.log('📝 ChatArea Redux state:', { 
    activeThread: activeThread?.id, 
    currentThreadId,
    displayedMessagesCount: displayedMessages.length,
    hasMoreMessages,
    isLoadingMore,
    isInitialLoad
  });

  // Handle load more messages
  const handleLoadMore = () => {
    if (!activeThread?.id || isLoadingMore || !hasMoreMessages) return;
    
    const oldestMessage = displayedMessages[0];
    if (!oldestMessage?.sequence) return;
    
    dispatch(loadMoreMessages({ 
      threadId: activeThread.id, 
      oldestSequence: oldestMessage.sequence 
    }));
  };

  // Load initial messages when thread changes
  useEffect(() => {
    if (activeThread?.id && activeThread.id !== currentThreadId) {
      dispatch(setCurrentThread(activeThread.id));
      dispatch(loadInitialMessages(activeThread.id));
    }
  }, [activeThread?.id, currentThreadId, dispatch]);

  // Handle new messages from activeThread (real-time updates)
  useEffect(() => {
    if (activeThread?.messages && activeThread.messages.length > 0 && activeThread.id === currentThreadId) {
      const latestMessages = activeThread.messages.slice(-5);
      
      console.log('📝 ChatArea: Processing new messages from activeThread:', {
        totalMessages: activeThread.messages.length,
        latestMessages: latestMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 50) + '...',
          isLoading: msg.isLoading,
          error: msg.error,
          isDelivered: msg.isDelivered
        })),
        currentReduxMessages: displayedMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 50) + '...'
        }))
      });
      
      dispatch(addNewMessages({ messages: latestMessages, threadId: activeThread.id }));
    }
  }, [activeThread?.messages, activeThread?.id, currentThreadId, dispatch]);

  // Sync message states from activeThread to Redux
  useEffect(() => {
    if (activeThread?.messages && activeThread.id === currentThreadId) {
      activeThread.messages.forEach(msg => {
        // Sync error and loading states
        if (msg.error !== undefined || msg.isLoading !== undefined) {
          dispatch(updateMessageErrorState({
            messageId: msg.id,
            error: msg.error || false,
            isLoading: msg.isLoading || false
          }));
        }
        
        // Sync delivered state
        if (msg.isDelivered !== undefined) {
          dispatch(updateMessageDeliveredState({
            messageId: msg.id,
            isDelivered: msg.isDelivered
          }));
        }
      });
    }
  }, [activeThread?.messages, activeThread?.id, currentThreadId, dispatch]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (displayedMessages.length > 0) {
      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      };
      
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 200);
    }
  }, [displayedMessages.length]);

  // Reset pagination when thread changes
  useEffect(() => {
    if (activeThread?.id !== currentThreadId) {
      dispatch(resetPagination());
    }
  }, [activeThread?.id, currentThreadId, dispatch]);



  if (!activeThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="text-center max-w-md">
          <h2 className="text-4xl font-bold mb-4 text-foreground drop-shadow-lg my-5">
            There is no messages in this conversation.
          </h2>
          <p className="leading-relaxed text-lg text-muted-foreground drop-shadow">
            Send `hi` to {activeThread?.config?.botName}.
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
            Send `hi` to {activeThread?.config?.botName}.
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
        {hasMoreMessages && !isLoadingMore && (
          <div className="text-center py-2">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-full p-0 hover:bg-accent"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        )}


        {displayedMessages.map((message) => {
          console.log('📝 ChatArea: Rendering message:', {
            id: message.id,
            role: message.role,
            contentLength: message.content.length,
            contentPreview: message.content.substring(0, 50) + '...',
            isLoading: message.isLoading,
            error: message.error,
            isDelivered: message.isDelivered,
            willRender: message.role === 'user' || (!message.error && (message.isLoading || message.content.trim() !== ''))
          });
          
          return (
            <div key={message.id} className="space-y-4">
              {message.role === 'user' ? (
                // User Message
                <div className="flex justify-end">
                  <div className="flex items-start space-x-3 max-w-[80%] max-sm:max-w-full">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              ) : !message.error ? (
                // Assistant Message - only show if no error
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3 max-w-[80%] max-sm:max-w-full">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
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
                      ) : message.content.trim() !== '' ? (
                        <p className="text-card-foreground text-sm leading-relaxed">
                          {message.content}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
