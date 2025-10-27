import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { NewChatPrompt } from "@/components/NewChatPrompt";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { SplineBackground } from "@/components/ui/SplineBackground";
import { MoreHorizontal, Menu, Info, Copy, Edit, Image as ImageIcon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSiriToast } from "@/hooks/useSiriToast";
import { ChatService } from '@/services/chatService';
import { Logger } from '@/utils/logger';
import { clearThreads } from '@/hooks/useChat';
import { MediaService } from '@/services/mediaService';
import { BotMedia } from '@/types/chat';
import { MediaUpload } from '@/components/media/MediaUpload';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

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
  const [botMedia, setBotMedia] = useState<BotMedia[]>([]);
  const [hasMedia, setHasMedia] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);

  const handleSendMessage = (message: string, image?: string) => {
    sendMessage(message, activeThreadId || undefined, image);
  };

  // Load bot media when active thread changes
  useEffect(() => {
    const loadBotMedia = async () => {
      if (activeThreadId) {
        try {
          const media = await MediaService.getBotMedia(activeThreadId);
          setBotMedia(media);
          setHasMedia(media.length > 0);
        } catch (error) {
          console.error('Error loading bot media:', error);
          setBotMedia([]);
          setHasMedia(false);
        }
      } else {
        setBotMedia([]);
        setHasMedia(false);
      }
    };

    loadBotMedia();
  }, [activeThreadId]);

  const handleRequestMedia = async () => {
    if (!activeThreadId) return;

    try {
      const nextMedia = await MediaService.getNextMedia(activeThreadId);
      if (nextMedia) {
        // Send the message with mediaRef directly using the mediaId
        sendMessage('', activeThreadId, undefined, nextMedia.mediaId);
      }
    } catch (error) {
      console.error('Error requesting media:', error);
    }
  };

  const handleCopyRules = () => {
    if (activeThread?.config?.rules) {
      navigator.clipboard.writeText(activeThread.config.rules);
      toast.success("Roleplay rules copied to clipboard");
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
      toast.success("Roleplay rules updated");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRules(false);
    setEditedRules('');
  };

  const handleMediaUploadComplete = (results: any[]) => {
    if (activeThreadId) {
      MediaService.getBotMedia(activeThreadId).then(media => {
        setBotMedia(media);
        setHasMedia(media.length > 0);
      });
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    await MediaService.deleteMedia(mediaId);
    if (activeThreadId) {
      MediaService.getBotMedia(activeThreadId).then(media => {
        setBotMedia(media);
        setHasMedia(media.length > 0);
      });
    }
  };

  const handleNewThreadPromptAsync = async (prompt: any) => {
    await handleNewThreadPrompt(prompt);
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
                  <DropdownMenuItem onClick={() => setShowMediaDialog(true)}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Manage Media
                  </DropdownMenuItem>
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
                onRequestMedia={handleRequestMedia}
                isLoading={isLoading}
                hasMedia={hasMedia}
                botMedia={botMedia.map(m => ({
                  id: m.id || '',
                  mediaId: m.mediaId,
                  type: m.type,
                  blobRef: m.blobRef
                }))}
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

      {/* Media Management Dialog */}
      {showMediaDialog && activeThreadId && (
        <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Bot Media</DialogTitle>
            </DialogHeader>
            <MediaUpload
              botId={activeThreadId}
              onUploadComplete={handleMediaUploadComplete}
              onRemoveMedia={handleRemoveMedia}
              existingMedia={botMedia.map(m => ({
                id: m.id || '',
                mediaId: m.mediaId,
                type: m.type,
                blobRef: m.blobRef
              }))}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* New Chat Prompt Dialog */}
      {showNewChatPrompt && (
        <NewChatPrompt
          onSubmit={handleNewThreadPromptAsync}
          onCancel={cancelNewChatPrompt}
        />
      )}
    </SidebarProvider>
  );
};
