'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './Modal.module.scss';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const CLOSE_ANIMATION_MS = 150;

export function Modal({ isOpen, onClose, title, children, maxWidth = 'lg' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0 : undefined;

  // Dieu khien <dialog> bang API native showModal/close - tri hoan close() de kip
  // choi animation exit (150ms) truoc khi thuc su go dialog khoi lop hien thi.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      const timer = setTimeout(() => dialog.close(), prefersReducedMotion ? 0 : CLOSE_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, prefersReducedMotion]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={cn(styles.dialog, styles[`maxWidth${maxWidth.toUpperCase()}`])}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: duration ?? 0.2, ease: 'easeOut' }}
            className={styles.panel}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>{title}</h2>
              <button type="button" onClick={onClose} aria-label="Đóng" className={styles.close}>
                <X className={styles.closeIcon} />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
