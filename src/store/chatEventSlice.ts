import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface ChatEvent {
  id: string;
  type: 'text' | 'image_request' | 'media_request' | 'file_upload';
  content: string;
  timestamp: number; // Use number instead of Date for Redux serialization
  threadId: string;
  userId: string;
  metadata?: {
    imageData?: string;
    mediaRef?: string;
    fileName?: string;
    fileSize?: number;
  };
}

export interface ChatEventState {
  events: ChatEvent[];
  pendingEvents: ChatEvent[];
  processingEventId: string | null;
}

const initialState: ChatEventState = {
  events: [],
  pendingEvents: [],
  processingEventId: null,
};

const chatEventSlice = createSlice({
  name: 'chatEvents',
  initialState,
  reducers: {
    addTextEvent: (state, action: PayloadAction<{ content: string; threadId: string; userId: string }>) => {
      const event: ChatEvent = {
        id: uuidv4(),
        type: 'text',
        content: action.payload.content,
        timestamp: Date.now(),
        threadId: action.payload.threadId,
        userId: action.payload.userId,
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
    },
  },
});

export const {
  addTextEvent,
  addImageRequestEvent,
  addMediaRequestEvent,
  addFileUploadEvent,
  setProcessingEvent,
  markEventProcessed,
  clearPendingEvents,
  clearAllEvents,
} = chatEventSlice.actions;

export default chatEventSlice.reducer;
