import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

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
    <div className="border-t p-4">
      <div className="max-w-4xl mx-auto flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[50px] resize-none"
          disabled={isLoading}
        />
        <Button 
          onClick={handleSubmit} 
          disabled={!message.trim() || isLoading}
          size="icon"
          className="h-[50px] w-[50px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};