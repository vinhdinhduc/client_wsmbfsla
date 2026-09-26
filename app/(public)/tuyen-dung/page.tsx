'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Users, CalendarDays } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FilterBar } from '@/components/ui/FilterBar';
import { jobsApi } from '@/lib/api/jobs';
import styles from './page.module.scss';
const typeLabel: Record<string, string> = {
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  contract: 'Hợp đồng',
  internship: 'Thực tập',
};
export default function CareersPage() {
  const [category, setCategory] = useState('');
  const [expired, setExpired] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ['jobs', category, expired],
    queryFn: () =>
      jobsApi.listPublic({ category: category || undefined, include_expired: expired }),
  });
  const categories = [...new Set(data.map((j) => j.category))];
  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <Breadcrumb items={[{ label: 'Tuyển dụng' }]} />
        <h1 className={styles.title}>
          Cơ hội nghề nghiệp tại <span>MobiFone Sơn La</span>
        </h1>
        <p className={styles.intro}>
          Cùng xây dựng các dịch vụ viễn thông và số cho cộng đồng Sơn La.
        </p>
      </div>
      <FilterBar
        label="Tìm cơ hội phù hợp"
        onReset={
          category || expired
            ? () => {
                setCategory('');
                setExpired(false);
              }
            : undefined
        }
      >
        <select
          aria-label="Nhóm ngành"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Tất cả nhóm ngành</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={expired} onChange={(e) => setExpired(e.target.checked)} />{' '}
          Hiện cả tin đã hết hạn
        </label>
      </FilterBar>
      {isLoading ? (
        <p>Đang tải…</p>
      ) : (
        <div className={styles.list}>
          {data.length === 0 && (
            <section className={styles.card}>
              <h2>Hiện chưa có vị trí phù hợp</h2>
              <p>Bạn vẫn có thể gửi CV vào nguồn ứng viên.</p>
              <Link href="/tuyen-dung/talent-pool">Gửi CV</Link>
            </section>
          )}
          {data.map((job) => {
            const isExpired = new Date(`${job.deadline}T23:59:59`) < new Date();
            return (
              <article key={job.id} className={styles.card}>
                {job.is_hot && <span className={styles.hot}>Hot</span>}
                {job.is_urgent && <span className={styles.hot}>Gấp</span>}
                <h2 className={styles.role}>{job.title}</h2>
                <div className={styles.details}>
                  <p>
                    <MapPin />
                    {job.location}
                  </p>
                  <p>
                    <Users />
                    {job.quantity} người · {typeLabel[job.employment_type] || job.employment_type}
                  </p>
                  <p>
                    <CalendarDays />
                    Hạn {new Date(job.deadline).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className={styles.cardActions}>
                  <Link className={styles.detailButton} href={`/tuyen-dung/${job.slug}`}>
                    Xem chi tiết
                  </Link>
                  {isExpired && <span className={styles.expired}>Đã hết hạn</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
