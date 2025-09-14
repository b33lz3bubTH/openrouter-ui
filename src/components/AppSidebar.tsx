import { MessageSquare, Plus, Trash2, Settings, Info, Menu, User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SplineLogo } from "@/components/ui/SplineLogo";
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
} from "@/components/ui/sidebar";
import { ChatThread, UserProfile } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { commonConfig } from "@/utils/common-config";

interface AppSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

const userProfile: UserProfile = {
  name: commonConfig.projectName,
  initials: commonConfig.projectName.charAt(0)
};

export function AppSidebar({
  threads,
  activeThreadId,
  onNewChat,
  onSelectThread,
  onDeleteThread
}: AppSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar className="border-r bg-sidebar border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {/* Logo and Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {/* <SplineLogo size="sm" /> */}
            <span className="font-bold text-lg text-sidebar-foreground">{commonConfig.projectName}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Menu className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Chat Button */}
        <Button onClick={onNewChat} className="w-full bg-foreground hover:bg-foreground/90 text-background">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-4">
        {/* Recent Chats */}
        {threads.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium">Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {threads.slice(0, 10).map((thread) => (
                  <SidebarMenuItem key={thread.id} className="rounded-md">
                    <SidebarMenuButton
                      onClick={() => onSelectThread(thread.id)}
                      className="w-full h-12 px-3 py-2 flex items-center justify-between group hover:bg-sidebar-accent/50 rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <MessageSquare className="h-4 w-4 text-sidebar-foreground/70" />
                          {activeThreadId === thread.id && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium text-sidebar-foreground leading-tight">
                            {thread.title}
                          </div>
                          <div className="text-xs text-sidebar-foreground/50 leading-tight">
                            {thread.displayId} • {thread.messages.length} msg
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex-shrink-0 hover:bg-sidebar-accent/70"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-sidebar-foreground/70" />
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Empty State */}
        {threads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Click "New Chat" to get started</p>
          </div>
        )}
      </SidebarContent>

      {/* User Profile Footer */}
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile.avatar} />
            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
              {userProfile.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">
              {userProfile.name}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
