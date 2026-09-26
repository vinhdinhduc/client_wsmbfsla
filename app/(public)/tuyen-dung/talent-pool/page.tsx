import styles from '@/styles/service-pages.module.scss';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { JobApplyForm } from '../[slug]/JobApplyForm';
export default function TalentPool() {
  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <Breadcrumb
        items={[{ label: 'Tuyển dụng', href: '/tuyen-dung' }, { label: 'Nguồn ứng viên' }]}
      />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Kết nối cơ hội nghề nghiệp</p>
        <h1>Gửi CV vào nguồn ứng viên</h1>
        <p>Chúng tôi sẽ liên hệ khi có vị trí phù hợp.</p>
      </header>
      <JobApplyForm />
    </main>
  );
}
