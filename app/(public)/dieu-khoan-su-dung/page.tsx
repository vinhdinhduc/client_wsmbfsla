import { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng dịch vụ trên website MobiFone Chi nhánh Sơn La.',
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Điều khoản sử dụng' }]} />
      <div className={styles.content}>
        <h1>Điều khoản sử dụng</h1>
        <p>
          Khi truy cập và sử dụng website MobiFone Chi nhánh Sơn La, khách hàng đồng ý tuân thủ các
          điều khoản dưới đây.
        </p>
        <h2>1. Đăng ký sản phẩm/dịch vụ</h2>
        <p>
          Việc gửi form đăng ký trên website là bước đầu tiên để nhân viên MobiFone liên hệ xác nhận
          thông tin. Giao dịch chỉ được hoàn tất sau khi có sự xác nhận trực tiếp giữa khách hàng và
          nhân viên tư vấn.
        </p>
        <h2>2. Thông tin sản phẩm</h2>
        <p>
          Giá cước, tình trạng sim số và các thông tin sản phẩm có thể thay đổi theo chính sách của
          MobiFone tại từng thời điểm mà không cần báo trước.
        </p>
        <h2>3. Trách nhiệm người dùng</h2>
        <p>
          Khách hàng chịu trách nhiệm về tính chính xác của thông tin cung cấp khi đăng ký hoặc liên
          hệ.
        </p>
        <h2>4. Thay đổi điều khoản</h2>
        <p>
          MobiFone Sơn La có quyền cập nhật điều khoản sử dụng và sẽ đăng tải phiên bản mới nhất tại
          trang này.
        </p>
      </div>
    </div>
  );
}
