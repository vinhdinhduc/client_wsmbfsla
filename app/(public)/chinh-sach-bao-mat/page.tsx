import { Metadata } from 'next';
import { LegalDocument, LegalSection } from '@/components/shared/LegalDocument';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật của MobiFone Chi nhánh Sơn La.',
};
const sections: LegalSection[] = [
  {
    id: 'muc-1',
    title: '1. Thông tin thu thập',
    content: (
      <>
        <p>
          Chúng tôi thu thập họ tên, số điện thoại, email, địa chỉ nhận hàng và thông tin khách hàng
          chủ động cung cấp khi đăng ký, liên hệ, đặt lịch hoặc nhận ưu đãi. Hồ sơ ứng tuyển có thể
          gồm CV và thông tin kinh nghiệm. Khi sử dụng trợ lý AI, nội dung câu hỏi và thông tin kỹ
          thuật như địa chỉ IP có thể được ghi nhận.
        </p>
      </>
    ),
  },
  {
    id: 'muc-2',
    title: '2. Mục đích sử dụng',
    content: (
      <>
        <p>
          Thông tin được sử dụng để xử lý yêu cầu đăng ký, chăm sóc khách hàng và gửi thông tin
          khuyến mãi khi khách hàng đồng ý nhận bản tin.
        </p>
      </>
    ),
  },
  {
    id: 'muc-3',
    title: '3. Bảo mật thông tin',
    content: (
      <>
        <p>
          Mọi thông tin khách hàng được lưu trữ và xử lý trên hệ thống có kiểm soát truy cập theo
          vai trò, tuân thủ nghiêm ngặt quy chế bảo mật nội bộ của MobiFone.
        </p>
      </>
    ),
  },
  {
    id: 'muc-4',
    title: '4. Liên hệ',
    content: (
      <>
        <p>Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ qua trang Liên hệ của website.</p>
      </>
    ),
  },
  {
    id: 'muc-5',
    title: '5. Thời gian lưu trữ dữ liệu',
    content: (
      <>
        <ul>
          <li>
            Thông tin yêu cầu đăng ký, liên hệ và đặt lịch trên website: tối đa 24 tháng kể từ khi
            yêu cầu được hoàn tất hoặc hủy.
          </li>
          <li>
            Email nhận ưu đãi: lưu trong thời gian đăng ký nhận tin; khi hủy, dừng gửi bản tin và xử
            lý xóa dữ liệu nhận tin trong 30 ngày. Có thể giữ thông tin tối thiểu trong danh sách
            chặn gửi để tôn trọng yêu cầu không nhận tin.
          </li>
          <li>
            Hồ sơ ứng tuyển: tối đa 12 tháng kể từ khi kết thúc đợt tuyển dụng, trừ khi ứng viên
            đồng ý cho lưu lâu hơn hoặc hồ sơ chuyển thành hồ sơ nhân sự.
          </li>
          <li>
            Nội dung trao đổi với trợ lý AI: tối đa 12 tháng để hỗ trợ và đánh giá chất lượng dịch
            vụ.
          </li>
        </ul>
        <p>
          Khi hết thời hạn hoặc có yêu cầu xóa hợp lệ, dữ liệu được xóa hoặc ẩn danh. Trường hợp
          phải lưu để thực hiện hợp đồng, giải quyết tranh chấp hoặc nghĩa vụ pháp lý, chỉ giữ dữ
          liệu cần thiết trong thời gian tương ứng và thông báo lý do cho khách hàng. Các mốc trên
          áp dụng cho dữ liệu yêu cầu trên website; hồ sơ thuê bao, hợp đồng và chứng từ tuân theo
          thời hạn lưu trữ chuyên ngành.
        </p>
      </>
    ),
  },
  {
    id: 'muc-6',
    title: '6. Chia sẻ dữ liệu với bên thứ ba',
    content: (
      <>
        <p>
          Dữ liệu có thể được cung cấp trong phạm vi cần thiết cho bộ phận, cửa hàng MobiFone xử lý
          yêu cầu; đơn vị giao hàng khi khách chọn giao SIM; nhà cung cấp hạ tầng, email và dịch vụ
          kỹ thuật phục vụ website. Thông tin thuê bao được xử lý trong hệ thống của nhà mạng
          MobiFone theo quy trình đăng ký dịch vụ.
        </p>
        <p>
          Khi được cấu hình và sử dụng, website có thể kết nối Google reCAPTCHA để chống spam;
          Google Analytics và Meta Pixel để đo lường khi khách hàng đồng ý; nhà cung cấp AI để trả
          lời câu hỏi gửi cho trợ lý. Không gửi mật khẩu, OTP hay giấy tờ định danh qua khung chat.
        </p>
        <p>
          Chúng tôi không bán dữ liệu cá nhân. Bên tiếp nhận chỉ được xử lý đúng mục đích và có
          trách nhiệm bảo vệ dữ liệu. Việc cung cấp cho cơ quan nhà nước được thực hiện theo yêu cầu
          hợp pháp. Khách hàng có thể liên hệ để biết bên tiếp nhận cụ thể đối với yêu cầu của mình;
          việc chuyển dữ liệu ra nước ngoài, nếu phát sinh, phải tuân thủ pháp luật hiện hành.
        </p>
      </>
    ),
  },
  {
    id: 'muc-7',
    title: '7. Quyền của khách hàng',
    content: (
      <>
        <p>
          Khách hàng có quyền được biết về việc xử lý dữ liệu; đồng ý hoặc rút lại sự đồng ý; yêu
          cầu truy cập, cung cấp bản sao, chỉnh sửa, xóa, hạn chế hoặc phản đối việc xử lý; khiếu
          nại và yêu cầu bảo vệ quyền lợi theo pháp luật.
        </p>
        <p>
          Để thực hiện, gọi <a href="tel:18001090">18001090</a> hoặc gửi yêu cầu tại{' '}
          <a href="/lien-he">trang Liên hệ</a>, nêu quyền muốn thực hiện, thông tin liên hệ đã sử
          dụng và mã yêu cầu (nếu có). Nhân viên sẽ hướng dẫn xác minh danh tính phù hợp, tiếp nhận
          và phản hồi theo thời hạn pháp luật quy định. Không cung cấp mật khẩu hoặc OTP để thực
          hiện quyền.
        </p>
        <p>
          Rút lại sự đồng ý không ảnh hưởng tính hợp pháp của việc xử lý trước đó; một số dịch vụ có
          thể không tiếp tục được cung cấp nếu thiếu dữ liệu cần thiết. Khách hàng có thể hủy nhận
          ưu đãi qua liên kết trong email. Nếu yêu cầu không thể thực hiện vì nghĩa vụ pháp lý,
          chúng tôi sẽ giải thích lý do và phạm vi dữ liệu phải giữ.
        </p>
      </>
    ),
  },
  {
    id: 'muc-8',
    title: '8. Cookie & công nghệ theo dõi',
    content: (
      <>
        <p>
          Website sử dụng cookie và bộ nhớ trình duyệt để duy trì đăng nhập, giỏ đăng ký, cuộc trò
          chuyện và lựa chọn quyền riêng tư. Google reCAPTCHA có thể xử lý thông tin thiết bị và
          tương tác để ngăn chặn spam khi gửi form.
        </p>
        <p>
          Google Analytics và Meta Pixel chỉ được bật khi đã được cấu hình và khách hàng chọn đồng ý
          đo lường ở bảng lựa chọn cookie. Khách hàng có thể chọn “Chỉ cookie cần thiết”. Để thay
          đổi lựa chọn, xóa dữ liệu website trong cài đặt trình duyệt rồi tải lại và chọn lại; việc
          này có thể đồng thời xóa giỏ hàng và phiên đăng nhập trên thiết bị.
        </p>
        <p>
          Khách hàng cũng có thể chặn hoặc xóa cookie trong trình duyệt. Việc chặn cookie cần thiết
          có thể làm một số chức năng không hoạt động.
        </p>
      </>
    ),
  },
];
export default function Page() {
  return (
    <LegalDocument
      title="Chính sách bảo mật"
      intro="MobiFone Chi nhánh Sơn La cam kết bảo vệ thông tin cá nhân của khách hàng theo đúng quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân."
      sections={sections}
    />
  );
}
