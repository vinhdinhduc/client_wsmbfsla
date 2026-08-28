import { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Send } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = {
  title: 'Tuyển dụng',
  description: 'Thông tin tuyển dụng tại MobiFone Chi nhánh Sơn La.',
};

const POSITIONS = [
  { title: 'Giao dịch viên', location: 'TP. Sơn La', type: 'Toàn thời gian' },
  { title: 'Kỹ thuật viên hạ tầng viễn thông', location: 'Các huyện trong tỉnh', type: 'Toàn thời gian' },
  { title: 'Chuyên viên kinh doanh giải pháp số', location: 'TP. Sơn La', type: 'Toàn thời gian' },
];

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Tuyển dụng' }]} />
      <h1 className="mb-4 mt-3 flex items-center gap-2 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
        <Briefcase className="h-6 w-6" />
        Cơ hội nghề nghiệp
      </h1>
      <p className="max-w-3xl text-neutral-500">
        MobiFone Sơn La luôn tìm kiếm những ứng viên tài năng, nhiệt huyết để cùng đồng hành phát triển. Dưới đây
        là các vị trí đang tuyển dụng - vui lòng liên hệ để nộp hồ sơ ứng tuyển.
      </p>

      <div className="mt-6 space-y-3">
        {POSITIONS.map((p) => (
          <div key={p.title} className="flex flex-col gap-2 rounded-lg border border-neutral-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading font-semibold text-neutral-900">{p.title}</h3>
              <p className="text-sm text-neutral-500">{p.location} · {p.type}</p>
            </div>
            <Link
              href="/lien-he"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <Send className="h-4 w-4" /> Ứng tuyển ngay
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
