import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onNewChat={createNewThread}
          onSelectThread={selectThread}
          onDeleteThread={deleteThread}
        />
        
        <div className="flex-1 flex flex-col h-screen">
          {/* Header - Fixed */}
          <header className="flex-shrink-0 h-14 flex items-center justify-between border-b bg-card px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-6 h-6 bg-foreground rounded-sm transform rotate-12 absolute"></div>
                  <div className="w-6 h-6 bg-muted-foreground rounded-sm transform -rotate-12"></div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {activeThread?.displayId || 'New Chat'}
                  </div>
                  {activeThread && (
                    <div className="text-xs text-muted-foreground">
                      {activeThread.messages.length} messages
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </header>
          
          {/* Chat Area - Scrollable, takes remaining space */}
          <div className="flex-1 overflow-auto">
            <ChatArea 
              activeThread={activeThread}
              isLoading={isLoading}
            />
          </div>
          
          {/* Chat Input - Fixed at bottom */}
          <div className="flex-shrink-0">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};
