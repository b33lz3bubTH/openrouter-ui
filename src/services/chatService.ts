import { BackendChatRequest, BackendChatResponse, BackendContextMessage, Message } from '@/types/chat';

const API_BASE_URL = 'http://0.0.0.0:9999';

export class ChatService {
  static async sendMessage(
    messages: Message[],
    currentMessage: string,
    userName: string,
    botName: string,
    rules: string
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

      const response = await fetch(`${API_BASE_URL}/chat`, {
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
