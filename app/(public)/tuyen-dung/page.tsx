'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Building2, CalendarDays, Clock3, MapPin, Send, Users } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Modal } from '@/components/ui/Modal';
import styles from './page.module.scss';

const POSITIONS = [
  {
    title: 'Giao dịch viên',
    location: 'TP. Sơn La',
    type: 'Toàn thời gian',
    quantity: 4,
    hot: true,
    category: 'Kinh doanh - Marketing',
  },
  {
    title: 'Kỹ thuật viên hạ tầng viễn thông',
    location: 'Các huyện trong tỉnh',
    type: 'Toàn thời gian',
    quantity: 3,
    hot: true,
    category: 'Kỹ thuật viễn thông',
  },
  {
    title: 'Chuyên viên kinh doanh giải pháp số',
    location: 'TP. Sơn La',
    type: 'Toàn thời gian',
    quantity: 5,
    hot: true,
    category: 'Kinh doanh - Marketing',
  },
  {
    title: 'Chuyên viên tối ưu mạng và quản lý',
    location: 'TP. Sơn La',
    type: 'Toàn thời gian',
    quantity: 2,
    hot: true,
    category: 'Công nghệ thông tin',
  },
  {
    title: 'Chuyên viên Pháp chế',
    location: 'TP. Sơn La',
    type: 'Toàn thời gian',
    quantity: 1,
    hot: true,
    category: 'Nhân sự',
  },
  {
    title: 'Chuyên viên Kế toán',
    location: 'TP. Sơn La',
    type: 'Toàn thời gian',
    quantity: 1,
    hot: true,
    category: 'Tài chính - Kế toán',
  },
];

const CATEGORIES = [
  'Tất cả',
  'Công nghệ thông tin',
  'Kinh doanh - Marketing',
  'Kỹ thuật viễn thông',
  'Nhân sự',
  'Tài chính - Kế toán',
];
const DEADLINE = '20/08/2026';
const DESCRIPTION =
  'Kéo đầu nối, lắp đặt và bảo trì cáp quang, hạ tầng viễn thông. Kiểm tra, đo kiểm và xử lý sự cố mạng lưới viễn thông. Tham gia ứng cứu thông tin, khắc phục sự cố đứt cáp, mất liên lạc, suy hao tín hiệu.';

export default function CareersPage() {
  const [category, setCategory] = useState('Tất cả');
  const [selectedPosition, setSelectedPosition] = useState<(typeof POSITIONS)[number] | null>(null);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <Breadcrumb items={[{ label: 'Việc làm' }]} />
        <h1 className={styles.title}>
          Tìm kiếm <span>ước mơ kiến tạo</span>
        </h1>
        <p className={styles.intro}>
          Chúng tôi luôn chào đón những nhân tài sáng tạo và nhiệt huyết
          <br /> gia nhập đại gia đình MobiFone Sơn La
        </p>
      </div>
      <div className={styles.filters} role="tablist" aria-label="Lọc vị trí tuyển dụng">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? styles.filterActive : styles.filter}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={styles.list}>
        {POSITIONS.filter(
          (position) => category === 'Tất cả' || position.category === category,
        ).map((position) => (
          <article key={position.title} className={styles.card}>
            {position.hot && <span className={styles.hot}>Hot</span>}
            <h2 className={styles.role}>{position.title}</h2>
            <div className={styles.details}>
              <p>
                <Building2 /> <strong>MobiFone Sơn La</strong>
              </p>
              <p>
                <Clock3 /> Ngày hết hạn: {DEADLINE}
              </p>
              <p>
                <Users /> Số lượng: {position.quantity} người
              </p>
              <p>
                <MapPin /> {position.location}
              </p>
            </div>
            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.detailButton}
                onClick={() => setSelectedPosition(position)}
              >
                Xem chi tiết
              </button>
              <span className={styles.expired}>Đã hết hạn</span>
            </div>
          </article>
        ))}
      </div>
      <Modal isOpen={selectedPosition !== null} onClose={() => setSelectedPosition(null)} title="">
        {selectedPosition && (
          <div className={styles.modalContent}>
            <Breadcrumb items={[{ label: 'Việc làm' }, { label: selectedPosition.title }]} />
            <h2 className={styles.modalTitle}>{selectedPosition.title}</h2>
            <div className={styles.modalSummary}>
              <div className={styles.summaryGrid}>
                <p>
                  <MapPin />{' '}
                  <span>
                    NƠI LÀM VIỆC<strong>{selectedPosition.location}</strong>
                  </span>
                </p>
                <p>
                  <Building2 />{' '}
                  <span>
                    ĐƠN VỊ<strong>MobiFone Sơn La</strong>
                  </span>
                </p>
                <p>
                  <Users />{' '}
                  <span>
                    SỐ LƯỢNG<strong>{selectedPosition.quantity} người</strong>
                  </span>
                </p>
                <p>
                  <CalendarDays />{' '}
                  <span>
                    HẠN NỘP HỒ SƠ<strong className={styles.dangerText}>{DEADLINE}</strong>
                  </span>
                </p>
              </div>
              <div className={styles.modalStatus}>
                <p>
                  <CalendarDays /> Ngày đăng: 10/08/2026
                </p>
                <span>Đã hết hạn</span>
                <button type="button">☆ Lưu tin</button>
              </div>
            </div>
            <section className={styles.modalSection}>
              <h3>MÔ TẢ CÔNG VIỆC</h3>
              <p>{DESCRIPTION}</p>
            </section>
            <section className={styles.modalSection}>
              <h3>YÊU CẦU</h3>
              <p>
                Tốt nghiệp từ Cao đẳng trở lên, có kiến thức cơ bản về mạng viễn thông và khả năng
                làm việc độc lập hoặc theo nhóm.
              </p>
            </section>
            <section className={styles.modalSection}>
              <h3>KỸ NĂNG</h3>
            </section>
            <section className={styles.modalSection}>
              <h3>PHÚC LỢI</h3>
            </section>
            <Link href="/lien-he" className={styles.modalApply}>
              <Send /> Liên hệ ứng tuyển
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
