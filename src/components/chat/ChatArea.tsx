import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation } from '@/types/chat';
import { User, Bot } from 'lucide-react';

interface ChatAreaProps {
  conversations: Conversation[];
  isLoading: boolean;
}

export const ChatArea = ({ conversations, isLoading }: ChatAreaProps) => {
  if (conversations.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
          <p className="text-muted-foreground">Ask me anything and I'll help you find answers.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {conversations.map((conversation, index) => (
          <div key={index} className="space-y-4">
            {/* User Message */}
            <div className="flex gap-3 justify-end">
              <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                <p className="text-sm">{conversation.user}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4" />
              </div>
            </div>

            {/* Bot Message */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                <p className="text-sm">{conversation.bot}</p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};