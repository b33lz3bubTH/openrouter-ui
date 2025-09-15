import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Mic, X } from 'lucide-react';
import { useSiriToast } from '@/hooks/useSiriToast';

interface ChatInputProps {
  onSendMessage: (message: string, image?: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useSiriToast();

  const handleSubmit = () => {
    if (!message.trim() || isLoading) return;
    onSendMessage(message, pastedImage || undefined);
    setMessage('');
    setPastedImage(null);
    toast.info("Message sent! 📨");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setPastedImage(base64);
          toast.info("Image pasted! 📷");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPastedImage(base64);
        toast.info("Image selected! 📷");
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPastedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t bg-card p-4">
      <div className="max-w-4xl mx-auto">
        {/* Image Preview */}
        {pastedImage && (
          <div className="mb-3 relative inline-block">
            <img 
              src={pastedImage} 
              alt="Pasted" 
              className="max-w-32 max-h-32 rounded-lg border"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <div className="relative flex items-end space-x-3">
          {/* Input Area */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Ask me anything... (Ctrl+V to paste images)"
              className="min-h-[52px] max-h-32 resize-none rounded-xl pr-20 py-3 bg-background border-input focus:border-ring focus:ring-0 text-foreground placeholder-muted-foreground"
              disabled={isLoading}
            />
            
            {/* Input Actions */}
            <div className="absolute right-3 bottom-3 flex items-center space-x-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
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
