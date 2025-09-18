import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewThreadPrompt } from '@/types/chat';

interface NewChatPromptProps {
  onSubmit: (prompt: NewThreadPrompt) => void;
  onCancel: () => void;
}

export const NewChatPrompt = ({ onSubmit, onCancel }: NewChatPromptProps) => {
  const [botName, setBotName] = useState('');
  const [rules, setRules] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botName.trim() && rules.trim()) {
      onSubmit({
        botName: botName.trim(),
        rules: rules.trim()
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Setup New Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="botName">Bot Name</Label>
              <Input
                id="botName"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Enter bot name (e.g., milli, assistant, etc.)"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rules">Roleplay Rules</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Enter roleplay instructions (e.g., 'you're a role playing bot, you will chat like this is a whatsapp message.')"
                className="min-h-[100px]"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!botName.trim() || !rules.trim()}
              >
                Start Chat
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
