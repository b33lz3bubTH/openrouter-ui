import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { authData, login } = useAuth();
  const { toast } = useToast();

  const [backend, setBackend] = useState<'custom' | 'openrouter'>(authData?.backend || 'custom');
  const [email, setEmail] = useState(authData?.email || '');
  const [genericPrompt, setGenericPrompt] = useState(authData?.genericPrompt || '');
  const [apiUrl, setApiUrl] = useState(authData?.apiUrl || '');
  const [modelName, setModelName] = useState(authData?.modelName || '');
  const [apiKey, setApiKey] = useState(authData?.apiKey || '');

  const handleSave = () => {
    if (backend === 'custom') {
      login({
        backend: 'custom',
        email,
        genericPrompt,
        apiUrl,
      });
    } else {
      login({
        backend: 'openrouter',
        modelName,
        apiKey,
      });
    }

    toast({
      title: 'Settings saved',
      description: 'Your configuration has been updated successfully.',
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Button>

        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Backend Type</Label>
            <div className="flex gap-4">
              <Button
                variant={backend === 'custom' ? 'default' : 'outline'}
                onClick={() => setBackend('custom')}
                className="flex-1"
              >
                Custom Backend
              </Button>
              <Button
                variant={backend === 'openrouter' ? 'default' : 'outline'}
                onClick={() => setBackend('openrouter')}
                className="flex-1"
              >
                OpenRouter
              </Button>
            </div>
          </div>

          {backend === 'custom' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genericPrompt">Generic Prompt</Label>
                <textarea
                  id="genericPrompt"
                  value={genericPrompt}
                  onChange={(e) => setGenericPrompt(e.target.value)}
                  placeholder="Enter system prompt..."
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Name</Label>
                <Input
                  id="modelName"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g., anthropic/claude-3.5-sonnet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                />
              </div>
            </>
          )}

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
