import { Logger } from '@/utils/logger';

// Message batching service - processes messages immediately (no debounce)
interface MessageBatch {
  messages: string[];
  messageIds: string[];
  timestamp: number;
  threadId: string;
}

class MessageBatchingServiceClass {
  private batches: Map<string, MessageBatch> = new Map();
  private flushCallbacks: Map<string, (messages: string[], messageIds: string[]) => void> = new Map();

  // Add message and process immediately (no debounce)
  addMessage(threadId: string, message: string, messageId: string, onFlush?: (messages: string[], messageIds: string[]) => void): void {
    if (onFlush) {
      this.flushCallbacks.set(threadId, onFlush);
    }
    
    // Process immediately - no batching, no debounce
    const callback = this.flushCallbacks.get(threadId);
    if (callback) {
      Logger.log('Processing message immediately', { 
        threadId, 
        messageId,
        message: message.substring(0, 50) + '...'
      });
      
      // Process single message immediately
      callback([message], [messageId]);
    }
  }

  // Force flush (kept for compatibility, but does nothing now)
  forceFlush(threadId: string): void {
    // No-op since we process immediately
  }

  // Clear batch (kept for compatibility)
  clearBatch(threadId: string): void {
    this.batches.delete(threadId);
    this.flushCallbacks.delete(threadId);
  }

  // Get pending message count (always 0 now)
  getPendingCount(threadId: string): number {
    return 0;
  }
}

export const MessageBatchingService = new MessageBatchingServiceClass();
