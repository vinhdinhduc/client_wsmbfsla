import { FileCheck2, ListFilter, MessagesSquare, BadgeCheck } from 'lucide-react';
import styles from './JobDetail.module.scss';
export function JobProcess() {
  const steps = [
    { title: 'Tiếp nhận hồ sơ', text: 'Ghi nhận thông tin và CV của bạn.', Icon: FileCheck2 },
    { title: 'Sơ loại', text: 'Đánh giá hồ sơ theo yêu cầu vị trí.', Icon: ListFilter },
    { title: 'Phỏng vấn', text: 'Trao đổi kinh nghiệm và định hướng.', Icon: MessagesSquare },
    {
      title: 'Thông báo kết quả',
      text: 'Liên hệ ứng viên để thông báo kết quả.',
      Icon: BadgeCheck,
    },
  ];
  return (
    <section className={`${styles.card} ${styles.process}`} aria-labelledby="recruitment-process">
      <h2 id="recruitment-process" className={styles.sectionTitle}>
        Quy trình tuyển dụng
      </h2>
      <ol>
        {steps.map(({ title, text, Icon }, index) => (
          <li key={title}>
            <span className={styles.stepIcon}>
              <Icon size={22} aria-hidden="true" />
              <span className={styles.stepNumber}>{index + 1}</span>
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
