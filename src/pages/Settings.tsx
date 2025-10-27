import { useState, useEffect } from 'react';
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

  const [backend, setBackend] = useState<'custom' | 'openrouter'>('custom');
  const [email, setEmail] = useState('');
  const [genericPrompt, setGenericPrompt] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Update form values when authData changes
  useEffect(() => {
    if (authData) {
      setBackend(authData.backend || 'custom');
      setEmail(authData.email || '');
      setGenericPrompt(authData.genericPrompt || '');
      setApiUrl(authData.apiUrl || '');
      setModelName(authData.modelName || '');
      setApiKey(authData.apiKey || '');
      
      console.log('📝 Settings: Loaded auth data:', {
        backend: authData.backend,
        email: authData.email,
        apiUrl: authData.apiUrl,
        modelName: authData.modelName,
        hasApiKey: !!authData.apiKey,
        hasGenericPrompt: !!authData.genericPrompt
      });
    }
  }, [authData]);

  const handleSave = () => {
    console.log('📝 Settings: Saving configuration:', {
      backend,
      email: backend === 'custom' ? email : undefined,
      apiUrl: backend === 'custom' ? apiUrl : undefined,
      genericPrompt: backend === 'custom' ? genericPrompt : undefined,
      modelName: backend === 'openrouter' ? modelName : undefined,
      apiKey: backend === 'openrouter' ? apiKey : undefined
    });

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
        
        {authData && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              Current configuration: <span className="font-medium">{authData.backend === 'custom' ? 'Custom Backend' : 'OpenRouter'}</span>
              {authData.backend === 'custom' && authData.apiUrl && (
                <span className="ml-2 text-xs">({authData.apiUrl})</span>
              )}
              {authData.backend === 'openrouter' && authData.modelName && (
                <span className="ml-2 text-xs">({authData.modelName})</span>
              )}
            </p>
          </div>
        )}

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
