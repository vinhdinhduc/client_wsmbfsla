import { BriefcaseBusiness, ListChecks, Gift, Check } from 'lucide-react';
import { normalizeJobContent } from '@/lib/jobs-presentation';
import styles from './JobDetail.module.scss';

export function JobContent({
  description,
  requirements,
  benefits,
}: {
  description?: string | null;
  requirements?: string | null;
  benefits?: string | null;
}) {
  const sections = [
    { title: 'Mô tả công việc', content: description, Icon: BriefcaseBusiness },
    { title: 'Yêu cầu', content: requirements, Icon: ListChecks },
    { title: 'Quyền lợi', content: benefits, Icon: Gift },
  ];
  const points = [...normalizeJobContent(benefits).matchAll(/<li>([\s\S]*?)<\/li>/g)].slice(0, 3);
  return (
    <>
      {sections
        .filter((section) => section.content?.trim())
        .map(({ title, content, Icon }) => (
          <section key={title} className={styles.card}>
            <h2 className={styles.sectionTitle}>
              <Icon size={21} aria-hidden="true" />
              {title}
            </h2>
            <div
              className={styles.prose}
              dangerouslySetInnerHTML={{ __html: normalizeJobContent(content) }}
            />
          </section>
        ))}
      {points.length === 3 && (
        <section className={`${styles.card} ${styles.why}`}>
          <h2 className={styles.sectionTitle}>
            <Gift size={21} aria-hidden="true" />
            Vì sao làm việc tại MobiFone Sơn La?
          </h2>
          <ul>
            {points.map((point, index) => (
              <li key={index}>
                <Check size={18} aria-hidden="true" />
                <div dangerouslySetInnerHTML={{ __html: point[1] }} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
