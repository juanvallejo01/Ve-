import { createContext, useContext, useCallback, type ReactNode } from 'react';
import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Ported from the web app's `toast-context.tsx`. The web version rendered
 * its own fixed-position DOM overlay; RN has no such concept, so this wraps
 * `react-native-toast-message` instead (a single `<Toast />` singleton is
 * mounted once in `src/app/_layout.tsx`, styled via `src/lib/toast-config.tsx`
 * to match the app's design tokens). The public API — `showToast(message,
 * type)`, auto-dismiss after ~3s — is unchanged so call sites don't need to
 * change later.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    Toast.show({
      type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
    });
  }, []);

  return <ToastContext.Provider value={{ showToast }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
