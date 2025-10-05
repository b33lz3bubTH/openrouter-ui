import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LoginScreenProps {
  onLogin: (config: {
    backend: 'custom' | 'openrouter';
    email?: string;
    genericPrompt?: string;
    apiUrl?: string;
    modelName?: string;
    apiKey?: string;
  }) => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [backend, setBackend] = useState<'custom' | 'openrouter'>('custom');
  
  // Custom backend fields
  const [email, setEmail] = useState('');
  const [genericPrompt, setGenericPrompt] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  
  // OpenRouter fields
  const [modelName, setModelName] = useState('cognitivecomputations/dolphin-mistral-24b-venice-edition:free');
  const [apiKey, setApiKey] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && genericPrompt.trim()) {
      onLogin({
        backend: 'custom',
        email: email.trim(),
        genericPrompt: genericPrompt.trim(),
        apiUrl: apiUrl.trim() || undefined
      });
    }
  };

  const handleOpenRouterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modelName.trim() && apiKey.trim()) {
      onLogin({
        backend: 'openrouter',
        modelName: modelName.trim(),
        apiKey: apiKey.trim()
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Welcome to Perplexity Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={backend} onValueChange={(v) => setBackend(v as 'custom' | 'openrouter')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="custom">Custom Backend</TabsTrigger>
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
            </TabsList>
            
            <TabsContent value="custom">
              <form onSubmit={handleCustomSubmit} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="api-url">API URL (optional)</Label>
                  <Input
                    id="api-url"
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://your-backend.example.com"
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
            </TabsContent>
            
            <TabsContent value="openrouter">
              <form onSubmit={handleOpenRouterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model Name</Label>
                  <Input
                    id="model"
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apikey">API Key</Label>
                  <Input
                    id="apikey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your OpenRouter API key"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!modelName.trim() || !apiKey.trim()}
                >
                  Continue
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};