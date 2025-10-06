import { MessageSquare, Plus, Trash2, Settings, Info, Sun, Moon } from "lucide-react";
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

interface AppSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {/* Logo and Navigation */}
        <div className="flex items-center justify-between mb-4">
          {open && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-sidebar-foreground">{commonConfig.projectName}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => navigate('/about')}
              title="About"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Chat Button */}
        {open ? (
          <Button onClick={onNewChat} className="w-full bg-foreground hover:bg-foreground/90 text-background">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        ) : (
          <Button onClick={onNewChat} size="icon" className="w-full bg-foreground hover:bg-foreground/90 text-background">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Recent Chats */}
        {threads.length > 0 && (
          <SidebarGroup>
            {open && (
              <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Recent</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {threads.slice(0, 10).map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectThread(thread.id)}
                      isActive={activeThreadId === thread.id}
                      className="group"
                      tooltip={!open ? thread.title : undefined}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {open && (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium">
                              {thread.title}
                            </div>
                            <div className="text-xs text-sidebar-foreground/50">
                              {thread.displayId} • {thread.messages.length} msg
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteThread(thread.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Empty State */}
        {threads.length === 0 && open && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Click "New Chat" to get started</p>
          </div>
        )}
      </SidebarContent>

      {/* Footer Actions */}
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onClearAll}
            title="Clear all data"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
