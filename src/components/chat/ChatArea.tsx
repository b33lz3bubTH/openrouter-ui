import { ScrollArea } from '@/components/ui/scroll-area';
import { SplineLogo } from '@/components/ui/SplineLogo';
import { ChatThread } from '@/types/chat';
import { User, Bot, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ChatAreaProps {
  activeThread: ChatThread | undefined;
  isLoading: boolean;
}

export const ChatArea = ({ activeThread, isLoading }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Debug logging
  console.log('📝 ChatArea props:', { 
    activeThread: activeThread?.id, 
    messagesCount: activeThread?.messages?.length,
    isLoading 
  });

  // Sort messages by sequence before rendering
  const sortedMessages = [...(activeThread?.messages || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        console.log('[ChatArea] scrollToBottom: height', scrollContainer.scrollHeight, 'top(before)', scrollContainer.scrollTop);
        
        // Force scroll to bottom by setting scrollTop to a very large value
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        
        // If that doesn't work, try setting scrollHeight directly
        if (scrollContainer.scrollTop === 0) {
          scrollContainer.setAttribute('scrollHeight', scrollContainer.scrollHeight.toString());
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
        
        console.log('[ChatArea] scrollToBottom: top(after)', scrollContainer.scrollTop);
      }
    };

    // Use multiple attempts to ensure scrolling works
    if (sortedMessages.length > 0) {
      // Immediate attempt
      scrollToBottom();
      
      // Delayed attempt after content renders
      setTimeout(scrollToBottom, 100);
      
      // Final attempt after all animations
      setTimeout(scrollToBottom, 300);
    }
  }, [sortedMessages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (activeThread && sortedMessages.length > 0) {
      const scrollToBottom = () => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          console.log('[ChatArea] Initial scroll: height', scrollContainer.scrollHeight);
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          
          // Force scroll if needed
          if (scrollContainer.scrollTop === 0) {
            scrollContainer.setAttribute('scrollHeight', scrollContainer.scrollHeight.toString());
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      };

      // Multiple attempts for initial load
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 200);
      setTimeout(scrollToBottom, 500);
    }
  }, [activeThread?.id]);

  // MutationObserver to detect DOM changes and force scroll
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      console.log('[ChatArea] DOM changed, forcing scroll');
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      
      // Force scroll if needed
      if (scrollContainer.scrollTop === 0) {
        scrollContainer.setAttribute('scrollHeight', scrollContainer.scrollHeight.toString());
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });

    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [activeThread?.id]);

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

  if (sortedMessages.length === 0) {
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
        {sortedMessages.map((message) => {
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
        
        {/* Force scroll to bottom using scrollIntoView as fallback */}
        {sortedMessages.length > 0 && (
          <div 
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '1px',
              pointerEvents: 'none'
            }}
            ref={(el) => {
              if (el && sortedMessages.length > 0) {
                setTimeout(() => {
                  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
              }
            }}
          />
        )}
      </div>
    </ScrollArea>
  );
};
