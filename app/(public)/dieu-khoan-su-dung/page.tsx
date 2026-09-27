import { Metadata } from 'next';
import { LegalDocument, LegalSection } from '@/components/shared/LegalDocument';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng',
  description: 'Điều khoản sử dụng của MobiFone Chi nhánh Sơn La.',
};
const sections: LegalSection[] = [
  {
    id: 'muc-1',
    title: '1. Đăng ký sản phẩm/dịch vụ',
    content: (
      <>
        <p>
          Việc gửi form đăng ký trên website là bước đầu tiên để nhân viên MobiFone liên hệ xác nhận
          thông tin. Giao dịch chỉ được hoàn tất sau khi có sự xác nhận trực tiếp giữa khách hàng và
          nhân viên tư vấn.
        </p>
      </>
    ),
  },
  {
    id: 'muc-2',
    title: '2. Thông tin sản phẩm',
    content: (
      <>
        <p>
          Giá cước, tình trạng sim số và các thông tin sản phẩm có thể thay đổi theo chính sách của
          MobiFone tại từng thời điểm mà không cần báo trước.
        </p>
      </>
    ),
  },
  {
    id: 'muc-3',
    title: '3. Trách nhiệm người dùng',
    content: (
      <>
        <p>
          Khách hàng chịu trách nhiệm về tính chính xác của thông tin cung cấp khi đăng ký hoặc liên
          hệ.
        </p>
      </>
    ),
  },
  {
    id: 'muc-4',
    title: '4. Thay đổi điều khoản',
    content: (
      <>
        <p>
          MobiFone Sơn La có quyền cập nhật điều khoản sử dụng và sẽ đăng tải phiên bản mới nhất tại
          trang này.
        </p>
      </>
    ),
  },
  {
    id: 'muc-5',
    title: '5. Quyền sở hữu trí tuệ',
    content: (
      <>
        <p>
          Nội dung, logo, nhãn hiệu, hình ảnh và thiết kế trên website thuộc quyền sở hữu của
          MobiFone hoặc được chủ sở hữu hợp pháp cho phép sử dụng. Các quyền này được bảo vệ theo
          pháp luật Việt Nam.
        </p>
        <p>
          Khách hàng được xem và in nội dung để tham khảo cá nhân. Việc sao chép, sửa đổi, phân phối
          hoặc khai thác thương mại cần có sự chấp thuận của chủ sở hữu, trừ trường hợp pháp luật
          cho phép.
        </p>
      </>
    ),
  },
  {
    id: 'muc-6',
    title: '6. Giới hạn trách nhiệm',
    content: (
      <>
        <p>
          MobiFone Sơn La nỗ lực duy trì website hoạt động ổn định và cung cấp thông tin chính xác.
          Website có thể bị gián đoạn do bảo trì, đường truyền, nhà cung cấp hạ tầng hoặc dịch vụ
          của bên thứ ba.
        </p>
        <p>
          Trong phạm vi pháp luật cho phép, MobiFone Sơn La không chịu trách nhiệm đối với gián đoạn
          do bên thứ ba ngoài khả năng kiểm soát hợp lý. Chúng tôi sẽ tiếp nhận phản ánh và phối hợp
          khắc phục. Quy định này không loại trừ trách nhiệm bắt buộc theo pháp luật hoặc quyền lợi
          hợp pháp của người tiêu dùng.
        </p>
      </>
    ),
  },
  {
    id: 'muc-7',
    title: '7. Luật áp dụng và giải quyết tranh chấp',
    content: (
      <>
        <p>
          Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Nếu có tranh chấp, khách hàng có
          thể gửi yêu cầu tại <a href="/lien-he">trang Liên hệ</a> hoặc gọi{' '}
          <a href="tel:18001090">18001090</a> để hai bên trao đổi và thương lượng.
        </p>
        <p>
          Nếu không đạt được thỏa thuận, tranh chấp được giải quyết tại Tòa án có thẩm quyền tại
          Việt Nam theo pháp luật tố tụng. Quyền khiếu nại và yêu cầu cơ quan có thẩm quyền bảo vệ
          quyền lợi của khách hàng được bảo lưu.
        </p>
      </>
    ),
  },
];
export default function Page() {
  return (
    <LegalDocument
      title="Điều khoản sử dụng"
      intro="Khi truy cập và sử dụng website MobiFone Chi nhánh Sơn La, khách hàng đồng ý tuân thủ các điều khoản dưới đây."
      sections={sections}
    />
  );
}
