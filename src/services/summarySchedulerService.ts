import { v4 as uuidv4 } from 'uuid';
import db from './chatDatabase';
import { Logger } from '@/utils/logger';
import { Message } from '@/types/chat';

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

export interface Summary {
  id: string;
  threadId: string;
  summary: string;
  createdAt: number;
  sequence: number;
}

export class SummarySchedulerService {
  private static readonly MESSAGE_COUNT_TRIGGER = 5;
  private static readonly MAX_SUMMARIES_TO_KEEP = 5;
  private static summaryPlugin: undefined | ((prompt: string, config: AuthConfig) => Promise<string>);

  static registerPlugin(generator: (prompt: string, config: AuthConfig) => Promise<string>) {
    this.summaryPlugin = generator;
  }

  static async shouldGenerateSummary(threadId: string): Promise<boolean> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.warn('Invalid threadId provided to shouldGenerateSummary');
        return false;
      }

      const messages = await this.getSuccessfulMessages(threadId);
      
      if (messages.length < this.MESSAGE_COUNT_TRIGGER) {
        return false;
      }

      const shouldGenerate = messages.length % this.MESSAGE_COUNT_TRIGGER === 0;
      
      Logger.log('Checking if should generate summary', {
        threadId,
        messageCount: messages.length,
        shouldGenerate
      });
      
      return shouldGenerate;
    } catch (error) {
      Logger.error('Error checking if should generate summary', { threadId, error });
      return false;
    }
  }

  static async generateSummary(
    threadId: string,
    roleplayRules: string,
    botName: string,
    recentMessages: Message[]
  ): Promise<string> {
    Logger.log('Generating summary', { threadId, recentMessagesCount: recentMessages.length });
    
    try {
      const previousSummaries = await this.getRecentSummaries(threadId, 5);
      const previousSummary = previousSummaries.length > 0 ? previousSummaries[previousSummaries.length - 1] : null;
      const previousTwoSummaries = previousSummaries.slice(-2).map(s => s.summary);
      const contextGlimpses = await this.getContextGlimpses(threadId, botName, 5);
      
      const summaryPrompt = this.buildSummaryPrompt(
        roleplayRules,
        recentMessages,
        previousTwoSummaries,
        botName,
        contextGlimpses
      );

      Logger.log('Summary prompt built', { summaryPromptLength: summaryPrompt.length });
      
      const config = getAuthConfig();
      let generatedSummary = '';
      
      if (this.summaryPlugin) {
        generatedSummary = await this.summaryPlugin(summaryPrompt, config);
      } else if (config.backend === 'openrouter' && config.apiKey && config.modelName) {
        generatedSummary = await this.generateWithOpenRouter(summaryPrompt, config);
      } else {
        generatedSummary = await this.generateWithBackend(summaryPrompt, config);
      }
      
      if (!generatedSummary || generatedSummary.trim() === '') {
        Logger.warn('Empty summary generated, using fallback');
        generatedSummary = this.generateFallbackSummary(recentMessages, botName);
      }
      
      Logger.log('Summary generated successfully', { summaryLength: generatedSummary.length });
      return generatedSummary;
    } catch (error) {
      Logger.error('Error generating summary, using fallback', { threadId, error });
      return this.generateFallbackSummary(recentMessages, botName);
    }
  }

  static async saveSummary(threadId: string, summary: string): Promise<void> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.error('Invalid threadId provided to saveSummary');
        throw new Error('Invalid threadId');
      }

      if (!summary || summary.trim() === '') {
        Logger.error('Empty summary provided to saveSummary');
        throw new Error('Empty summary');
      }

      const lastSummary = await this.getLatestSummary(threadId);
      const nextSequence = lastSummary ? lastSummary.sequence + 1 : 1;

      const summaryRecord: Summary = {
        id: uuidv4(),
        threadId,
        summary: summary.trim(),
        createdAt: Date.now(),
        sequence: nextSequence
      };

      await db.summaries.add(summaryRecord);
      Logger.log('Summary saved', { threadId, sequence: nextSequence, summaryLength: summary.length });

      await this.trimOldSummaries(threadId);
    } catch (error) {
      Logger.error('Error saving summary', { threadId, error });
      throw error;
    }
  }

  static async getSummaries(threadId: string): Promise<Summary[]> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.warn('Invalid threadId provided to getSummaries');
        return [];
      }

      const summaries = await db.summaries
        .where('threadId')
        .equals(threadId)
        .sortBy('sequence');
      
      return summaries || [];
    } catch (error) {
      Logger.error('Error getting summaries', { threadId, error });
      return [];
    }
  }

  static async getLatestSummary(threadId: string): Promise<Summary | null> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.warn('Invalid threadId provided to getLatestSummary');
        return null;
      }

      const summaries = await db.summaries
        .where('threadId')
        .equals(threadId)
        .sortBy('sequence');
      
      return summaries.length > 0 ? summaries[summaries.length - 1] : null;
    } catch (error) {
      Logger.error('Error getting latest summary', { threadId, error });
      return null;
    }
  }

  static async getRecentSummaries(threadId: string, count: number = 5): Promise<Summary[]> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.warn('Invalid threadId provided to getRecentSummaries');
        return [];
      }

      if (count <= 0) {
        Logger.warn('Invalid count provided to getRecentSummaries', { count });
        return [];
      }

      const summaries = await db.summaries
        .where('threadId')
        .equals(threadId)
        .sortBy('sequence');
      
      return summaries.slice(-count);
    } catch (error) {
      Logger.error('Error getting recent summaries', { threadId, error });
      return [];
    }
  }

  static async deleteSummariesForThread(threadId: string): Promise<void> {
    await db.summaries.where('threadId').equals(threadId).delete();
    Logger.log('Deleted summaries for thread', { threadId });
  }

  private static async getSuccessfulMessages(threadId: string): Promise<Message[]> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.warn('Invalid threadId provided to getSuccessfulMessages');
        return [];
      }

      const messages = await db.messages
        .where('conversationId')
        .equals(threadId)
        .filter(msg => msg.isDelivered !== false && !this.isMediaMessage(msg.content))
        .toArray();
      
      return messages
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
          timestamp: new Date(msg.timestamp),
          sequence: msg.sequence,
        }))
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    } catch (error) {
      Logger.error('Error getting successful messages', { threadId, error });
      return [];
    }
  }

  private static isMediaMessage(content: string): boolean {
    if (!content || content.trim() === '') return true;
    
    if (content.includes('<request img>') || content.includes('<request media>')) {
      return true;
    }
    
    const mediaIdPattern = /\[Media ID:\s*[^\]]+\]/i;
    if (mediaIdPattern.test(content)) {
      return true;
    }
    
    return false;
  }

  private static buildSummaryPrompt(
    roleplayRules: string,
    recentMessages: Message[],
    previousTwoSummaries: string[],
    botName: string,
    contextGlimpses: string[]
  ): string {
    let prompt = 'Please provide a brief summary of what the user is talking about in the following conversation.\n\n';
    
    if (roleplayRules && roleplayRules.trim()) {
      prompt += `Roleplay Rules: ${roleplayRules}\n\n`;
    }
    
    if (previousTwoSummaries && previousTwoSummaries.length > 0) {
      prompt += 'Previous Summaries (last 2):\n';
      for (const s of previousTwoSummaries) {
        prompt += `- ${s}\n`;
      }
      prompt += '\n';
    }
    
    if (contextGlimpses && contextGlimpses.length > 0) {
      prompt += 'Context Glimpses (from different parts of the chat):\n';
      for (const g of contextGlimpses) {
        prompt += `- ${g}\n`;
      }
      prompt += '\n';
    }

    prompt += 'Recent Messages:\n';
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? 'User' : botName;
      prompt += `${role}: ${msg.content}\n`;
    }
    
    prompt += '\nPlease provide a concise summary of this conversation segment.';
    
    return prompt;
  }

  private static async getContextGlimpses(threadId: string, botName: string, count: number = 5): Promise<string[]> {
    try {
      const messages = await this.getSuccessfulMessages(threadId);
      if (messages.length === 0 || count <= 0) return [];

      // Evenly sample across the conversation
      const indices: number[] = [];
      for (let i = 1; i <= count; i++) {
        const idx = Math.floor((i * messages.length) / (count + 1));
        indices.push(Math.min(Math.max(idx, 0), messages.length - 1));
      }

      const glimpses: string[] = [];
      for (const idx of indices) {
        const msg = messages[idx];
        const role = msg.role === 'user' ? 'User' : botName;
        const content = msg.content.length > 180 ? msg.content.slice(0, 177) + '...' : msg.content;
        glimpses.push(`${role}: ${content}`);
      }
      return glimpses;
    } catch (err) {
      Logger.warn('Failed to build context glimpses, proceeding without them', err);
      return [];
    }
  }

  private static async trimOldSummaries(threadId: string): Promise<void> {
    const summaries = await db.summaries
      .where('threadId')
      .equals(threadId)
      .sortBy('sequence');
    
    if (summaries.length > this.MAX_SUMMARIES_TO_KEEP) {
      const summariesToDelete = summaries.slice(0, summaries.length - this.MAX_SUMMARIES_TO_KEEP);
      for (const summary of summariesToDelete) {
        await db.summaries.delete(summary.id);
      }
      Logger.log('Trimmed old summaries', { 
        threadId, 
        kept: this.MAX_SUMMARIES_TO_KEEP,
        deleted: summariesToDelete.length 
      });
    }
  }

  private static async generateWithOpenRouter(prompt: string, config: AuthConfig): Promise<string> {
    try {
      if (!config.apiKey || !config.modelName) {
        throw new Error('OpenRouter API key or model name missing');
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Summary generation timeout after 15 seconds')), 15000);
      });

      const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that creates concise conversation summaries.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('OpenRouter API error', { status: response.status, errorText });
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content || '';
      
      if (!summary || summary.trim() === '') {
        Logger.warn('Empty response from OpenRouter');
      }
      
      return summary;
    } catch (error) {
      Logger.error('Error calling OpenRouter for summary', { error });
      throw error;
    }
  }

  private static async generateWithBackend(prompt: string, config: AuthConfig): Promise<string> {
    const API_BASE_URL = 'https://3b1b6575caab.ngrok-free.app';
    const apiUrl = config.apiUrl?.trim().replace(/\/$/, '') || API_BASE_URL;
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Summary generation timeout after 15 seconds')), 15000);
      });

      const fetchPromise = fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: [],
          message: prompt,
          user: 'System',
          rules: 'Create a concise summary of the conversation provided.'
        })
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('Backend API error', { status: response.status, errorText });
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.reply || '';
      
      if (!summary || summary.trim() === '') {
        Logger.warn('Empty response from backend');
      }
      
      return summary;
    } catch (error) {
      Logger.error('Error calling backend for summary', { error });
      throw error;
    }
  }

  private static generateFallbackSummary(recentMessages: Message[], botName: string): string {
    if (recentMessages.length === 0) {
      return 'No conversation yet.';
    }

    const userMessages = recentMessages.filter(msg => msg.role === 'user');
    const botMessages = recentMessages.filter(msg => msg.role === 'assistant');

    if (userMessages.length === 0 && botMessages.length === 0) {
      return 'No meaningful conversation yet.';
    }

    const topics: string[] = [];
    
    userMessages.forEach(msg => {
      const firstSentence = msg.content.split(/[.!?]/)[0].trim();
      if (firstSentence && firstSentence.length > 10) {
        topics.push(firstSentence.substring(0, 100));
      }
    });

    if (topics.length > 0) {
      return `Discussion about: ${topics.join('; ')}`;
    }

    return 'Conversation in progress.';
  }
}

