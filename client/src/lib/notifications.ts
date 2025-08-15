import { toast } from 'sonner';

// Enhanced notification system with better UX
export const notifications = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 6000, // Longer for errors
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },

  // Custom action toast
  action: (
    message: string,
    {
      label,
      onClick,
      description,
    }: {
      label: string;
      onClick: () => void;
      description?: string;
    }
  ) => {
    toast(message, {
      description,
      action: {
        label,
        onClick,
      },
      duration: 8000, // Longer for action toasts
    });
  },

  // Dismiss all toasts
  dismiss: () => {
    toast.dismiss();
  },
};

// Convenience exports
export const { success, error, warning, info, loading, promise, action, dismiss } = notifications;
