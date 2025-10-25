import { BackendChatRequest, BackendChatResponse, BackendContextMessage, Message } from '@/types/chat';
import db from './chatDatabase';
import { Logger } from '@/utils/logger';

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
    imageData?: string
  ): Promise<string> {
    Logger.log('Sending message', { currentMessage });
    const context = await this.generateContext(messages[0]?.conversationId || '', rules);
    Logger.log('Context being sent to AI', { context });

    const config = getAuthConfig();
    
    if (config.backend === 'openrouter') {
      return this.sendOpenRouterMessage(messages, currentMessage, rules, config, imageData);
    } else {
      return this.sendCustomMessage(messages, currentMessage, userName, botName, rules, config);
    }
  }

  private static async sendOpenRouterMessage(
    messages: Message[],
    currentMessage: string,
    rules: string,
    config: AuthConfig,
    imageData?: string
  ): Promise<string> {
    try {
      if (!config.apiKey || !config.modelName) {
        throw new Error('OpenRouter API key and model name are required');
      }

      // Trim messages to keep under 3000 chars
      const trimmedMessages = this.trimMessages(messages);

      // Build system prompt: generic prompt + roleplay rules
      const apiMessages: any[] = [];
      const systemParts: string[] = [];
      
      if (config.genericPrompt) {
        systemParts.push(config.genericPrompt);
      }
      
      if (rules && rules.trim()) {
        systemParts.push(`\n\nRoleplay Rules:\n${rules}`);
      }
      
      if (systemParts.length > 0) {
        apiMessages.push({
          role: 'system',
          content: systemParts.join('\n')
        });
      }

      // Add trimmed conversation messages for context
      trimmedMessages.forEach(msg => {
        apiMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      });

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
      
      return data.choices?.[0]?.message?.content || 'No response';
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
    config: AuthConfig
  ): Promise<string> {
    try {
      // Trim messages to keep under 3000 chars
      const trimmedMessages = this.trimMessages(messages);
      
      // Convert trimmed messages to backend context format
      const context: BackendContextMessage[] = [];
      
      // Group messages into conversation pairs
      for (let i = 0; i < trimmedMessages.length; i += 2) {
        const userMsg = trimmedMessages[i];
        const botMsg = trimmedMessages[i + 1];
        
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
        rules
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

  // Save a message to the Dexie database with a sequence number
  static async saveMessage(conversationId: string, id: string, content: string, role: string, timestamp: number): Promise<void> {
    const lastMessage = await db.messages.where('conversationId').equals(conversationId).last();
    const sequence = lastMessage ? lastMessage.sequence + 1 : 1; // Increment sequence or start at 1

    Logger.log('Saving message with sequence', { conversationId, id, content, role, timestamp, sequence });
    await db.messages.put({ id, conversationId, content, role, timestamp, sequence });
  }

  // Retrieve messages for a specific conversation
  static async getMessagesByConversation(conversationId: string): Promise<{ id: string; content: string; role: string; timestamp: number; sequence: number }[]> {
    Logger.log('Retrieving messages for conversation', { conversationId });
    const messages = await db.messages.where('conversationId').equals(conversationId).toArray();

    // Sort messages by sequence in ascending order
    messages.sort((a, b) => a.sequence - b.sequence);
    Logger.log('Sorted messages by sequence', { messages });

    return messages;
  }

  // Generate context for the AI model
  static async generateContext(conversationId: string, roleplayRules: string): Promise<string> {
    Logger.log('Generating context for conversation', { conversationId });
    const messages = await this.getMessagesByConversation(conversationId);

    // Sort messages by sequence in ascending order
    messages.sort((a, b) => a.sequence - b.sequence);

    // Build context incrementally, starting with roleplay rules
    let context = `Roleplay Rules:\n${roleplayRules}\n`;

    for (const msg of messages) {
      const messageContent = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      if (context.length + messageContent.length > 1000) break;
      context += messageContent + '\n';
    }

    Logger.log('Generated context for AI', { context });
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
}
