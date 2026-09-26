'use client';
import { ReactNode, useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button, ButtonProps } from './Button';
import { cn } from '@/lib/cn';
import styles from './FormLayout.module.scss';

export function ResponsiveTable({
  label,
  headings,
  children,
}: {
  label: string;
  headings: string[];
  children: ReactNode;
}) {
  return (
    <div className={styles.tableScroll} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table} role="table">
        <thead>
          <tr>
            {headings.map((heading) => (
              <th scope="col" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </header>
  );
}
export function FormCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className={styles.headerActions}>{actions}</div>}
      </header>
      {children}
    </section>
  );
}
export function FormSection({
  title,
  children,
  columns = false,
}: {
  title: string;
  children: ReactNode;
  columns?: boolean;
}) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      <div className={columns ? styles.grid : styles.stack}>{children}</div>
    </section>
  );
}
export function FormActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
export function IconButton({ label, className, ...props }: ButtonProps & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      {...props}
      className={cn(styles.iconButton, className)}
      aria-label={label}
      title={label}
    />
  );
}
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className={styles.empty} role="status">
      <Inbox aria-hidden="true" />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}
export function QueryState({
  loading,
  error,
  empty,
  emptyTitle,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  emptyTitle: string;
}) {
  if (loading)
    return (
      <p role="status" className={styles.muted}>
        Đang tải dữ liệu…
      </p>
    );
  if (error)
    return (
      <p role="alert" className={styles.error}>
        {error.message}
      </p>
    );
  return empty ? <EmptyState title={emptyTitle} /> : null;
}
export function ImagePreview({ url, label }: { url?: string | null; label: string }) {
  const [failed, setFailed] = useState<string>();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (failed === url) return <p className={styles.muted}>Không tải được ảnh xem trước.</p>;
  // Editor-provided external URLs cannot be enumerated in next/image remotePatterns.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.preview} src={url} alt={label} onError={() => setFailed(url)} />;
}
