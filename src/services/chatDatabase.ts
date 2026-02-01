import Dexie from 'dexie';

// Define message interface for proper typing
export interface MessageRecord {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  sequence: number; // Always required - ensures proper ordering
  isDelivered?: boolean;
  mediaRef?: string;
}

// Define the database schema
class ChatDatabase extends Dexie {
  conversations: Dexie.Table<{ id: string; title: string; createdAt: number; updatedAt: number }, string>;
  messages: Dexie.Table<MessageRecord, string>;
  threadConfigs: Dexie.Table<{ id: string; botName: string; rules: string; userName: string; profilePicture?: string; lastSuccessfulSummaryMessageCount?: number; summaryRetryMode?: boolean }, string>;
  botMedia: Dexie.Table<{ id: string; botId: string; mediaId: string; type: 'image' | 'video'; mimeType: string; blobData: ArrayBuffer; blobRef: string; optimizedDimensions?: { width: number; height: number }; createdAt: number; lastUsedAt: number; rotationIndex: number }, string>;
  mediaReferences: Dexie.Table<{ id: string; messageId: string; mediaId: string; botId: string; createdAt: number }, string>;
  summaries: Dexie.Table<{ id: string; threadId: string; summary: string; createdAt: number; sequence: number }, string>;
  summaryState: Dexie.Table<{ id: string; threadId: string; messageCount: number; lastSummaryMessageCount: number; isInRetryMode: boolean; lastUpdated: number }, string>;

  constructor() {
    super('ChatDatabase');
    // Version 10: Proper sequence indexing for message ordering
    this.version(10).stores({
      conversations: 'id, createdAt, updatedAt',
      // Index by conversationId + sequence for efficient ordered queries
      messages: 'id, conversationId, [conversationId+sequence], timestamp, sequence',
      threadConfigs: 'id',
      botMedia: 'id, botId, mediaId, createdAt, lastUsedAt, rotationIndex',
      mediaReferences: 'id, messageId, mediaId, botId, createdAt',
      summaries: 'id, threadId, createdAt, sequence',
      summaryState: 'id, threadId, lastUpdated',
    });
    this.conversations = this.table('conversations');
    this.messages = this.table('messages');
    this.threadConfigs = this.table('threadConfigs');
    this.botMedia = this.table('botMedia');
    this.mediaReferences = this.table('mediaReferences');
    this.summaries = this.table('summaries');
    this.summaryState = this.table('summaryState');
  }
}

const db = new ChatDatabase();

export default db;