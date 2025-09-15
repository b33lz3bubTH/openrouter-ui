import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginScreenProps {
  onLogin: (email: string, genericPrompt: string) => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [genericPrompt, setGenericPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && genericPrompt.trim()) {
      onLogin(email.trim(), genericPrompt.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Welcome to Perplexity Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Generic Prompt</Label>
              <Textarea
                id="prompt"
                value={genericPrompt}
                onChange={(e) => setGenericPrompt(e.target.value)}
                placeholder="Enter your generic prompt or instructions..."
                className="min-h-[100px]"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={!email.trim() || !genericPrompt.trim()}
            >
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};