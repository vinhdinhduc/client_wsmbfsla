import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ContactForm } from './_components/ContactForm';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ với MobiFone Chi nhánh Sơn La để được tư vấn và hỗ trợ.',
};

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Liên hệ' }]} />
      <h1 className={styles.title}>Liên hệ với chúng tôi</h1>
      <div className={styles.card}>
        <ContactForm />
      </div>
    </div>
  );
}
