'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** vd: max-w-lg, max-w-2xl - mac dinh max-w-lg */
  maxWidthClassName?: string;
}

const CLOSE_ANIMATION_MS = 150;

export function Modal({ isOpen, onClose, title, children, maxWidthClassName = 'max-w-lg' }: ModalProps) {
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
      className={cn(
        'm-auto w-full rounded-lg p-0 backdrop:bg-transparent',
        "[&::backdrop]:bg-neutral-900/50",
        maxWidthClassName,
      )}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: duration ?? 0.2, ease: 'easeOut' }}
            className="w-full rounded-lg bg-white shadow-md"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-neutral-900">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="relative text-neutral-500 hover:text-neutral-900 before:absolute before:content-[''] before:-inset-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
