import { BackendChatRequest, BackendChatResponse, BackendContextMessage, Message } from '@/types/chat';

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
  static async sendMessage(
    messages: Message[],
    currentMessage: string,
    userName: string,
    botName: string,
    rules: string,
    imageData?: string
  ): Promise<string> {
    const config = getAuthConfig();
    
    if (config.backend === 'openrouter') {
      return this.sendOpenRouterMessage(messages, currentMessage, config, imageData);
    } else {
      return this.sendCustomMessage(messages, currentMessage, userName, botName, rules, config);
    }
  }

  private static async sendOpenRouterMessage(
    messages: Message[],
    currentMessage: string,
    config: AuthConfig,
    imageData?: string
  ): Promise<string> {
    try {
      if (!config.apiKey || !config.modelName) {
        throw new Error('OpenRouter API key and model name are required');
      }

      // Add system prompt if available
      const apiMessages: any[] = [];
      if (config.genericPrompt) {
        apiMessages.push({
          role: 'system',
          content: config.genericPrompt
        });
      }

      // Add all previous conversation messages for context
      messages.forEach(msg => {
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
      // Convert messages to backend context format
      const context: BackendContextMessage[] = [];
      
      // Group messages into conversation pairs
      for (let i = 0; i < messages.length; i += 2) {
        const userMsg = messages[i];
        const botMsg = messages[i + 1];
        
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
    // Extract name from email (part before @)
    const username = email.split('@')[0];
    // Convert to proper case (capitalize first letter)
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
}
