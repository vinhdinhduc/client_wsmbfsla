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
  let blocks: Array<{ type: string; enabled: boolean; title: string; content: string }> = [];
  try {
    blocks = JSON.parse(settings.about_blocks || '[]');
  } catch {
    blocks = [];
  }
  const hero = blocks.find((block) => block.enabled && block.type === 'hero');

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Giới thiệu' }]} />
      <div className={styles.hero}>
        <p className={styles.eyebrow}>MobiFone Sơn La</p>
        <h1 className={styles.title}>{hero?.title ?? 'Kết nối gần hơn, phục vụ tốt hơn'}</h1>
        <p className={styles.intro}>
          {hero?.content ??
            'MobiFone Chi nhánh Sơn La cung cấp dịch vụ viễn thông và công nghệ số trên địa bàn tỉnh.'}
        </p>
      </div>

      {blocks
        .filter((block) => block.enabled && block.type !== 'hero')
        .map((block) => (
          <section key={`${block.type}-${block.title}`} className={styles.contactBox}>
            <div>
              <p className={styles.eyebrow}>{block.type}</p>
              <h2 className={styles.contactTitle}>{block.title}</h2>
            </div>
            <p className={styles.contactText}>{block.content}</p>
          </section>
        ))}

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
          {settings.contact_address ??
            settings.footer_address ??
            'Tổ 3, Phường Chiềng Lề, tỉnh Sơn La'}
        </p>
        <p className={styles.contactText}>Hotline: {settings.hotline ?? '18001090'}</p>
      </div>
    </div>
  );
}
