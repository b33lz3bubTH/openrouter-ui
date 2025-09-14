import React from 'react';
import { Button } from '@/components/ui/button';
import { useSiriToast } from '@/hooks/useSiriToast';

export const ToastDemo: React.FC = () => {
  const toast = useSiriToast();

  const showBasicToast = () => {
    toast.toast("Hello! This is a basic toast message 👋");
  };

  const showSuccessToast = () => {
    toast.success("Message sent successfully! ✅");
  };

  const showErrorToast = () => {
    toast.error("Something went wrong. Please try again.");
  };

  const showInfoToast = () => {
    toast.info("Here's some helpful information for you.");
  };

  const showWarningToast = () => {
    toast.warning("This action cannot be undone!");
  };

  const showCustomToast = () => {
    toast.toast("This toast stays for 8 seconds", {
      duration: 8000,
      position: 'top-right',
      type: 'success',
    });
  };

  const showPersistentToast = () => {
    toast.toast("This toast won't auto-dismiss", {
      duration: 0, // 0 means no auto-dismiss
      type: 'info',
    });
  };

  const clearAllToasts = () => {
    toast.clear();
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-4">Siri-Style Toast Demo</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Button onClick={showBasicToast} variant="outline">
          Basic Toast
        </Button>
        
        <Button onClick={showSuccessToast} variant="outline" className="text-green-600">
          Success Toast
        </Button>
        
        <Button onClick={showErrorToast} variant="outline" className="text-red-600">
          Error Toast
        </Button>
        
        <Button onClick={showInfoToast} variant="outline" className="text-blue-600">
          Info Toast
        </Button>
        
        <Button onClick={showWarningToast} variant="outline" className="text-yellow-600">
          Warning Toast
        </Button>
        
        <Button onClick={showCustomToast} variant="outline">
          Custom Duration
        </Button>
        
        <Button onClick={showPersistentToast} variant="outline">
          Persistent Toast
        </Button>
        
        <Button onClick={clearAllToasts} variant="destructive">
          Clear All
        </Button>
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Usage Examples:</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <code className="block">toast.toast("Basic message")</code>
          <code className="block">toast.success("Success message")</code>
          <code className="block">toast.error("Error message")</code>
          <code className="block">toast.info("Info message")</code>
          <code className="block">toast.warning("Warning message")</code>
          <code className="block">toast.toast("Custom", &#123; duration: 5000, position: 'top-right' &#125;)</code>
        </div>
      </div>
    </div>
  );
};

export default ToastDemo; 