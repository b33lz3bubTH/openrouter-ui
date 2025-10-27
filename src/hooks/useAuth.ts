import { useState, useEffect } from 'react';
import { ChatService } from '@/services/chatService';

interface AuthData {
  backend: 'custom' | 'openrouter';
  email?: string;
  genericPrompt?: string;
  name?: string;
  apiUrl?: string;
  modelName?: string;
  apiKey?: string;
}

const AUTH_KEY = 'auth-data';

export const useAuth = () => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthData;
        // Migrate old data format
        if (parsed.email && !parsed.name) {
          parsed.name = ChatService.extractUserName(parsed.email);
        }
        
        console.log('📝 Auth: Loaded configuration from session storage:', {
          backend: parsed.backend,
          email: parsed.email,
          apiUrl: parsed.apiUrl,
          modelName: parsed.modelName,
          hasApiKey: !!parsed.apiKey,
          hasGenericPrompt: !!parsed.genericPrompt
        });
        
        setAuthData(parsed);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error loading auth data:', error);
        sessionStorage.removeItem(AUTH_KEY);
      }
    } else {
      console.log('📝 Auth: No stored configuration found');
    }
  }, []);

  const login = (config: {
    backend: 'custom' | 'openrouter';
    email?: string;
    genericPrompt?: string;
    apiUrl?: string;
    modelName?: string;
    apiKey?: string;
  }) => {
    const data: AuthData = {
      backend: config.backend,
      ...(config.backend === 'custom' ? {
        email: config.email,
        genericPrompt: config.genericPrompt,
        name: config.email ? ChatService.extractUserName(config.email) : undefined,
        apiUrl: config.apiUrl
      } : {
        modelName: config.modelName,
        apiKey: config.apiKey
      })
    };
    
    console.log('📝 Auth: Saving configuration to session storage:', {
      backend: data.backend,
      email: data.email,
      apiUrl: data.apiUrl,
      modelName: data.modelName,
      hasApiKey: !!data.apiKey,
      hasGenericPrompt: !!data.genericPrompt
    });
    
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
    setAuthData(data);
    setIsAuthenticated(true);
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthData(null);
    setIsAuthenticated(false);
  };

  return {
    authData,
    isAuthenticated,
    login,
    logout
  };
};
