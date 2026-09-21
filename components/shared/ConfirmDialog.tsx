'use client';

import { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import styles from './ConfirmDialog.module.scss';

export function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  isPending,
  destructive,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className={styles.content}>{children}</div>
      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isPending}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
