import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
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
    createNewThread,
    sendMessage,
    selectThread,
    deleteThread
  } = useChat();

  const handleSendMessage = (message: string) => {
    sendMessage(message, activeThreadId || undefined);
  };

  const { theme } = useTheme();
  const toast = useSiriToast();
  
  // Use theme-specific opacity if no custom opacity is provided
  const backgroundOpacity = theme === 'light' ? 0.1 : 0.8;

  return (
    <SidebarProvider>
      {/* Spline Background */}
      <SplineBackground opacity={backgroundOpacity}/>
      
      <div className="min-h-screen flex w-full bg-transparent">
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
                {/* <SplineLogo size="sm" /> */}
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => toast.success("Siri-style toast working! 🎉")}
                title="Test Toast"
              >
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
