import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { ChatThread } from '@/types/chat';
import { BotIcon, SparklesIcon } from 'lucide-react';

interface ChatAreaProps {
  thread: ChatThread | null;
}

const EmptyState = () => {
  const emptyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (emptyRef.current) {
      gsap.fromTo(emptyRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div 
      ref={emptyRef}
      className="flex-1 flex items-center justify-center"
    >
      <div className="text-center max-w-md">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-glow">
            <BotIcon className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2">
            <SparklesIcon className="w-6 h-6 text-primary animate-pulse-glow" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 gradient-text">
          Welcome to Perplexity Pro
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Start a conversation with AI-powered search and analysis. 
          Ask anything and get comprehensive, real-time answers.
        </p>
        
        <div className="mt-8 space-y-2">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Try asking:
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>"What's the latest news on AI developments?"</div>
            <div>"Explain quantum computing in simple terms"</div>
            <div>"What are the current trends in web development?"</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatArea = ({ thread }: ChatAreaProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread?.messages]);

  if (!thread) {
    return <EmptyState />;
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        {thread.messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLatest={index === thread.messages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};