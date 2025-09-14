import React, { createContext, useContext, useState, useCallback } from 'react';
import { SiriToast, ToastConfig } from '@/components/ui/siri-toast';

interface Toast {
  id: string;
  message: string;
  config?: ToastConfig;
}

interface ToastContextType {
  toast: (message: string, config?: ToastConfig) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const toast = useCallback((message: string, config?: ToastConfig): string => {
    const id = generateId();
    const newToast: Toast = { id, message, config };

    setToasts(prev => {
      // Remove oldest toasts if we exceed maxToasts
      const updatedToasts = prev.length >= maxToasts 
        ? prev.slice(-(maxToasts - 1))
        : prev;
      
      return [...updatedToasts, newToast];
    });

    return id;
  }, [generateId, maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    toast,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {toasts.map((toastItem, index) => (
          <div
            key={toastItem.id}
            style={{
              transform: `translateY(${index * 80}px)`, // Stack toasts vertically
              zIndex: 9999 - index, // Higher z-index for newer toasts
            }}
          >
            <SiriToast
              id={toastItem.id}
              message={toastItem.message}
              config={toastItem.config}
              onRemove={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Convenience functions for different toast types
export const createToastHelpers = (toast: ToastContextType['toast']) => ({
  success: (message: string, config?: Omit<ToastConfig, 'type'>) =>
    toast(message, { ...config, type: 'success' }),
  
  error: (message: string, config?: Omit<ToastConfig, 'type'>) =>
    toast(message, { ...config, type: 'error' }),
  
  info: (message: string, config?: Omit<ToastConfig, 'type'>) =>
    toast(message, { ...config, type: 'info' }),
  
  warning: (message: string, config?: Omit<ToastConfig, 'type'>) =>
    toast(message, { ...config, type: 'warning' }),
});

export default ToastProvider; 