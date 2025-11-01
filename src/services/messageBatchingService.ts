import { Logger } from '@/utils/logger';

// Batch configuration - 10 seconds debounce
const BATCH_DEBOUNCE_MS = 10000; // 10 seconds

interface MessageBatch {
  messages: string[];
  messageIds: string[]; // Track message IDs for optimistic updates
  timestamp: number;
  threadId: string;
  timer?: NodeJS.Timeout;
}

class MessageBatchingServiceClass {
  private batches: Map<string, MessageBatch> = new Map();
  private flushCallbacks: Map<string, (messages: string[], messageIds: string[]) => void> = new Map();

  // Add message to batch and reset debounce timer
  addMessage(threadId: string, message: string, messageId: string, onFlush?: (messages: string[], messageIds: string[]) => void): void {
    const existingBatch = this.batches.get(threadId);
    
    if (onFlush) {
      this.flushCallbacks.set(threadId, onFlush);
    }
    
    if (existingBatch) {
      // Clear existing timer
      if (existingBatch.timer) {
        clearTimeout(existingBatch.timer);
      }
      
      existingBatch.messages.push(message);
      existingBatch.messageIds.push(messageId);
      existingBatch.timestamp = Date.now();
      
      // Set new timer - resets on each new message
      existingBatch.timer = setTimeout(() => {
        this.flushBatch(threadId);
      }, BATCH_DEBOUNCE_MS);
      
      Logger.log('Added message to batch (timer reset)', { 
        threadId, 
        batchSize: existingBatch.messages.length,
        debounceMs: BATCH_DEBOUNCE_MS 
      });
    } else {
      // Create new batch with timer
      const timer = setTimeout(() => {
        this.flushBatch(threadId);
      }, BATCH_DEBOUNCE_MS);
      
      this.batches.set(threadId, {
        messages: [message],
        messageIds: [messageId],
        timestamp: Date.now(),
        threadId,
        timer
      });
      
      Logger.log('Created new batch with timer', { 
        threadId,
        debounceMs: BATCH_DEBOUNCE_MS 
      });
    }
  }

  // Manually flush a batch
  private flushBatch(threadId: string): void {
    const batch = this.batches.get(threadId);
    if (!batch) return;

    const callback = this.flushCallbacks.get(threadId);
    if (callback) {
      Logger.log('Flushing batch', { 
        threadId, 
        messageCount: batch.messages.length 
      });
      
      callback([...batch.messages], [...batch.messageIds]);
    }

    // Clear timer and remove batch
    if (batch.timer) {
      clearTimeout(batch.timer);
    }
    this.batches.delete(threadId);
    this.flushCallbacks.delete(threadId);
  }

  // Force flush (for thread switches or manual triggers)
  forceFlush(threadId: string): void {
    this.flushBatch(threadId);
  }

  // Clear batch without flushing
  clearBatch(threadId: string): void {
    const batch = this.batches.get(threadId);
    if (batch?.timer) {
      clearTimeout(batch.timer);
    }
    this.batches.delete(threadId);
    this.flushCallbacks.delete(threadId);
  }

  // Get pending message count for a thread
  getPendingCount(threadId: string): number {
    return this.batches.get(threadId)?.messages.length || 0;
  }
}

export const MessageBatchingService = new MessageBatchingServiceClass();
