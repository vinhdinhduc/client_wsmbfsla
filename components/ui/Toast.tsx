'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import styles from './Toast.module.scss';

type ToastTone = 'success' | 'error';

interface ToastMessage {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const duration = prefersReducedMotion ? 0 : 0.2;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration, ease: 'easeOut' }}
              className={`${styles.toast} ${toast.tone === 'success' ? styles.success : styles.error}`}
              role="status"
            >
              {toast.tone === 'success' ? (
                <CheckCircle2 className={`${styles.icon} ${styles.successIcon}`} />
              ) : (
                <XCircle className={`${styles.icon} ${styles.errorIcon}`} />
              )}
              <p className={styles.message}>{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className={styles.close}
                aria-label="Đóng thông báo"
              >
                <X className={styles.closeIcon} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phai duoc dung ben trong <ToastProvider>');
  return ctx;
}
