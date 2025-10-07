import { MessageSquare, Plus, Trash2, Settings, Info, Sun, Moon, ChevronLeft } from "lucide-react";
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
  const { open, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-3 border-b">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Logo/Title - only show when expanded */}
          {open && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="font-semibold text-lg truncate">{commonConfig.projectName}</span>
            </div>
          )}
          
          {/* Collapse Button */}
          <Button 
            variant="ghost" 
            size="icon"
            className={cn("h-8 w-8 flex-shrink-0", !open && "mx-auto")}
            onClick={toggleSidebar}
            title={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !open && "rotate-180")} />
          </Button>
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={onNewChat} 
          className={cn("w-full gap-2", !open && "aspect-square p-0")}
          variant="default"
          title={!open ? "New Chat" : undefined}
        >
          <Plus className={cn("h-4 w-4 flex-shrink-0", !open && "m-0")} />
          {open && <span>New Chat</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Recent Chats */}
        {threads.length > 0 && (
          <SidebarGroup>
            {open && (
              <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground mb-2">
                Recent Chats
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
                        "group relative w-full gap-2",
                        activeThreadId === thread.id && "bg-accent",
                        !open && "justify-center aspect-square p-2"
                      )}
                      tooltip={!open ? thread.title : undefined}
                    >
                      <MessageSquare className={cn("h-4 w-4 flex-shrink-0", !open && "m-0")} />
                      {open && (
                        <>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="truncate text-sm font-medium">
                              {thread.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {thread.displayId} • {thread.messages.length} msg
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteThread(thread.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
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

      <SidebarFooter className="p-3 border-t mt-auto">
        {open ? (
          <div className="flex items-center justify-between gap-2">
            {/* Navigation Buttons */}
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate('/about')}
                title="About"
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate('/settings')}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
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
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onClearAll}
                title="Clear all data"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Collapsed state - show icons vertically
          <div className="flex flex-col gap-1 items-center">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/about')}
              title="About"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Light mode" : "Dark mode"}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onClearAll}
              title="Clear all data"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
