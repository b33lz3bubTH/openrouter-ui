import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserIcon, BotIcon } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

const TypingIndicator = () => (
  <div className="flex space-x-1 p-4">
    <div className="w-2 h-2 bg-primary rounded-full animate-typing-dots"></div>
    <div className="w-2 h-2 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '0.2s' }}></div>
    <div className="w-2 h-2 bg-primary rounded-full animate-typing-dots" style={{ animationDelay: '0.4s' }}></div>
  </div>
);

export const MessageBubble = ({ message, isLatest }: MessageBubbleProps) => {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current && isLatest) {
      gsap.fromTo(messageRef.current,
        { 
          y: 30, 
          opacity: 0, 
          scale: 0.95 
        },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1, 
          duration: 0.5, 
          ease: "back.out(1.7)" 
        }
      );
    }
  }, [isLatest]);

  const isUser = message.role === 'user';

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[80%] space-x-3",
        isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
      )}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className={cn(
            isUser 
              ? "bg-primary text-primary-foreground" 
              : "bg-secondary text-secondary-foreground"
          )}>
            {isUser ? <UserIcon className="w-4 h-4" /> : <BotIcon className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-message",
          isUser 
            ? "bg-gradient-message text-white ml-4" 
            : "bg-chat-messageAssistant text-foreground mr-4"
        )}>
          {message.isTyping ? (
            <TypingIndicator />
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}
          
          {!message.isTyping && (
            <div className={cn(
              "text-xs mt-2 opacity-70",
              isUser ? "text-white/70" : "text-muted-foreground"
            )}>
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};