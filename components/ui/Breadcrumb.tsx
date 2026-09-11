import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumb.module.scss';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <Link href="/" className={styles.homeLink}>
        <Home className={styles.icon} />
        Trang chủ
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className={styles.item}>
          <ChevronRight className={styles.icon} />
          {item.href ? (
            <Link href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className={styles.current}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
