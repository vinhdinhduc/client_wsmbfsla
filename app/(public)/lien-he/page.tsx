import { Metadata } from 'next';
import { Clock3, Mail, MapPin, Phone } from 'lucide-react';
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
      <div className={styles.introBlock}>
        <p className={styles.eyebrow}>MobiFone Sơn La</p>
        <h1 className={styles.title}>Chúng tôi luôn sẵn sàng lắng nghe</h1>
        <p className={styles.intro}>
          Gửi câu hỏi hoặc nhu cầu hỗ trợ, đội ngũ của chúng tôi sẽ phản hồi trong thời gian sớm
          nhất.
        </p>
      </div>
      <div className={styles.contactLayout}>
        <aside className={styles.infoPanel}>
          <h2 className={styles.infoTitle}>Kênh hỗ trợ</h2>
          <p className={styles.infoText}>
            Liên hệ trực tiếp để được tư vấn nhanh về dịch vụ và giải pháp.
          </p>
          <div className={styles.infoList}>
            <p>
              <Phone />{' '}
              <span>
                Hotline
                <br />
                <strong>1800 xxxx</strong>
              </span>
            </p>
            <p>
              <Mail />{' '}
              <span>
                Email
                <br />
                <strong>sonla@mobifone.vn</strong>
              </span>
            </p>
            <p>
              <MapPin />{' '}
              <span>
                Địa chỉ
                <br />
                <strong>Phường Tô Hiệu, tỉnh Sơn La</strong>
              </span>
            </p>
            <p>
              <Clock3 />{' '}
              <span>
                Thời gian làm việc
                <br />
                <strong>Thứ Hai - Thứ Bảy: 07:30 - 17:30</strong>
              </span>
            </p>
          </div>
        </aside>
        <div className={styles.card}>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
