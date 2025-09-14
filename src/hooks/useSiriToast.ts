import { useToast as useToastContext, createToastHelpers } from '@/contexts/ToastContext';
import { ToastConfig } from '@/components/ui/siri-toast';

export const useSiriToast = () => {
  const { toast: baseToast, removeToast, clearAllToasts } = useToastContext();
  
  // Create helper functions for different toast types
  const helpers = createToastHelpers(baseToast);
  
  // Main toast function
  const toast = (message: string, config?: ToastConfig) => {
    return baseToast(message, config);
  };
  
  return {
    toast,
    success: helpers.success,
    error: helpers.error,
    info: helpers.info,
    warning: helpers.warning,
    remove: removeToast,
    clear: clearAllToasts,
  };
};

export default useSiriToast; 