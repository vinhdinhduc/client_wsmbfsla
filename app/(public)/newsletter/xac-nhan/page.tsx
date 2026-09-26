import { Mail } from 'lucide-react';
import styles from '@/styles/service-pages.module.scss';
import Link from 'next/link';
import { newsletterApi } from '@/lib/api/newsletter';
export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  let message = 'Liên kết không hợp lệ.';
  try {
    await newsletterApi.confirm(token);
    message = 'Bạn đã xác nhận đăng ký nhận tin thành công.';
  } catch (error) {
    message = (error as Error).message;
  }
  return (
    <main className={`${styles.page} ${styles.result}`}>
      <div className={styles.panel}>
        <span className={styles.resultIcon}>
          <Mail aria-hidden="true" />
        </span>
        <h1>Xác nhận nhận tin</h1>
        <p>{message}</p>
        <Link className={styles.backLink} href="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
