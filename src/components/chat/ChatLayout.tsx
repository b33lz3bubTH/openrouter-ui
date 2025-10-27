import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { NewChatPrompt } from "@/components/NewChatPrompt";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { SplineBackground } from "@/components/ui/SplineBackground";
import { MoreHorizontal, Menu, Info, Copy, Edit } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSiriToast } from "@/hooks/useSiriToast";
import { ChatService } from '@/services/chatService';
import { Logger } from '@/utils/logger';
import { clearThreads } from '@/hooks/useChat';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

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
    deleteThread,
    updateThreadConfig
  } = useChat();

  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editedRules, setEditedRules] = useState('');

  const handleSendMessage = (message: string, image?: string) => {
    sendMessage(message, activeThreadId || undefined, image);
  };

  const handleCopyRules = () => {
    if (activeThread?.config?.rules) {
      navigator.clipboard.writeText(activeThread.config.rules);
      toast({
        title: "Copied!",
        description: "Roleplay rules copied to clipboard",
      });
    }
  };

  const handleEditRules = () => {
    if (activeThread?.config?.rules) {
      setEditedRules(activeThread.config.rules);
      setIsEditingRules(true);
    }
  };

  const handleSaveRules = () => {
    if (activeThread && editedRules.trim()) {
      updateThreadConfig(activeThread.id, {
        ...activeThread.config!,
        rules: editedRules.trim()
      });
      setIsEditingRules(false);
      toast({
        title: "Saved!",
        description: "Roleplay rules updated",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRules(false);
    setEditedRules('');
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
          onClearAll={async () => {
            if (window.confirm('Clear all chat history and logout? This cannot be undone.')) {
              Logger.log('Clearing all chat history and data');
              await ChatService.clearMessages();
              await ChatService.getConversations().then(async (conversations) => {
                for (const conversation of conversations) {
                  await ChatService.saveConversation(conversation.id, conversation.title, 0, 0); // Clear conversations
                }
              });
              await clearThreads(); // Clear threads
              localStorage.clear();
              sessionStorage.clear();
              Logger.log('All data cleared from IndexedDB, localStorage, and sessionStorage');
              window.location.reload();
            }
          }}
        />
        
        <div className="flex-1 flex flex-col h-screen">
          {/* Header - Fixed */}
          <header className="flex-shrink-0 h-14 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 md:px-6">
            {/* Mobile menu trigger */}
            <SidebarTrigger asChild className="md:hidden">
              <div>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </SidebarTrigger>

            <div className="flex flex-col flex-1 min-w-0 ml-2 md:ml-0">
              <span className="text-sm font-medium truncate">
                {activeThread?.title || 'No Active Chat'}
              </span>
              {activeThread?.config && (
                <span className="text-xs text-muted-foreground truncate green">
                  {/* {activeThread.config.userName} ↔ {activeThread.config.botName} */}
                  Online
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {activeThread?.config?.rules ? (
                    <DropdownMenuItem onClick={() => setShowRulesDialog(true)}>
                      <Info className="h-4 w-4 mr-2" />
                      View Rules
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      <Info className="h-4 w-4 mr-2" />
                      No Rules Set
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

      {/* Rules Dialog */}
      {activeThread?.config?.rules && (
        <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Roleplay Rules
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleCopyRules}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleEditRules}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {isEditingRules ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedRules}
                    onChange={(e) => setEditedRules(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="Enter roleplay rules..."
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveRules}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                  {activeThread.config.rules}
                </pre>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

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
