import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Toast, ToastConfig, ToastType } from '../components/Toast';

interface ToastContextValue {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Global static reference so toast can be called imperatively from anywhere
let globalShowToast: ((config: ToastConfig) => void) | null = null;
let globalHideToast: (() => void) | null = null;

export const toast = {
  show: (config: ToastConfig) => {
    if (globalShowToast) {
      globalShowToast(config);
    } else {
      console.warn('[Toast] ToastProvider not mounted yet');
    }
  },
  success: (title: string, message?: string, duration?: number) => {
    toast.show({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration?: number) => {
    toast.show({ type: 'error', title, message, duration });
  },
  warning: (title: string, message?: string, duration?: number) => {
    toast.show({ type: 'warning', title, message, duration });
  },
  info: (title: string, message?: string, duration?: number) => {
    toast.show({ type: 'info', title, message, duration });
  },
  dismiss: () => {
    if (globalHideToast) globalHideToast();
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = useState<ToastConfig | null>(null);

  const hideToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const showToast = useCallback((config: ToastConfig) => {
    setCurrentToast({
      ...config,
      id: Math.random().toString(36).substring(7),
    });
  }, []);

  // Bind global pointers
  globalShowToast = showToast;
  globalHideToast = hideToast;

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'success', title, message, duration });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'error', title, message, duration });
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'warning', title, message, duration });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'info', title, message, duration });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <Toast toast={currentToast} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
