import { MessageSquare, Plus, Trash2 } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { ChatThread } from "@/types/chat";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}

export function AppSidebar({
  threads,
  activeThreadId,
  onNewChat,
  onSelectThread,
  onDeleteThread
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Button onClick={onNewChat} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      "w-full justify-start group",
                      activeThreadId === thread.id && "bg-muted"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{thread.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {thread.conversations.length} messages
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-auto p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(thread.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {threads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}