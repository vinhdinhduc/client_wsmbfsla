import { Metadata } from 'next';
import { Building2, Users, Award, MapPin } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { settingsApi } from '@/lib/api/settings';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description: 'Giới thiệu về MobiFone Chi nhánh Sơn La - hành trình phát triển và cam kết đồng hành cùng khách hàng.',
};

const HIGHLIGHTS = [
  { icon: Building2, title: 'Chi nhánh trực thuộc TCT Viễn thông MobiFone', desc: 'Đại diện MobiFone phục vụ khách hàng trên địa bàn tỉnh Sơn La.' },
  { icon: Users, title: 'Đội ngũ tận tâm', desc: 'Đội ngũ giao dịch viên, kỹ thuật viên giàu kinh nghiệm, sẵn sàng hỗ trợ 24/7.' },
  { icon: Award, title: 'Chất lượng dịch vụ hàng đầu', desc: 'Hạ tầng mạng 4G/5G phủ sóng rộng khắp, chất lượng thoại và data ổn định.' },
  { icon: MapPin, title: 'Mạng lưới điểm bán rộng khắp', desc: 'Hệ thống cửa hàng, điểm giao dịch tại các huyện, thành phố trong tỉnh.' },
];

export default async function AboutPage() {
  const settings = await settingsApi.listPublic({ next: { revalidate: 300 } }).catch(() => ({}) as import('@/lib/api/settings').PublicSettings);

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Giới thiệu' }]} />
      <h1 className="mb-4 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
        Giới thiệu về {settings.site_name ?? 'MobiFone Sơn La'}
      </h1>
      <p className="max-w-3xl text-neutral-500">
        MobiFone Chi nhánh Sơn La là đơn vị trực thuộc Tổng công ty Viễn thông MobiFone, chịu trách nhiệm cung cấp
        dịch vụ viễn thông - công nghệ số cho khách hàng cá nhân, doanh nghiệp và các cơ quan nhà nước trên địa bàn
        tỉnh Sơn La. Với phương châm lấy khách hàng làm trung tâm, chúng tôi không ngừng đầu tư hạ tầng mạng lưới,
        nâng cao chất lượng dịch vụ và mở rộng mạng lưới điểm giao dịch để phục vụ tốt nhất nhu cầu của người dân
        và doanh nghiệp địa phương.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((h) => (
          <div key={h.title} className="rounded-lg border border-neutral-100 bg-white p-5">
            <h.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-heading font-semibold text-neutral-900">{h.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{h.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-neutral-100 bg-neutral-100 p-5">
        <h3 className="font-heading font-semibold text-neutral-900">Thông tin liên hệ</h3>
        <p className="mt-2 text-sm text-neutral-500">
          Địa chỉ: Tổ 3, Phường Chiềng Lề, Thành phố Sơn La, tỉnh Sơn La
        </p>
        <p className="text-sm text-neutral-500">Hotline: {settings.hotline ?? '1800 xxxx'}</p>
      </div>
    </div>
  );
}
