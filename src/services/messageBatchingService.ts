import { Logger } from '@/utils/logger';

interface BatchedMessage {
  content: string;
  timestamp: number;
}

interface MessageBatch {
  threadId: string;
  messages: BatchedMessage[];
  timeoutId: NodeJS.Timeout | null;
}

/**
 * Service to batch multiple messages sent within a time window
 * and concatenate them into a single API request
 */
export class MessageBatchingService {
  private static batches: Map<string, MessageBatch> = new Map();
  private static readonly BATCH_WINDOW_MS = 30000; // 30 seconds
  private static readonly MIN_BATCH_SIZE = 2; // Minimum messages to batch

  /**
   * Add a message to the batch for a thread
   * Returns true if message should wait, false if it should be sent immediately
   */
  static addToBatch(threadId: string, content: string): Promise<string> {
    return new Promise((resolve) => {
      const now = Date.now();
      let batch = this.batches.get(threadId);

      if (!batch) {
        // Create new batch
        batch = {
          threadId,
          messages: [],
          timeoutId: null,
        };
        this.batches.set(threadId, batch);
      }

      // Add message to batch
      batch.messages.push({ content, timestamp: now });

      Logger.log('📦 Message added to batch', {
        threadId,
        batchSize: batch.messages.length,
        content: content.substring(0, 50),
      });

      // Clear existing timeout
      if (batch.timeoutId) {
        clearTimeout(batch.timeoutId);
      }

      // Set new timeout to flush batch
      batch.timeoutId = setTimeout(() => {
        const finalBatch = this.batches.get(threadId);
        if (finalBatch && finalBatch.messages.length > 0) {
          const concatenated = this.concatenateMessages(finalBatch.messages);
          Logger.log('📦 Batch flushed (timeout)', {
            threadId,
            messageCount: finalBatch.messages.length,
            concatenatedLength: concatenated.length,
          });
          this.batches.delete(threadId);
          resolve(concatenated);
        }
      }, this.BATCH_WINDOW_MS);
    });
  }

  /**
   * Flush a batch immediately and return concatenated content
   */
  static flushBatch(threadId: string): string | null {
    const batch = this.batches.get(threadId);
    if (!batch || batch.messages.length === 0) {
      return null;
    }

    if (batch.timeoutId) {
      clearTimeout(batch.timeoutId);
    }

    const concatenated = this.concatenateMessages(batch.messages);
    Logger.log('📦 Batch flushed (manual)', {
      threadId,
      messageCount: batch.messages.length,
      concatenatedLength: concatenated.length,
    });

    this.batches.delete(threadId);
    return concatenated;
  }

  /**
   * Get current batch size for a thread
   */
  static getBatchSize(threadId: string): number {
    const batch = this.batches.get(threadId);
    return batch ? batch.messages.length : 0;
  }

  /**
   * Check if thread has pending batch
   */
  static hasPendingBatch(threadId: string): boolean {
    const batch = this.batches.get(threadId);
    return batch ? batch.messages.length > 0 : false;
  }

  /**
   * Concatenate messages with proper formatting
   */
  private static concatenateMessages(messages: BatchedMessage[]): string {
    if (messages.length === 0) return '';
    if (messages.length === 1) return messages[0].content;

    // Concatenate with line breaks
    return messages.map((msg) => msg.content).join('\n');
  }

  /**
   * Clear all batches (useful for cleanup)
   */
  static clearAllBatches(): void {
    this.batches.forEach((batch) => {
      if (batch.timeoutId) {
        clearTimeout(batch.timeoutId);
      }
    });
    this.batches.clear();
    Logger.log('📦 All batches cleared');
  }

  /**
   * Get batch window in milliseconds
   */
  static getBatchWindow(): number {
    return this.BATCH_WINDOW_MS;
  }
}
