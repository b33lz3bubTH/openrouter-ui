import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface ChatEvent {
  id: string;
  type: 'text' | 'image_request' | 'media_request' | 'file_upload' | 'batched_text';
  content: string;
  timestamp: number; // Use number instead of Date for Redux serialization
  threadId: string;
  userId: string;
  batchId?: string; // Group related messages in a batch
  metadata?: {
    imageData?: string;
    mediaRef?: string;
    fileName?: string;
    fileSize?: number;
    messageCount?: number; // For batched messages
    messageIds?: string[]; // Array of message IDs for batch processing
  };
}

export interface ChatEventState {
  events: ChatEvent[];
  pendingEvents: ChatEvent[];
  processingEventId: string | null;
  batchTimers: Record<string, number>; // threadId -> timestamp
}

const initialState: ChatEventState = {
  events: [],
  pendingEvents: [],
  processingEventId: null,
  batchTimers: {},
};

const chatEventSlice = createSlice({
  name: 'chatEvents',
  initialState,
  reducers: {
    addTextEvent: (state, action: PayloadAction<{ content: string; threadId: string; userId: string; batchId?: string }>) => {
      const event: ChatEvent = {
        id: uuidv4(),
        type: 'text',
        content: action.payload.content,
        timestamp: Date.now(),
        threadId: action.payload.threadId,
        userId: action.payload.userId,
        batchId: action.payload.batchId,
      };
      state.events.push(event);
      state.pendingEvents.push(event);
    },
    
    addImageRequestEvent: (state, action: PayloadAction<{ threadId: string; userId: string; imageData?: string }>) => {
      const event: ChatEvent = {
        id: uuidv4(),
        type: 'image_request',
        content: '<request img>',
        timestamp: Date.now(),
        threadId: action.payload.threadId,
        userId: action.payload.userId,
        metadata: {
          imageData: action.payload.imageData,
        },
      };
      state.events.push(event);
      state.pendingEvents.push(event);
    },
    
    addMediaRequestEvent: (state, action: PayloadAction<{ threadId: string; userId: string; mediaRef: string }>) => {
      const event: ChatEvent = {
        id: uuidv4(),
        type: 'media_request',
        content: '<request media>',
        timestamp: Date.now(),
        threadId: action.payload.threadId,
        userId: action.payload.userId,
        metadata: {
          mediaRef: action.payload.mediaRef,
        },
      };
      state.events.push(event);
      state.pendingEvents.push(event);
    },
    
    addFileUploadEvent: (state, action: PayloadAction<{ content: string; threadId: string; userId: string; fileName: string; fileSize: number }>) => {
      const event: ChatEvent = {
        id: uuidv4(),
        type: 'file_upload',
        content: action.payload.content,
        timestamp: Date.now(),
        threadId: action.payload.threadId,
        userId: action.payload.userId,
        metadata: {
          fileName: action.payload.fileName,
          fileSize: action.payload.fileSize,
        },
      };
      state.events.push(event);
      state.pendingEvents.push(event);
    },

    addBatchedTextEvent: (state, action: PayloadAction<{ content: string; threadId: string; userId: string; messageCount: number; messageIds?: string[] }>) => {
      const event: ChatEvent = {
        id: uuidv4(), // Generate new ID for the batch event
        type: 'batched_text',
        content: action.payload.content, // Combined message content
        timestamp: Date.now(),
        threadId: action.payload.threadId,
        userId: action.payload.userId,
        metadata: {
          messageCount: action.payload.messageCount,
          messageIds: action.payload.messageIds, // Store all message IDs for batch updates
        },
      };
      state.events.push(event);
      state.pendingEvents.push(event);
    },
    
    setBatchTimer: (state, action: PayloadAction<{ threadId: string; timestamp: number }>) => {
      state.batchTimers[action.payload.threadId] = action.payload.timestamp;
    },

    clearBatchTimer: (state, action: PayloadAction<string>) => {
      delete state.batchTimers[action.payload];
    },
    
    setProcessingEvent: (state, action: PayloadAction<string | null>) => {
      state.processingEventId = action.payload;
    },
    
    markEventProcessed: (state, action: PayloadAction<string>) => {
      const eventId = action.payload;
      state.pendingEvents = state.pendingEvents.filter(event => event.id !== eventId);
      state.processingEventId = null;
    },
    
    clearPendingEvents: (state) => {
      state.pendingEvents = [];
      state.processingEventId = null;
    },
    
    clearAllEvents: (state) => {
      state.events = [];
      state.pendingEvents = [];
      state.processingEventId = null;
      state.batchTimers = {};
    },
  },
});

export const {
  addTextEvent,
  addImageRequestEvent,
  addMediaRequestEvent,
  addFileUploadEvent,
  addBatchedTextEvent,
  setBatchTimer,
  clearBatchTimer,
  setProcessingEvent,
  markEventProcessed,
  clearPendingEvents,
  clearAllEvents,
} = chatEventSlice.actions;

export default chatEventSlice.reducer;
