import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusIcon, MessageSquareIcon, Trash2Icon } from 'lucide-react';
import { ChatThread } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

export const ChatSidebar = ({
  threads,
  activeThreadId,
  onNewChat,
  onSelectThread,
  onDeleteThread
}: ChatSidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const threadsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current, 
        { x: -300, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    if (threadsRef.current && threads.length > 0) {
      const threadElements = threadsRef.current.querySelectorAll('.thread-item');
      const latestThread = threadElements[0];
      
      if (latestThread) {
        gsap.fromTo(latestThread,
          { x: -20, opacity: 0, scale: 0.95 },
          { x: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
        );
      }
    }
  }, [threads.length]);

  const handleNewChat = () => {
    const button = document.querySelector('.new-chat-btn');
    if (button) {
      gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }
    onNewChat();
  };

  const handleThreadClick = (threadId: string) => {
    const clickedElement = document.querySelector(`[data-thread-id="${threadId}"]`);
    if (clickedElement) {
      gsap.to(clickedElement, {
        scale: 0.98,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }
    onSelectThread(threadId);
  };

  return (
    <div 
      ref={sidebarRef}
      className="w-80 h-full bg-chat-sidebar border-r border-border flex flex-col"
    >
      <div className="p-4 border-b border-border">
        <Button
          onClick={handleNewChat}
          className="new-chat-btn w-full bg-gradient-primary hover:opacity-90 text-white font-medium shadow-primary"
          size="lg"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div ref={threadsRef} className="p-2 space-y-2">
          {threads.map((thread) => (
            <div
              key={thread.id}
              data-thread-id={thread.id}
              className={cn(
                "thread-item group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-chat-hover",
                activeThreadId === thread.id 
                  ? "bg-primary/10 border border-primary/20 shadow-glow" 
                  : "hover:shadow-sm"
              )}
              onClick={() => handleThreadClick(thread.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <MessageSquareIcon className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
                    <h3 className={cn(
                      "text-sm font-medium truncate",
                      activeThreadId === thread.id ? "text-primary" : "text-foreground"
                    )}>
                      {thread.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {thread.updatedAt.toLocaleDateString()}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                >
                  <Trash2Icon className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          
          {threads.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquareIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No chats yet</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};