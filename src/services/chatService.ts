import { BackendChatRequest, BackendChatResponse, BackendContextMessage, Message } from '@/types/chat';
import db from './chatDatabase';
import { Logger } from '@/utils/logger';
import { SummarySchedulerService } from './summarySchedulerService';

const API_BASE_URL = 'https://3b1b6575caab.ngrok-free.app';

interface AuthConfig {
  backend: 'custom' | 'openrouter';
  apiUrl?: string;
  modelName?: string;
  apiKey?: string;
  genericPrompt?: string;
}

function getAuthConfig(): AuthConfig {
  try {
    const stored = sessionStorage.getItem('auth-data');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        backend: parsed.backend || 'custom',
        apiUrl: parsed.apiUrl,
        modelName: parsed.modelName,
        apiKey: parsed.apiKey,
        genericPrompt: parsed.genericPrompt
      };
    }
  } catch (err) {
    console.warn('Unable to parse auth-data:', err);
  }
  return { backend: 'custom' };
}

function resolveApiBaseUrl(): string {
  const config = getAuthConfig();
  if (config.apiUrl && config.apiUrl.trim()) {
    return config.apiUrl.trim().replace(/\/$/, '');
  }
  return API_BASE_URL;
}

export class ChatService {
  // Helper function to check if message contains media-related content
  private static isMediaMessage(content: string): boolean {
    if (!content || content.trim() === '') return true;
    
    // Check for media request patterns
    if (content.includes('<request img>') || content.includes('<request media>')) {
      return true;
    }
    
    // Check for Media ID patterns using regex
    const mediaIdPattern = /\[Media ID:\s*[^\]]+\]/i;
    if (mediaIdPattern.test(content)) {
      return true;
    }
    
