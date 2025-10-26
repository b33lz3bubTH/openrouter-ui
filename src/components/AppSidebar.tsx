import { MessageSquare, Plus, Trash2, Settings, Info, Sun, Moon, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChatThread } from "@/types/chat";
import { useTheme } from "@/contexts/ThemeContext";
import { commonConfig } from "@/utils/common-config";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => Promise<void>;
  onClearAll: () => void;
}

export function AppSidebar({
  threads,
  activeThreadId,
  onNewChat,
  onSelectThread,
  onDeleteThread,
  onClearAll
}: AppSidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 border-b">
        {/* Logo/Title */}
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
          {open && <span className="font-semibold text-lg truncate">{commonConfig.projectName}</span>}
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={onNewChat} 
          className="w-full gap-2"
          variant="default"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 flex-shrink-0" />
            {open && <span>New Chat</span>}
          </div>
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Recent Chats */}
        {threads.length > 0 && (
          <SidebarGroup>
            {open && (
                <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground mb-2">
                  <span>Recent Chats</span>
                </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {threads.slice(0, 10).map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectThread(thread.id)}
                      isActive={activeThreadId === thread.id}
                      className={cn(
                        "group relative w-full",
                        "px-3 py-2 hover:px-3 hover:py-2",
                        "rounded-md transition-all duration-200",
                        activeThreadId === thread.id && "bg-accent"
                      )}
                      style={{padding: "10%"}}
                      tooltip={!open ? thread.title : undefined}
                    >
                      <div className="flex items-center w-full">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        {open && (
                          <>
                            <div className="flex-1 min-w-0 text-left ml-2">
                              <div className="truncate text-sm font-medium">
                                {thread.title}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {thread.displayId} • {thread.messages.length} msg
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await onDeleteThread(thread.id);
                                } catch (error) {
                                  console.error('Error deleting thread:', error);
                                }
                              }}
                            >
                              <div><Trash2 className="h-3 w-3" /></div>
                            </Button>
                          </>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Empty State - only show when expanded */}
        {threads.length === 0 && open && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t mt-auto">
        <div className={cn("flex gap-2", open ? "flex-row justify-between" : "flex-col")}>
          {/* Navigation Buttons */}
          <div className={cn("flex gap-1", open ? "flex-row" : "flex-col")}>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate('/about')}
              title="About"
            >
              <div><Info className="h-4 w-4" /></div>
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <div><Settings className="h-4 w-4" /></div>
            </Button>
          </div>

          {/* Action Buttons */}
          <div className={cn("flex gap-1", open ? "flex-row" : "flex-col")}>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              <div>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </div>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onClearAll}
              title="Clear all data"
            >
              <div><Trash2 className="h-4 w-4" /></div>
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
