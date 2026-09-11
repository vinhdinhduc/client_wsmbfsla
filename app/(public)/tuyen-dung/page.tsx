import { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Send } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Tuyển dụng',
  description: 'Thông tin tuyển dụng tại MobiFone Chi nhánh Sơn La.',
};

const POSITIONS = [
  { title: 'Giao dịch viên', location: 'TP. Sơn La', type: 'Toàn thời gian' },
  {
    title: 'Kỹ thuật viên hạ tầng viễn thông',
    location: 'Các huyện trong tỉnh',
    type: 'Toàn thời gian',
  },
  { title: 'Chuyên viên kinh doanh giải pháp số', location: 'TP. Sơn La', type: 'Toàn thời gian' },
];

export default function CareersPage() {
  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Tuyển dụng' }]} />
      <h1 className={styles.title}>
        <Briefcase className={styles.icon} />
        Cơ hội nghề nghiệp
      </h1>
      <p className={styles.intro}>
        MobiFone Sơn La luôn tìm kiếm những ứng viên tài năng, nhiệt huyết để cùng đồng hành phát
        triển. Dưới đây là các vị trí đang tuyển dụng - vui lòng liên hệ để nộp hồ sơ ứng tuyển.
      </p>

      <div className={styles.list}>
        {POSITIONS.map((p) => (
          <div key={p.title} className={styles.card}>
            <div>
              <h3 className={styles.role}>{p.title}</h3>
              <p className={styles.meta}>
                {p.location} · {p.type}
              </p>
            </div>
            <Link href="/lien-he" className={styles.applyButton}>
              <Send className={styles.applyIcon} /> Ứng tuyển ngay
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
