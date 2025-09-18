import { useState, useEffect } from 'react';
import { ChatService } from '@/services/chatService';

interface AuthData {
  email: string;
  genericPrompt: string;
  name: string;
}

const AUTH_KEY = 'auth-data';

export const useAuth = () => {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old data format
        if (parsed.email && !parsed.name) {
          parsed.name = ChatService.extractUserName(parsed.email);
        }
        setAuthData(parsed);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error loading auth data:', error);
        sessionStorage.removeItem(AUTH_KEY);
      }
    }
  }, []);

  const login = (email: string, genericPrompt: string) => {
    const name = ChatService.extractUserName(email);
    const data = { email, genericPrompt, name };
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
