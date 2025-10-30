import Dexie from 'dexie';

// Define the database schema
class ChatDatabase extends Dexie {
  conversations: Dexie.Table<{ id: string; title: string; createdAt: number; updatedAt: number }, string>;
  messages: Dexie.Table<{ id: string; conversationId: string; content: string; role: string; timestamp: number; sequence: number; isDelivered?: boolean; mediaRef?: string }, string>;
  threadConfigs: Dexie.Table<{ id: string; botName: string; rules: string; userName: string; profilePicture?: string; lastSuccessfulSummaryMessageCount?: number; summaryRetryMode?: boolean }, string>;
  botMedia: Dexie.Table<{ id: string; botId: string; mediaId: string; type: 'image' | 'video'; mimeType: string; blobData: ArrayBuffer; blobRef: string; optimizedDimensions?: { width: number; height: number }; createdAt: number; lastUsedAt: number; rotationIndex: number }, string>;
  mediaReferences: Dexie.Table<{ id: string; messageId: string; mediaId: string; botId: string; createdAt: number }, string>;
  summaries: Dexie.Table<{ id: string; threadId: string; summary: string; createdAt: number; sequence: number }, string>;
  summaryState: Dexie.Table<{ id: string; threadId: string; messageCount: number; lastSummaryMessageCount: number; isInRetryMode: boolean; lastUpdated: number }, string>;

  constructor() {
    super('ChatDatabase');
    this.version(9).stores({
      conversations: 'id, createdAt, updatedAt', // Index by id, createdAt, and updatedAt
      messages: 'id, conversationId, timestamp, sequence', // Index by id, conversationId, timestamp, and sequence
      threadConfigs: 'id', // Index by id
      botMedia: 'id, botId, mediaId, createdAt, lastUsedAt, rotationIndex', // Index by id, botId, mediaId, createdAt, lastUsedAt, rotationIndex
      mediaReferences: 'id, messageId, mediaId, botId, createdAt', // Index by id, messageId, mediaId, botId, createdAt
      summaries: 'id, threadId, createdAt, sequence', // Index by id, threadId, createdAt, and sequence
      summaryState: 'id, threadId, lastUpdated', // Index by id, threadId, and lastUpdated
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