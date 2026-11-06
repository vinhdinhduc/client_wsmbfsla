'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from './PasswordConfirmDialog.module.scss';

interface PasswordConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: (password: string) => void;
  onClose: () => void;
}

export function PasswordConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Xóa',
  isPending = false,
  onConfirm,
  onClose,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState('');

  function close() {
    if (isPending) return;
    setPassword('');
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || isPending) return;
    onConfirm(password);
    setPassword('');
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} maxWidth="sm">
      <form className={styles.form} onSubmit={submit}>
        <p role="alert">{description}</p>
        <label className={styles.passwordField}>
          <span>Mật khẩu tài khoản quản trị</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
          />
        </label>
        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" isLoading={isPending} disabled={!password}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
