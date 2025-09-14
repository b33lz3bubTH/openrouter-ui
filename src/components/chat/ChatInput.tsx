import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Mic } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim() || isLoading) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-card p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end space-x-3">
          {/* Input Area */}
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="min-h-[52px] max-h-32 resize-none rounded-xl pr-20 py-3 bg-background border-input focus:border-ring focus:ring-0 text-foreground placeholder-muted-foreground"
              disabled={isLoading}
            />
            
            {/* Input Actions */}
            <div className="absolute right-3 bottom-3 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading}
              >
                <Mic className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            className="h-[52px] w-[52px] rounded-xl bg-foreground hover:bg-foreground/90 disabled:bg-muted text-background"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Footer Text */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Sand can make mistakes. Consider checking important information.
        </div>
      </div>
    </div>
  );
};
