import { Metadata } from 'next';
import { Building2, Users, Award, MapPin } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { settingsApi } from '@/lib/api/settings';
import styles from './page.module.scss';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description:
    'Giới thiệu về MobiFone Chi nhánh Sơn La - hành trình phát triển và cam kết đồng hành cùng khách hàng.',
};

const HIGHLIGHTS = [
  {
    icon: Building2,
    title: 'Chi nhánh trực thuộc TCT Viễn thông MobiFone',
    desc: 'Đại diện MobiFone phục vụ khách hàng trên địa bàn tỉnh Sơn La.',
  },
  {
    icon: Users,
    title: 'Đội ngũ tận tâm',
    desc: 'Đội ngũ giao dịch viên, kỹ thuật viên giàu kinh nghiệm, sẵn sàng hỗ trợ 24/7.',
  },
  {
    icon: Award,
    title: 'Chất lượng dịch vụ hàng đầu',
    desc: 'Hạ tầng mạng 4G/5G phủ sóng rộng khắp, chất lượng thoại và data ổn định.',
  },
  {
    icon: MapPin,
    title: 'Mạng lưới điểm bán rộng khắp',
    desc: 'Hệ thống cửa hàng, điểm giao dịch tại các huyện, thành phố trong tỉnh.',
  },
];

export default async function AboutPage() {
  const settings = await settingsApi
    .listPublic({ next: { revalidate: 300 } })
    .catch(() => ({}) as import('@/lib/api/settings').PublicSettings);

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Giới thiệu' }]} />
      <div className={styles.hero}>
        <p className={styles.eyebrow}>MobiFone Sơn La</p>
        <h1 className={styles.title}>Kết nối gần hơn, phục vụ tốt hơn</h1>
        <p className={styles.intro}>
          MobiFone Chi nhánh Sơn La là đơn vị trực thuộc Tổng công ty Viễn thông MobiFone, chịu
          trách nhiệm cung cấp dịch vụ viễn thông - công nghệ số cho khách hàng cá nhân, doanh
          nghiệp và các cơ quan nhà nước trên địa bàn tỉnh Sơn La. Với phương châm lấy khách hàng
          làm trung tâm, chúng tôi không ngừng đầu tư hạ tầng mạng lưới, nâng cao chất lượng dịch vụ
          và mở rộng mạng lưới điểm giao dịch để phục vụ tốt nhất nhu cầu của người dân và doanh
          nghiệp địa phương.
        </p>
      </div>

      <div className={styles.highlights}>
        {HIGHLIGHTS.map((h) => (
          <div key={h.title} className={styles.card}>
            <h.icon className={styles.icon} />
            <h3 className={styles.cardTitle}>{h.title}</h3>
            <p className={styles.cardDesc}>{h.desc}</p>
          </div>
        ))}
      </div>

      <div className={styles.contactBox}>
        <div>
          <p className={styles.eyebrow}>Luôn sẵn sàng hỗ trợ</p>
          <h3 className={styles.contactTitle}>Thông tin liên hệ</h3>
        </div>
        <p className={styles.contactText}>
          Địa chỉ:{' '}
          {settings.footer_address ?? 'Tổ 3, Phường Chiềng Lề, Thành phố Sơn La, tỉnh Sơn La'}
        </p>
        <p className={styles.contactText}>Hotline: {settings.hotline ?? '1800 xxxx'}</p>
      </div>
    </div>
  );
}
