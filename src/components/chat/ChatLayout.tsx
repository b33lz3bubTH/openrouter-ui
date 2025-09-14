import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onNewChat={createNewThread}
          onSelectThread={selectThread}
          onDeleteThread={deleteThread}
        />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Perplexity Chat</h1>
          </header>
          
          <ChatArea 
            conversations={activeThread?.conversations || []} 
            isLoading={isLoading}
          />
          
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};