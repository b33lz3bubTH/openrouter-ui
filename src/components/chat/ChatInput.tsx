import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  const handleSubmit = () => {
    if (!message.trim() || isLoading || disabled) return;
    
    const button = document.querySelector('.send-btn');
    if (button) {
      gsap.to(button, {
        scale: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }
    
    onSendMessage(message);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div 
      ref={containerRef}
      className="border-t border-border bg-background/80 backdrop-blur-sm"
    >
      <div className="max-w-4xl mx-auto p-4">
        <div className="relative flex items-end space-x-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={disabled}
              className={cn(
                "min-h-[50px] max-h-[120px] resize-none bg-chat-input border-border",
                "focus:ring-2 focus:ring-primary focus:border-transparent",
                "placeholder:text-muted-foreground",
                "pr-12 rounded-xl"
              )}
              style={{ height: 'auto' }}
            />
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || disabled}
            className="send-btn bg-gradient-primary hover:opacity-90 disabled:opacity-50 h-[50px] w-[50px] rounded-xl shadow-primary"
            size="sm"
          >
            {isLoading ? (
              <LoaderIcon className="w-5 h-5 animate-spin" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};