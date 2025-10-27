import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatService } from '@/services/chatService';

// Redux-compatible Message type (with number timestamp for serialization)
interface ReduxMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number; // Number instead of Date for Redux serialization
  sequence?: number;
  isLoading?: boolean;
  hasImage?: boolean;
  isDelivered?: boolean;
  error?: boolean;
}

interface ChatPaginationState {
  displayedMessages: ReduxMessage[];
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  isInitialLoad: boolean;
  currentThreadId: string | null;
  oldestSequence: number | null;
}

const initialState: ChatPaginationState = {
  displayedMessages: [],
  isLoadingMore: false,
  hasMoreMessages: true,
  isInitialLoad: true,
  currentThreadId: null,
  oldestSequence: null,
};

// Async thunk to load initial messages
export const loadInitialMessages = createAsyncThunk(
  'chatPagination/loadInitialMessages',
  async (threadId: string) => {
    const recentMessages = await ChatService.getRecentMessages(threadId, 10);
    
    const filteredMessages = recentMessages
      .filter((msg) => msg.content.trim() !== '')
      .map((msg) => ({
        id: msg.id,
        role: (msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user') as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp, // Keep as number for Redux serialization
        sequence: msg.sequence,
        isDelivered: msg.isDelivered !== false,
      }));

    return {
      messages: filteredMessages,
      threadId,
      oldestSequence: filteredMessages.length > 0 ? filteredMessages[0].sequence : null
    };
  }
);

// Async thunk to load more messages
export const loadMoreMessages = createAsyncThunk(
  'chatPagination/loadMoreMessages',
  async ({ threadId, oldestSequence }: { threadId: string; oldestSequence: number }) => {
    console.log('📝 Redux: Loading more messages', { threadId, oldestSequence });
    
    const olderMessages = await ChatService.getOlderMessages(threadId, oldestSequence, 10);
    console.log('📝 Redux: Retrieved older messages from DB', { count: olderMessages.length });
    
    const filteredOlderMessages = olderMessages
      .filter((msg) => msg.content.trim() !== '')
      .map((msg) => ({
        id: msg.id,
        role: (msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user') as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp, // Keep as number for Redux serialization
        sequence: msg.sequence,
        isDelivered: msg.isDelivered !== false,
      }));

    console.log('📝 Redux: Filtered older messages', { 
      count: filteredOlderMessages.length,
      sequences: filteredOlderMessages.map(m => m.sequence)
    });

    return {
      messages: filteredOlderMessages,
      threadId,
      newOldestSequence: filteredOlderMessages.length > 0 ? filteredOlderMessages[0].sequence : null
    };
  }
);

// Async thunk to add new messages (for real-time updates)
export const addNewMessages = createAsyncThunk(
  'chatPagination/addNewMessages',
  async ({ messages, threadId }: { messages: any[]; threadId: string }) => {
    // Convert Message objects to ReduxMessage (convert Date to number)
    const reduxMessages: ReduxMessage[] = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp
    }));
    
    return { messages: reduxMessages, threadId };
  }
);

const chatPaginationSlice = createSlice({
  name: 'chatPagination',
  initialState,
  reducers: {
    resetPagination: (state) => {
      state.displayedMessages = [];
      state.isLoadingMore = false;
      state.hasMoreMessages = true;
      state.isInitialLoad = true;
      state.currentThreadId = null;
      state.oldestSequence = null;
    },
    setCurrentThread: (state, action: PayloadAction<string | null>) => {
      state.currentThreadId = action.payload;
    },
    updateMessageErrorState: (state, action: PayloadAction<{ messageId: string; error: boolean; isLoading: boolean }>) => {
      const { messageId, error, isLoading } = action.payload;
      const message = state.displayedMessages.find(msg => msg.id === messageId);
      if (message) {
        message.error = error;
        message.isLoading = isLoading;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Load initial messages
      .addCase(loadInitialMessages.pending, (state) => {
        state.isInitialLoad = true;
      })
      .addCase(loadInitialMessages.fulfilled, (state, action) => {
        const { messages, threadId, oldestSequence } = action.payload;
        state.displayedMessages = messages;
        state.currentThreadId = threadId;
        state.oldestSequence = oldestSequence;
        state.hasMoreMessages = true; // Always show button initially
        state.isInitialLoad = false;
        
        console.log('📝 Redux: Initial load completed', {
          threadId,
          loadedCount: messages.length,
          oldestSequence,
          hasMoreMessages: true
        });
      })
      .addCase(loadInitialMessages.rejected, (state) => {
        state.isInitialLoad = false;
      })
      
      // Load more messages
      .addCase(loadMoreMessages.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(loadMoreMessages.fulfilled, (state, action) => {
        const { messages, newOldestSequence } = action.payload;
        
        if (messages.length > 0) {
          // Prepend older messages to the beginning
          state.displayedMessages = [...messages, ...state.displayedMessages];
          state.oldestSequence = newOldestSequence;
          
          // Only hide button when we reach sequence 1 (the very first message)
          // Don't hide based on message count alone
          const hasReachedFirst = newOldestSequence === 1;
          state.hasMoreMessages = !hasReachedFirst;
          
          console.log('📝 Redux: Load more completed', {
            loadedCount: messages.length,
            newOldestSequence,
            hasReachedFirst,
            hasMoreMessages: !hasReachedFirst
          });
        } else {
          state.hasMoreMessages = false;
        }
        
        state.isLoadingMore = false;
      })
      .addCase(loadMoreMessages.rejected, (state) => {
        state.isLoadingMore = false;
      })
      
      // Add new messages (real-time updates)
      .addCase(addNewMessages.fulfilled, (state, action) => {
        const { messages, threadId } = action.payload;
        
        if (state.currentThreadId === threadId) {
          const existingIds = new Set(state.displayedMessages.map(msg => msg.id));
          const newMessages = messages.filter(msg => !existingIds.has(msg.id));
          
          if (newMessages.length > 0) {
            // Append new messages to the end
            state.displayedMessages = [...state.displayedMessages, ...newMessages];
          }
        }
      });
  },
});

export const { resetPagination, setCurrentThread, updateMessageErrorState } = chatPaginationSlice.actions;
export default chatPaginationSlice.reducer;
