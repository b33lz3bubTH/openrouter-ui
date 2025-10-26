import Dexie from 'dexie';

// Define the database schema
class ChatDatabase extends Dexie {
  conversations: Dexie.Table<{ id: string; title: string; createdAt: number; updatedAt: number }, string>;
  messages: Dexie.Table<{ id: string; conversationId: string; content: string; role: string; timestamp: number; sequence: number }, string>;
  threadConfigs: Dexie.Table<{ id: string; botName: string; rules: string; userName: string }, string>;

  constructor() {
    super('ChatDatabase');
    this.version(4).stores({
      conversations: 'id, createdAt, updatedAt', // Index by id, createdAt, and updatedAt
      messages: 'id, conversationId, timestamp, sequence', // Index by id, conversationId, timestamp, and sequence
      threadConfigs: 'id', // Index by id
    });
    this.conversations = this.table('conversations');
    this.messages = this.table('messages');
    this.threadConfigs = this.table('threadConfigs');
  }
}

const db = new ChatDatabase();

export default db;