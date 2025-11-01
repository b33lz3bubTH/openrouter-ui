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

interface SummaryState {
  id: string;
  threadId: string;
  messageCount: number;
  lastSummaryMessageCount: number;
  isInRetryMode: boolean;
  lastUpdated: number;
}

export class SummarySchedulerService {
  private static readonly MESSAGE_COUNT_TRIGGER = 5;
  private static readonly MAX_SUMMARIES_TO_KEEP = 5;
  private static readonly MAX_RETRY_ATTEMPTS = 3; // Prevent infinite retry loops
  private static summaryPlugin: undefined | ((prompt: string, config: AuthConfig) => Promise<string>);
  private static migratedThreads = new Set<string>(); // Track migrated threads

  static registerPlugin(generator: (prompt: string, config: AuthConfig) => Promise<string>) {
    this.summaryPlugin = generator;
  }

  /**
   * Get or create summary state for a thread
   */
  private static async getSummaryState(threadId: string): Promise<SummaryState> {
    try {
      let state = await db.summaryState.get(threadId);
      if (!state) {
        // Create initial state
        state = {
          id: threadId,
          threadId,
          messageCount: 0,
          lastSummaryMessageCount: 0,
          isInRetryMode: false,
          lastUpdated: Date.now()
        };
        await db.summaryState.add(state);
        Logger.log('Created initial summary state for thread', { threadId });
      }
      return state;
    } catch (error) {
      Logger.error('Error getting summary state', { threadId, error });
      // Return default state on error
      return {
        id: threadId,
        threadId,
        messageCount: 0,
        lastSummaryMessageCount: 0,
        isInRetryMode: false,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Update message count for a thread
   */
  static async incrementMessageCount(threadId: string): Promise<void> {
    try {
      const state = await this.getSummaryState(threadId);
      const newMessageCount = state.messageCount + 1;

      await db.summaryState.update(threadId, {
        messageCount: newMessageCount,
        lastUpdated: Date.now()
      });

      Logger.log('Incremented message count for thread', {
        threadId,
        oldCount: state.messageCount,
        newCount: newMessageCount
      });
    } catch (error) {
      Logger.error('Error incrementing message count', { threadId, error });
    }
  }

  /**
   * Update summary state after successful summary generation
   */
  private static async updateSummarySuccess(threadId: string): Promise<void> {
    try {
      const state = await this.getSummaryState(threadId);
      await db.summaryState.update(threadId, {
        lastSummaryMessageCount: state.messageCount,
        isInRetryMode: false,
        lastUpdated: Date.now()
      });

      Logger.log('Updated summary state after success', {
        threadId,
        messageCount: state.messageCount,
        lastSummaryMessageCount: state.messageCount
      });
    } catch (error) {
      Logger.error('Error updating summary state after success', { threadId, error });
    }
  }

  /**
   * Set retry mode for a thread
   */
  static async setRetryMode(threadId: string): Promise<void> {
    try {
      await db.summaryState.update(threadId, {
        isInRetryMode: true,
        lastUpdated: Date.now()
      });

      Logger.log('Set retry mode for thread', { threadId });
    } catch (error) {
      Logger.error('Error setting retry mode', { threadId, error });
    }
  }

  /**
   * Migrate existing threads to ensure they're compatible with the current summary system.
   * This handles the case where older versions of the app are merged/updated.
   */
  static async migrateExistingThreads(): Promise<void> {
    try {
      Logger.log('Starting thread migration for summary compatibility');

      // Get all conversations/threads
      const conversations = await db.conversations.toArray();

      for (const conversation of conversations) {
        try {
          if (this.migratedThreads.has(conversation.id)) {
            continue; // Already migrated
          }

          Logger.log('Migrating thread', { threadId: conversation.id, title: conversation.title });

          // 1. Fix message sequences (this was already being done in useChat)
          await this.fixMessageSequencesIfNeeded(conversation.id);

          // 2. Ensure thread has proper configuration
          await this.ensureThreadConfig(conversation.id);

          // 3. Validate and clean up messages
          await this.validateAndCleanMessages(conversation.id);

          // 4. Initialize summary state if needed
          await this.initializeSummaryState(conversation.id);

          // 5. Ensure summary state table has entry for this thread
          await this.getSummaryState(conversation.id);

          // 6. Mark as migrated
          this.migratedThreads.add(conversation.id);

          Logger.log('Successfully migrated thread', { threadId: conversation.id });

        } catch (threadError) {
          Logger.error('Error migrating thread', {
            threadId: conversation.id,
            error: threadError instanceof Error ? threadError.message : String(threadError)
          });
          // Continue with other threads even if one fails
        }
      }

      Logger.log('Thread migration completed', { totalThreads: conversations.length });

    } catch (error) {
      Logger.error('Error during thread migration', { error });
      // Don't throw - migration failure shouldn't break the app
    }
  }

  /**
   * Fix message sequences if they're corrupted or missing
   */
  private static async fixMessageSequencesIfNeeded(threadId: string): Promise<void> {
    try {
      const messages = await db.messages.where('conversationId').equals(threadId).sortBy('timestamp');

      if (messages.length === 0) return;

      // Check if sequences are valid
      let needsFixing = false;
      for (let i = 0; i < messages.length; i++) {
        const expectedSequence = i + 1;
        if (messages[i].sequence !== expectedSequence) {
          needsFixing = true;
          break;
        }
      }

      if (needsFixing) {
        Logger.log('Fixing message sequences for thread', { threadId, messageCount: messages.length });

        // Re-sequence messages
        for (let i = 0; i < messages.length; i++) {
          await db.messages.update(messages[i].id, { sequence: i + 1 });
        }

        Logger.log('Message sequences fixed', { threadId });
      }

    } catch (error) {
      Logger.error('Error fixing message sequences', { threadId, error });
    }
  }

  /**
   * Ensure thread has proper configuration
   */
  private static async ensureThreadConfig(threadId: string): Promise<void> {
    try {
      const existingConfig = await db.threadConfigs.get(threadId);

      if (!existingConfig) {
        Logger.log('Creating default config for thread', { threadId });

        // Create default configuration
        await db.threadConfigs.add({
          id: threadId,
          botName: 'Bot',
          rules: '',
          userName: 'User',
          lastSuccessfulSummaryMessageCount: 0,
          summaryRetryMode: false
        });

        Logger.log('Default config created', { threadId });
      } else {
        // Validate existing config and fix if needed
        const updatedConfig = {
          ...existingConfig,
          botName: existingConfig.botName || 'Bot',
          rules: existingConfig.rules || '',
          userName: existingConfig.userName || 'User',
          lastSuccessfulSummaryMessageCount: existingConfig.lastSuccessfulSummaryMessageCount || 0,
          summaryRetryMode: existingConfig.summaryRetryMode || false
        };

        if (JSON.stringify(updatedConfig) !== JSON.stringify(existingConfig)) {
          await db.threadConfigs.update(threadId, updatedConfig);
          Logger.log('Config updated for thread', { threadId });
        }
      }

    } catch (error) {
      Logger.error('Error ensuring thread config', { threadId, error });
    }
  }

  /**
   * Validate and clean up messages
   */
  private static async validateAndCleanMessages(threadId: string): Promise<void> {
    try {
      const messages = await db.messages.where('conversationId').equals(threadId).toArray();

      let cleanedCount = 0;

      for (const message of messages) {
        // Check for corrupted messages
        if (!message.id || !message.content || typeof message.content !== 'string') {
          Logger.warn('Removing corrupted message', { messageId: message.id, threadId });
          await db.messages.delete(message.id);
          cleanedCount++;
          continue;
        }

        // Ensure required fields are present
        const updatedMessage: any = {
          ...message,
          role: message.role === 'user' || message.role === 'assistant' ? message.role : 'user',
          isDelivered: message.isDelivered !== false, // Default to true
        };

        if (JSON.stringify(updatedMessage) !== JSON.stringify(message)) {
          await db.messages.update(message.id, updatedMessage);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        Logger.log('Cleaned messages for thread', { threadId, cleanedCount });
      }

    } catch (error) {
      Logger.error('Error validating messages', { threadId, error });
    }
  }

  /**
   * Initialize summary state for threads that need it
   */
  private static async initializeSummaryState(threadId: string): Promise<void> {
    try {
      const messages = await this.getSuccessfulMessages(threadId);
      const summaries = await this.getSummaries(threadId);
      const state = await this.getSummaryState(threadId);

      // Sync the message count in summary state
      if (state.messageCount !== messages.length) {
        await db.summaryState.update(threadId, {
          messageCount: messages.length,
          lastUpdated: Date.now()
        });
        Logger.log('Synced message count in summary state', {
          threadId,
          oldCount: state.messageCount,
          newCount: messages.length
        });
      }

      if (messages.length === 0) return; // No messages, nothing to initialize

      // Calculate how many summaries should exist
      const expectedSummaries = Math.floor(messages.length / this.MESSAGE_COUNT_TRIGGER);
      const missingSummaries = expectedSummaries - summaries.length;

      Logger.log('Initializing summary state', {
        threadId,
        messageCount: messages.length,
        summaryCount: summaries.length,
        expectedSummaries,
        missingSummaries,
        currentSummaryState: state
      });

      // If we have missing summaries, set retry mode to catch up
      if (missingSummaries > 0) {
        await this.setRetryMode(threadId);
        Logger.log('Thread needs summary catch-up, set retry mode', {
          threadId,
          missingSummaries
        });
      }

    } catch (error) {
      Logger.error('Error initializing summary state', { threadId, error });
    }
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

  static async shouldGenerateOrRetry(threadId: string): Promise<boolean> {
    try {
      if (!threadId || threadId.trim() === '') {
        Logger.warn('Invalid threadId provided to shouldGenerateOrRetry');
        return false;
      }

      const state = await this.getSummaryState(threadId);

      // If we're in retry mode (previous summary generation failed), generate on every message
      if (state.isInRetryMode) {
        Logger.log('Summary generation check for thread (retry mode)', {
          threadId,
          messageCount: state.messageCount,
          lastSummaryMessageCount: state.lastSummaryMessageCount,
          isInRetryMode: true,
          shouldGenerate: true
        });
        return true;
      }

      // Normal mode: generate when we have MESSAGE_COUNT_TRIGGER more messages since last successful summary
      const messagesSinceLastSummary = state.messageCount - state.lastSummaryMessageCount;
      const shouldGenerate = messagesSinceLastSummary >= this.MESSAGE_COUNT_TRIGGER;

      Logger.log('Summary generation check for thread (normal mode)', {
        threadId,
        messageCount: state.messageCount,
        lastSummaryMessageCount: state.lastSummaryMessageCount,
        messagesSinceLastSummary,
        isInRetryMode: false,
        shouldGenerate,
        triggerPoint: this.MESSAGE_COUNT_TRIGGER
      });

      return shouldGenerate;
    } catch (error) {
      Logger.error('Error checking if should generate/retry summary', { threadId, error });
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

  static async generateSummaryStrict(
    threadId: string,
    roleplayRules: string,
    botName: string,
    recentMessages: Message[]
  ): Promise<string> {
    Logger.log('Generating summary (strict mode)', {
      threadId,
      recentMessagesCount: recentMessages.length,
      hasRoleplayRules: !!roleplayRules?.trim()
    });

    try {
      // Validate input parameters for migrated threads
      if (!threadId || threadId.trim() === '') {
        throw new Error('Invalid threadId provided to generateSummaryStrict');
      }

      if (!Array.isArray(recentMessages) || recentMessages.length === 0) {
        Logger.warn('No recent messages provided, generating minimal summary', { threadId });
        return this.generateFallbackSummary(recentMessages, botName || 'Bot');
      }

      // Sanitize inputs for migrated threads that might have corrupted data
      const sanitizedRules = (roleplayRules || '').trim();
      const sanitizedBotName = (botName || 'Bot').trim();
      const sanitizedMessages = recentMessages.filter(msg =>
        msg && typeof msg.content === 'string' && msg.content.trim() !== ''
      );

      if (sanitizedMessages.length === 0) {
        Logger.warn('No valid messages after sanitization', { threadId });
        return `Conversation with ${sanitizedBotName} - ${recentMessages.length} messages`;
      }

      const previousSummaries = await this.getRecentSummaries(threadId, 5);
      const previousTwoSummaries = previousSummaries.slice(-2).map(s => s.summary).filter(s => s && s.trim());
      const contextGlimpses = await this.getContextGlimpses(threadId, sanitizedBotName, 5);

      const summaryPrompt = this.buildSummaryPrompt(
        sanitizedRules,
        sanitizedMessages,
        previousTwoSummaries,
        sanitizedBotName,
        contextGlimpses
      );

      Logger.log('Built summary prompt', {
        threadId,
        promptLength: summaryPrompt.length,
        previousSummariesCount: previousSummaries.length,
        contextGlimpsesCount: contextGlimpses.length,
        sanitizedMessagesCount: sanitizedMessages.length
      });

      const config = getAuthConfig();
      let summary: string;

      if (this.summaryPlugin) {
        summary = await this.summaryPlugin(summaryPrompt, config);
      } else if (config.backend === 'openrouter' && config.apiKey && config.modelName) {
        summary = await this.generateWithOpenRouter(summaryPrompt, config);
      } else {
        summary = await this.generateWithBackend(summaryPrompt, config);
      }

      if (!summary || summary.trim() === '') {
        Logger.warn('Generated empty summary, using fallback', { threadId });
        summary = this.generateFallbackSummary(recentMessages, botName);
      }

      const finalSummary = summary.trim();
      Logger.log('Summary generation completed', {
        threadId,
        summaryLength: finalSummary.length
      });

      return finalSummary;
    } catch (error) {
      Logger.error('Failed to generate summary in strict mode', {
        threadId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Return fallback summary instead of throwing to prevent blocking chat flow
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

      // Update summary state to clear retry mode and set last successful count
      await this.updateSummarySuccess(threadId);

      const state = await this.getSummaryState(threadId);
      Logger.log('Summary saved and retry mode cleared', {
        threadId,
        sequence: nextSequence,
        summaryLength: summary.length,
        messageCount: state.messageCount
      });

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


  /**
   * Mark a thread as having summary issues (for debugging/problematic threads)
   */
  static async markThreadWithSummaryIssues(threadId: string, issue: string): Promise<void> {
    try {
      Logger.warn('Marking thread with summary issues', { threadId, issue });

      // In a production system, you might want to store this in a separate table
      // For now, we'll just log it
      // We don't store summaryIssues in threadConfigs to avoid type errors

    } catch (error) {
      Logger.error('Error marking thread with summary issues', { threadId, error });
    }
  }
}

