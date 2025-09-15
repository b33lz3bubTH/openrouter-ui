import { ChatLayout } from '@/components/chat/ChatLayout';
import { LoginScreen } from '@/components/LoginScreen';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return <ChatLayout />;
};

export default Index;
