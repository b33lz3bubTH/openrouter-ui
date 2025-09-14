import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatThread } from '@/types/chat';
import { User, Bot, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ChatAreaProps {
  activeThread: ChatThread | undefined;
  isLoading: boolean;
}

export const ChatArea = ({ activeThread, isLoading }: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [activeThread?.messages]);

  if (!activeThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="w-12 h-12 bg-foreground rounded-lg transform rotate-12 absolute left-1/2 top-0 -translate-x-1/2"></div>
            <div className="w-12 h-12 bg-muted-foreground rounded-lg transform -rotate-12 mx-auto"></div>
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">
            Welcome to Sand
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Start a conversation by typing a message below. I'll help you with any questions you have.
          </p>
        </div>
      </div>
    );
  }

  if (activeThread.messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="w-12 h-12 bg-foreground rounded-lg transform rotate-12 absolute left-1/2 top-0 -translate-x-1/2"></div>
            <div className="w-12 h-12 bg-muted-foreground rounded-lg transform -rotate-12 mx-auto"></div>
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">
            {activeThread.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            This is a new conversation. Type a message below to get started.
          </p>
          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground/70">• "What is React?"</p>
              <p className="text-xs text-muted-foreground/70">• "How do I create a pricing section?"</p>
              <p className="text-xs text-muted-foreground/70">• "Explain TypeScript"</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 bg-background">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {activeThread.messages.map((message) => (
          <div key={message.id} className="space-y-4">
            {message.role === 'user' ? (
              // User Message
              <div className="flex justify-end">
                <div className="flex items-start space-x-3 max-w-[80%]">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <p className="text-foreground text-sm leading-relaxed">
                      {message.content}
                    </p>
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing your request...</span>
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
        ))}
        
        {/* Show global loading indicator when there are active requests */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sand is processing multiple requests...</span>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
