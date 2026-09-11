import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật thông tin khách hàng của MobiFone Chi nhánh Sơn La.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Chính sách bảo mật' }]} />
      <div className={styles.content}>
        <h1>Chính sách bảo mật</h1>
        <p>
          MobiFone Chi nhánh Sơn La cam kết bảo vệ thông tin cá nhân của khách hàng theo đúng quy
          định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân.
        </p>
        <h2>1. Thông tin thu thập</h2>
        <p>
          Chúng tôi thu thập họ tên, số điện thoại, email và các thông tin khách hàng chủ động cung
          cấp khi đăng ký sản phẩm/dịch vụ hoặc gửi yêu cầu liên hệ qua website.
        </p>
        <h2>2. Mục đích sử dụng</h2>
        <p>
          Thông tin được sử dụng để xử lý yêu cầu đăng ký, chăm sóc khách hàng và gửi thông tin
          khuyến mãi khi khách hàng đồng ý nhận bản tin.
        </p>
        <h2>3. Bảo mật thông tin</h2>
        <p>
          Mọi thông tin khách hàng được lưu trữ và xử lý trên hệ thống có kiểm soát truy cập theo
          vai trò, tuân thủ nghiêm ngặt quy chế bảo mật nội bộ của MobiFone.
        </p>
        <h2>4. Liên hệ</h2>
        <p>Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ qua trang Liên hệ của website.</p>
      </div>
    </div>
  );
}
