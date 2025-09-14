import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastConfig {
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  dismissible?: boolean;
  position?: 'top' | 'top-center' | 'top-left' | 'top-right';
  showIcon?: boolean;
  className?: string;
}

export interface ToastProps {
  id: string;
  message: string;
  config?: ToastConfig;
  onRemove: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyles = {
  success: 'bg-green-500/90 text-white border-green-400',
  error: 'bg-red-500/90 text-white border-red-400',
  info: 'bg-blue-500/90 text-white border-blue-400',
  warning: 'bg-yellow-500/90 text-white border-yellow-400',
};

const positionStyles = {
  'top': 'top-4 left-1/2 -translate-x-1/2',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
};

export const SiriToast: React.FC<ToastProps> = ({ id, message, config = {}, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const {
    type = 'info',
    duration = 4000,
    dismissible = true,
    position = 'top-center',
    showIcon = true,
    className = '',
  } = config;

  const Icon = toastIcons[type];

  useEffect(() => {
    // Trigger entrance animation
    const enterTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-dismiss timer
    let exitTimer: NodeJS.Timeout;
    if (duration > 0) {
      exitTimer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(id), 300); // Wait for exit animation
      }, duration);
    }

    return () => {
      clearTimeout(enterTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [id, duration, onRemove]);

  const handleDismiss = () => {
    if (dismissible) {
      setIsExiting(true);
      setTimeout(() => onRemove(id), 300);
    }
  };

  return (
    <div
      className={cn(
        'fixed z-[9999] pointer-events-auto transform transition-all duration-300 ease-out',
        positionStyles[position],
        isVisible && !isExiting
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-full opacity-0 scale-95'
      )}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl',
          'min-w-[300px] max-w-[500px]',
          toastStyles[type],
          className
        )}
        style={{
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Icon */}
        {showIcon && Icon && (
          <div className="flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}

        {/* Message */}
        <div className="flex-1 text-sm font-medium leading-relaxed">
          {message}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors duration-200"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SiriToast; 