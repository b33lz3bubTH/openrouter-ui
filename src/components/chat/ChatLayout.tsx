import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { NewChatPrompt } from "@/components/NewChatPrompt";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { SplineBackground } from "@/components/ui/SplineBackground";
import { MoreHorizontal } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSiriToast } from "@/hooks/useSiriToast";

export const ChatLayout = () => {
  const {
    threads,
    activeThread,
    activeThreadId,
    isLoading,
    showNewChatPrompt,
    createNewThread,
    handleNewThreadPrompt,
    cancelNewChatPrompt,
    sendMessage,
    selectThread,
    deleteThread
  } = useChat();

  const handleSendMessage = (message: string, image?: string) => {
    sendMessage(message, activeThreadId || undefined, image);
  };

  const { theme } = useTheme();
  const toast = useSiriToast();
  
  // Use theme-specific opacity if no custom opacity is provided
  const backgroundOpacity = theme === 'light' ? 0.1 : 0.8;

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Spline Background */}
      <SplineBackground opacity={backgroundOpacity}/>
      
      <div className="min-h-screen flex w-full bg-transparent">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onNewChat={createNewThread}
          onSelectThread={selectThread}
          onDeleteThread={deleteThread}
          onClearAll={() => {
            if (window.confirm('Clear all chat history and logout? This cannot be undone.')) {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }
          }}
        />
        
        <div className="flex-1 flex flex-col h-screen">
          {/* Header - Fixed */}
          <header className="flex-shrink-0 h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {activeThread?.title || 'No Active Chat'}
                </span>
                {activeThread?.config && (
                  <span className="text-xs text-muted-foreground">
                    {activeThread.config.userName} ↔ {activeThread.config.botName}
                  </span>
                )}
              </div>
            </div>
            
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </header>

          {/* Chat Content - Scrollable */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1">
              <ChatArea 
                activeThread={activeThread}
                isLoading={isLoading}
              />
            </div>
            
            {/* Chat Input - Fixed */}
            <div className="flex-shrink-0">
              <ChatInput 
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* New Chat Prompt Dialog */}
      {showNewChatPrompt && (
        <NewChatPrompt
          onSubmit={handleNewThreadPrompt}
          onCancel={cancelNewChatPrompt}
        />
      )}
    </SidebarProvider>
  );
};
