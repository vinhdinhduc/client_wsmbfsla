'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import styles from './page.module.scss';

export default function Admin403Page() {
  return (
    <div className={styles.page}>
      <ShieldAlert className={styles.icon} />
      <h1 className={styles.title}>Bạn không có quyền truy cập</h1>
      <p className={styles.message}>
        Tài khoản của bạn không đủ quyền để xem trang này. Vui lòng liên hệ Quản trị viên nếu bạn
        cho rằng đây là nhầm lẫn.
      </p>
      <Link href="/admin/dashboard" className={styles.link}>
        Quay về Tổng quan
      </Link>
    </div>
  );
}