    return false;
  }
  // Smart message trimming to keep total chars under limit
  private static trimMessages(messages: Message[], maxChars: number = 3000): Message[] {
    // Calculate total chars
    let totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    
    if (totalChars <= maxChars) {
      return messages;
    }

    // Always include last 3 messages (highest priority)
    const lastMessages = messages.slice(-3);
    const firstMessages = messages.slice(0, 2); // First 2 messages for context
    
    // Calculate remaining budget
    const lastChars = lastMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const firstChars = firstMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    let remainingChars = maxChars - lastChars - firstChars;
    
    // If we still have budget, add some middle messages
    const middleMessages: Message[] = [];
    if (messages.length > 5 && remainingChars > 0) {
      const middleStart = 2;
      const middleEnd = messages.length - 3;
      const middlePool = messages.slice(middleStart, middleEnd);
      
      // Add middle messages until we run out of budget
      for (const msg of middlePool) {
        if (msg.content.length <= remainingChars) {
          middleMessages.push(msg);
          remainingChars -= msg.content.length;
        }
      }
    }
    
    // Combine: first + middle + last
    return [...firstMessages, ...middleMessages, ...lastMessages];
  }

  static async sendMessage(
    messages: Message[],
    currentMessage: string,
    userName: string,
    botName: string,
    rules: string,
    conversationId: string,
    imageData?: string
  ): Promise<string> {
    Logger.log('Sending message', { currentMessage });
    const context = await this.generateContext(conversationId, rules, botName);
    Logger.log('Context being sent to AI', { context });

    const config = getAuthConfig();
    
    if (config.backend === 'openrouter') {
      return this.sendOpenRouterMessage(messages, currentMessage, rules, config, conversationId, botName, imageData);
    } else {
      return this.sendCustomMessage(messages, currentMessage, userName, botName, rules, config, conversationId);
    }
  }

  private static async sendOpenRouterMessage(
    messages: Message[],
    currentMessage: string,
    rules: string,
    config: AuthConfig,
    conversationId: string,
    botName: string,
    imageData?: string
  ): Promise<string> {
    try {
      if (!config.apiKey || !config.modelName) {
        throw new Error('OpenRouter API key and model name are required');
      }

      // Generate optimized context (roleplay rules + last 5 messages, max 1200 words)
      const context = await this.generateContext(conversationId, rules, botName);

      // Build system prompt: generic prompt + optimized context
      const apiMessages: any[] = [];
      const systemParts: string[] = [];
      
      if (config.genericPrompt) {
        systemParts.push(config.genericPrompt);
      }
      
      if (context && context.trim()) {
        systemParts.push(`\n\nContext:\n${context}`);
      }
      
      if (systemParts.length > 0) {
        apiMessages.push({
          role: 'system',
          content: systemParts.join('\n')
        });
      }

      // Add current message with optional image
      if (imageData) {
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: currentMessage },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        });
      } else {
        apiMessages.push({
          role: 'user',
          content: currentMessage
        });
      }

      console.log('🚀 SENDING TO OPENROUTER:', { model: config.modelName, messages: apiMessages });

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Perplexity Pro',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: apiMessages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenRouter error:', response.status, errorText);
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ OPENROUTER RESPONSE:', data);
      
      const extractedContent = data.choices?.[0]?.message?.content || 'No response';
      console.log('✅ EXTRACTED CONTENT:', {
        hasContent: !!extractedContent,
        contentLength: extractedContent.length,
        contentPreview: extractedContent.substring(0, 100) + '...',
        isNoResponse: extractedContent === 'No response'
      });
      
      return extractedContent;
    } catch (error) {
      console.error('❌ Error calling OpenRouter:', error);
      throw error;
    }
  }

  private static async sendCustomMessage(
    messages: Message[],
    currentMessage: string,
    userName: string,
    botName: string,
    rules: string,
    config: AuthConfig,
    conversationId: string
  ): Promise<string> {
    try {
      // Generate optimized context (roleplay rules + last 5 messages, max 1200 words)
      const contextString = await this.generateContext(conversationId, rules, botName);
      
      // Get recent messages for context (last 5 messages), filtering out media requests
      const recentMessages = messages
        .filter(msg => !this.isMediaMessage(msg.content))
        .slice(-5);
      
      // Convert recent messages to backend context format
      const context: BackendContextMessage[] = [];
      
      // Group messages into conversation pairs
      for (let i = 0; i < recentMessages.length; i += 2) {
        const userMsg = recentMessages[i];
        const botMsg = recentMessages[i + 1];
        
        if (userMsg && userMsg.role === 'user') {
          const contextObj: BackendContextMessage = {};
          contextObj[userName] = userMsg.content;
          
          if (botMsg && botMsg.role === 'assistant') {
            contextObj[botName] = botMsg.content;
          }
          
          context.push(contextObj);
        }
      }

      const request: BackendChatRequest = {
        context,
        message: currentMessage,
        user: userName,
        rules: contextString // Use optimized context instead of raw rules
      };

      console.log('🚀 SENDING TO BACKEND:', JSON.stringify(request, null, 2));

      const baseUrl = resolveApiBaseUrl();
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendChatResponse = await response.json();
      
      console.log('✅ BACKEND RESPONSE:', data);
      console.log('📝 TRANSCRIPT SENT:', data.transcript_sent);
      
      // Return the reply field from the response
      return data.reply;
    } catch (error) {
      console.error('❌ Error calling backend:', error);
      throw error;
    }
  }

  static extractUserName(email: string): string {
    // Extract the first part before @ (e.g., souravsunju from souravsunju@gmail.com)
    return email.split('@')[0];
  }

  // Save a conversation to the Dexie database
  static async saveConversation(id: string, title: string, createdAt: number, updatedAt: number): Promise<void> {
    Logger.log('Saving conversation', { id, title, createdAt, updatedAt });
    await db.conversations.put({ id, title, createdAt, updatedAt });
  }

  // Retrieve all conversations from the Dexie database
  static async getConversations(): Promise<{ id: string; title: string; createdAt: number; updatedAt: number }[]> {
    Logger.log('Retrieving all conversations');
    return await db.conversations.toArray();
  }

  // Save a message to the Dexie database with a specific sequence number
  static async saveMessage(conversationId: string, id: string, content: string, role: string, timestamp: number, sequence?: number, isDelivered?: boolean, mediaRef?: string): Promise<void> {
    // If sequence is provided, use it; otherwise calculate it
    let finalSequence = sequence;
    if (finalSequence === undefined) {
      const lastMessage = await db.messages.where('conversationId').equals(conversationId).last();
      finalSequence = lastMessage ? lastMessage.sequence + 1 : 1; // Increment sequence or start at 1
    }

    Logger.log('Saving message with sequence', { conversationId, id, content, role, timestamp, sequence: finalSequence, isDelivered, mediaRef });
    await db.messages.put({ id, conversationId, content, role, timestamp, sequence: finalSequence, isDelivered, mediaRef });
  }

  // Fix sequences for all messages in a conversation
  static async fixMessageSequences(conversationId: string): Promise<void> {
    Logger.log('Fixing message sequences for conversation', { conversationId });
    // Load all messages and sort by reliable fields to reconstruct order
    const messages = await db.messages.where('conversationId').equals(conversationId).toArray();

    // Remove duplicates by id, keeping the most recent one
    const uniqueMessagesMap = new Map<string, typeof messages[0]>();
    for (const msg of messages) {
      const existing = uniqueMessagesMap.get(msg.id);
      if (!existing || (msg.timestamp || 0) > (existing.timestamp || 0)) {
        uniqueMessagesMap.set(msg.id, msg);
      }
    }
    const uniqueMessages = Array.from(uniqueMessagesMap.values());

    // Sort by timestamp, then role (user before assistant), then existing sequence, then id
    // For messages within the same "turn" (within 10 seconds), prioritize role over timestamp
    uniqueMessages.sort((a, b) => {
      const tA = a.timestamp || 0;
      const tB = b.timestamp || 0;
      const timeDiff = Math.abs(tA - tB);
      const TURN_WINDOW = 10000; // 10 seconds - messages within this window are considered same turn
      
      // If messages are within the same turn window and have different roles, prioritize user before assistant
      if (timeDiff <= TURN_WINDOW && a.role !== b.role) {
        return a.role === 'user' ? -1 : 1;
      }
      
      // Otherwise, sort by timestamp (oldest first)
      if (tA !== tB) return tA - tB;
      
      // For same timestamp, ensure user message appears before assistant
      if (a.role !== b.role) return a.role === 'user' ? -1 : 1;
      
      // Fallback to existing sequence if timestamps are equal
      const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return String(a.id).localeCompare(String(b.id));
    });

    // Assign sequential numbers starting from 1
    let sequence = 1;
    for (const message of uniqueMessages) {
      if (message.sequence !== sequence) {
        message.sequence = sequence;
        await db.messages.put(message);
      }
      sequence++;
    }

    // Delete any duplicate messages that weren't kept
    const keptIds = new Set(uniqueMessages.map(m => m.id));
    for (const msg of messages) {
      if (!keptIds.has(msg.id)) {
        await db.messages.delete(msg.id);
      }
    }

    Logger.log('Fixed message sequences', { 
      conversationId, 
      originalCount: messages.length,
      uniqueCount: uniqueMessages.length,
      sequences: uniqueMessages.map(m => ({ id: m.id, sequence: m.sequence, role: m.role, timestamp: m.timestamp }))
    });
  }

  // Retrieve messages for a specific conversation
  static async getMessagesByConversation(conversationId: string): Promise<{ id: string; content: string; role: string; timestamp: number; sequence: number; isDelivered?: boolean; mediaRef?: string }[]> {
    Logger.log('Retrieving messages for conversation', { conversationId });
    const messages = await db.messages.where('conversationId').equals(conversationId).toArray();

    // Sort messages by sequence asc with stable tie-breakers
    messages.sort((a, b) => {
      const seq = (a.sequence - b.sequence);
      if (seq !== 0) return seq;
      const t = (a.timestamp || 0) - (b.timestamp || 0);
      if (t !== 0) return t;
      if (a.role !== b.role) return a.role === 'user' ? -1 : 1;
      return String(a.id).localeCompare(String(b.id));
    });
    Logger.log('Sorted messages by sequence', { messages });

    return messages;
  }

  // Get recent messages (reverse pagination - newest first)
  static async getRecentMessages(conversationId: string, limit: number = 11): Promise<{ id: string; content: string; role: string; timestamp: number; sequence: number; isDelivered?: boolean; mediaRef?: string }[]> {
    Logger.log('Retrieving recent messages', { conversationId, limit });
    const messages = await db.messages.where('conversationId').equals(conversationId).toArray();
    
    // Remove duplicates by id
    const uniqueMessages = Array.from(new Map(messages.map(msg => [msg.id, msg])).values());
    
    // Sort ALL messages by sequence ascending (oldest first) with stable tie-breakers
    // Use the same turn window logic as fixMessageSequences for consistency
    uniqueMessages.sort((a, b) => {
      const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
      
      // First, sort by sequence
      if (seqA !== seqB) return seqA - seqB;
      
      // For messages with same sequence, check if they're in the same turn (within 10 seconds)
      const tA = a.timestamp || 0;
      const tB = b.timestamp || 0;
      const timeDiff = Math.abs(tA - tB);
      const TURN_WINDOW = 10000; // 10 seconds
      
      // If messages are within the same turn window and have different roles, prioritize user before assistant
      if (timeDiff <= TURN_WINDOW && a.role !== b.role) {
        return a.role === 'user' ? -1 : 1;
      }
      
      // Otherwise, sort by timestamp
      if (tA !== tB) return tA - tB;
      
      // For same timestamp, ensure user message appears before assistant
      if (a.role !== b.role) return a.role === 'user' ? -1 : 1;
      
      return String(a.id).localeCompare(String(b.id));
    });
    
    // Take the last N messages (most recent)
    const recentMessages = uniqueMessages.slice(-limit);
    
    Logger.log('Retrieved recent messages', { 
      totalMessages: messages.length,
      uniqueMessages: uniqueMessages.length,
      recentMessages: recentMessages.length,
      sequences: recentMessages.map(m => ({ id: m.id, sequence: m.sequence, role: m.role, timestamp: m.timestamp }))
    });
    return recentMessages;
  }

  // Get older messages (for pagination when scrolling up)
  static async getOlderMessages(conversationId: string, beforeSequence: number, limit: number = 10): Promise<{ id: string; content: string; role: string; timestamp: number; sequence: number; isDelivered?: boolean; mediaRef?: string }[]> {
    Logger.log('Retrieving older messages', { conversationId, beforeSequence, limit });
    const messages = await db.messages.where('conversationId').equals(conversationId).toArray();
    
    // Remove duplicates by id
    const uniqueMessages = Array.from(new Map(messages.map(msg => [msg.id, msg])).values());
    
    // Sort ALL messages by sequence ascending (oldest first) with stable tie-breakers
    // Use the same turn window logic as fixMessageSequences for consistency
    uniqueMessages.sort((a, b) => {
      const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
      
      // First, sort by sequence
      if (seqA !== seqB) return seqA - seqB;
      
      // For messages with same sequence, check if they're in the same turn (within 10 seconds)
      const tA = a.timestamp || 0;
      const tB = b.timestamp || 0;
      const timeDiff = Math.abs(tA - tB);
      const TURN_WINDOW = 10000; // 10 seconds
      
      // If messages are within the same turn window and have different roles, prioritize user before assistant
      if (timeDiff <= TURN_WINDOW && a.role !== b.role) {
        return a.role === 'user' ? -1 : 1;
      }
      
      // Otherwise, sort by timestamp
      if (tA !== tB) return tA - tB;
      
      // For same timestamp, ensure user message appears before assistant
      if (a.role !== b.role) return a.role === 'user' ? -1 : 1;
      
      return String(a.id).localeCompare(String(b.id));
    });
    
    // Find messages older than beforeSequence
    const olderMessages = uniqueMessages.filter(msg => {
      const seq = msg.sequence ?? Number.MAX_SAFE_INTEGER;
      return seq < beforeSequence;
    }).slice(-limit);
    
    Logger.log('Retrieved older messages', { 
      totalMessages: messages.length,
      uniqueMessages: uniqueMessages.length,
      olderMessages: olderMessages.length,
      beforeSequence,
      sequences: olderMessages.map(m => ({ id: m.id, sequence: m.sequence, role: m.role, timestamp: m.timestamp }))
    });
    return olderMessages;
  }

  // Get total message count for a conversation
  static async getMessageCount(conversationId: string): Promise<number> {
    const count = await db.messages.where('conversationId').equals(conversationId).count();
    Logger.log('Message count for conversation', { conversationId, count });
    return count;
  }

  // Generate context for the AI model
  static async generateContext(conversationId: string, roleplayRules: string, botName: string = 'Assistant'): Promise<string> {
    Logger.log('Generating context for conversation', { conversationId });
    const messages = await this.getMessagesByConversation(conversationId);

    // Sort messages by sequence in ascending order
    messages.sort((a, b) => a.sequence - b.sequence);

    // Filter out undelivered messages and media-only messages, take last 5 messages
    const deliveredMessages = messages.filter(msg => 
      msg.isDelivered !== false && !this.isMediaMessage(msg.content)
    );
    const recentMessages = deliveredMessages.slice(-5);
    
    console.log('📝 Context: Building context from messages:', {
      totalMessages: messages.length,
      deliveredMessages: deliveredMessages.length,
      recentMessages: recentMessages.length,
      hasRoleplayRules: !!roleplayRules
    });

    // Get recent summaries (last 3)
    const summaries = await SummarySchedulerService.getRecentSummaries(conversationId, 3);
    console.log('📝 Context: Found summaries:', summaries.length);

    // Start with roleplay rules
    let context = '';
    if (roleplayRules && roleplayRules.trim()) {
      context += `Roleplay Rules: ${roleplayRules.trim()}\n\n`;
    }

    // Add summaries if available
    if (summaries.length > 0) {
      context += 'Previous Conversation Summaries:\n';
      for (const summary of summaries) {
        context += `- ${summary.summary}\n`;
      }
      context += '\n';
    }

    // Add recent messages
    if (recentMessages.length > 0) {
      context += 'Recent Messages:\n';
      for (const msg of recentMessages) {
        const role = msg.role === 'user' ? 'User' : botName;
        context += `${role}: ${msg.content}\n`;
      }
    }

    // Count words (rough estimation: split by spaces)
    const wordCount = context.split(/\s+/).length;
    console.log('📝 Context: Word count before truncation:', wordCount);

    // If over 1200 words, truncate intelligently
    if (wordCount > 1200) {
      console.log('📝 Context: Truncating context to 1200 words');
      
      // Split into words and take first 1200 words
      const words = context.split(/\s+/);
      const truncatedWords = words.slice(0, 1200);
      context = truncatedWords.join(' ') + '...';
      
      console.log('📝 Context: Final word count after truncation:', context.split(/\s+/).length);
    }

    Logger.log('Generated context for AI', { 
      contextLength: context.length,
      wordCount: context.split(/\s+/).length,
      contextPreview: context.substring(0, 200) + '...'
    });
    
    return context.trim();
  }

  // Clear all messages from the Dexie database
  static async clearMessages(): Promise<void> {
    Logger.log('Clearing all messages from the database');
    await db.messages.clear();
  }

  // Clear all conversations from the Dexie database
  static async clearConversations(): Promise<void> {
    Logger.log('Clearing all conversations from the database');
    await db.conversations.clear();
  }

  // Save thread configuration
  static async saveThreadConfig(threadId: string, botName: string, rules: string, userName: string): Promise<void> {
    Logger.log('Saving thread config', { threadId, botName, rules, userName });
    await db.threadConfigs.put({ id: threadId, botName, rules, userName });
  }

  // Get thread configuration
  static async getThreadConfig(threadId: string): Promise<{ botName: string; rules: string; userName: string } | null> {
    Logger.log('Getting thread config', { threadId });
    const config = await db.threadConfigs.get(threadId);
    return config || null;
  }

  // Delete a specific thread and all its associated data
  static async deleteThread(threadId: string): Promise<void> {
    Logger.log('Deleting thread and all associated data', { threadId });
    
    try {
      // Delete all messages for this conversation
      await db.messages.where('conversationId').equals(threadId).delete();
      
      // Delete the conversation
      await db.conversations.where('id').equals(threadId).delete();
      
      // Delete the thread configuration
      await db.threadConfigs.where('id').equals(threadId).delete();
      
      // Delete all summaries for this thread
      await SummarySchedulerService.deleteSummariesForThread(threadId);
      
      Logger.log('Successfully deleted thread and all associated data', { threadId });
    } catch (error) {
      Logger.error('Error deleting thread', { threadId, error });
      throw error;
    }
  }
}
