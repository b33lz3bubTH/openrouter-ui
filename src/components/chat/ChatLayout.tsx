import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';

export const ChatLayout = () => {
  const {
    threads,
    activeThread,
    activeThreadId,
    isLoading,
    createNewThread,
    sendMessage,
    selectThread,
    deleteThread
  } = useChat();

  const handleSendMessage = (message: string) => {
    sendMessage(message, activeThreadId || undefined);
  };

  return (
    <div className="flex h-screen bg-chat-background">
      <ChatSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onNewChat={createNewThread}
        onSelectThread={selectThread}
        onDeleteThread={deleteThread}
      />
      
      <div className="flex-1 flex flex-col">
        <ChatArea thread={activeThread || null} />
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={false}
        />
      </div>
    </div>
  );
};