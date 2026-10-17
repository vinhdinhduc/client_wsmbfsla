export interface EmailVariable {
  key: string;
  description: string;
  example: string;
}

export const EMAIL_VARIABLES: EmailVariable[] = [
  { key: 'customer_name', description: 'Tên khách hàng', example: 'Nguyễn Văn A' },
  { key: 'registration_code', description: 'Mã đăng ký', example: 'DK-2025-0001' },
  { key: 'phone', description: 'Số điện thoại liên hệ', example: '0901 234 567' },
  { key: 'status', description: 'Trạng thái xử lý', example: 'Đã tiếp nhận' },
  { key: 'message', description: 'Nội dung hoặc ghi chú', example: 'Quý khách vui lòng giữ máy' },
  { key: 'store_name', description: 'Tên cửa hàng', example: 'Cửa hàng MobiFone Sơn La' },
  { key: 'hotline', description: 'Số hotline', example: '0212 3758 758' },
  { key: 'branch_name', description: 'Tên chi nhánh', example: 'MobiFone Sơn La' },
  { key: 'item_count', description: 'Số lượng sản phẩm', example: '3' },
  {
    key: 'confirm_url',
    description: 'Liên kết xác nhận',
    example: 'https://mobifone-sonla.vn/xac-nhan',
  },
  {
    key: 'unsubscribe_url',
    description: 'Liên kết ngừng nhận thư',
    example: 'https://mobifone-sonla.vn/bo-nhan-thu',
  },
  { key: 'appointment_date', description: 'Ngày hẹn', example: '02/10/2026' },
  { key: 'appointment_time', description: 'Giờ hẹn', example: '09:30' },
  {
    key: 'store_address',
    description: 'Địa chỉ cửa hàng',
    example: '96B Đường 3/2, Phường Tô Hiệu, Tỉnh Sơn La',
  },
];

export const EMAIL_TEMPLATE_CATALOG: Record<
  string,
  { title: string; description: string; variables: string[] }
> = {
  registration_received_customer: {
    title: 'Xác nhận đã nhận đăng ký – gửi khách',
    description: 'Thông báo khách hàng đã gửi đăng ký thành công.',
    variables: [
      'customer_name',
      'registration_code',
      'phone',
      'item_count',
      'branch_name',
      'hotline',
    ],
  },
  registration_new_staff: {
    title: 'Có đăng ký mới – gửi nhân viên',
    description: 'Thông tin tóm tắt đăng ký mới cần xử lý.',
    variables: [
      'customer_name',
      'registration_code',
      'phone',
      'item_count',
      'branch_name',
      'hotline',
      'confirm_url',
    ],
  },
  registration_status_changed: {
    title: 'Cập nhật trạng thái đăng ký – gửi khách',
    description: 'Thông báo khi trạng thái đăng ký được thay đổi.',
    variables: [
      'customer_name',
      'registration_code',
      'status',
      'message',
      'hotline',
      'branch_name',
    ],
  },
  contact_new_staff: {
    title: 'Có liên hệ mới – gửi nhân viên',
    description: 'Thông tin khách hàng và nội dung liên hệ mới.',
    variables: ['customer_name', 'phone', 'message', 'branch_name', 'confirm_url'],
  },
  contact_received_customer: {
    title: 'Xác nhận đã nhận liên hệ – gửi khách',
    description: 'Xác nhận nội dung liên hệ đã được chuyển tới chi nhánh.',
    variables: ['customer_name', 'phone', 'message', 'branch_name', 'hotline'],
  },
  appointment_confirmed: {
    title: 'Xác nhận lịch hẹn – gửi khách',
    description: 'Thông tin lịch hẹn và cửa hàng tiếp nhận.',
    variables: [
      'customer_name',
      'store_name',
      'phone',
      'appointment_date',
      'appointment_time',
      'store_address',
      'branch_name',
      'hotline',
    ],
  },
  appointment_new_staff: {
    title: 'Có lịch hẹn mới – gửi nhân viên',
    description: 'Thông tin khách hàng cần được cửa hàng xác nhận.',
    variables: [
      'customer_name',
      'store_name',
      'phone',
      'appointment_date',
      'appointment_time',
      'store_address',
      'branch_name',
      'confirm_url',
    ],
  },
  account_created: {
    title: 'Tài khoản quản trị đã được tạo',
    description: 'Thông báo thông tin tài khoản mới cho nhân viên.',
    variables: ['customer_name', 'confirm_url'],
  },
  password_reset: {
    title: 'Mã OTP đặt lại mật khẩu',
    description: 'Mã xác thực một lần gửi khi nhân viên yêu cầu đặt lại mật khẩu.',
    variables: ['message', 'confirm_url'],
  },
};

export const EMAIL_SAMPLE_DATA: Record<string, string> = Object.fromEntries(
  EMAIL_VARIABLES.map(({ key, example }) => [key, example]),
);
