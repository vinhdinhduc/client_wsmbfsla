import { Metadata } from 'next';
import { storesApi } from '@/lib/api/stores';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AppointmentForm } from './_components/AppointmentForm';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Đặt lịch đến cửa hàng',
  description: 'Chọn cửa hàng và thời gian để được giao dịch viên đón tiếp.',
};

export default async function AppointmentPage() {
  const stores = await storesApi.listPublic(undefined, { next: { revalidate: 60 } });
  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Đặt lịch đến cửa hàng' }]} />
      <div className={styles.intro}>
        <p className={styles.kicker}>Dịch vụ tại cửa hàng</p>
        <h1 className={styles.title}>Đặt lịch đến cửa hàng</h1>
        <p className={styles.description}>
          Chọn điểm giao dịch, ngày và giờ phù hợp. Lịch hẹn sẽ được chuyển đến giao dịch viên đang
          trực tại cửa hàng.
        </p>
      </div>
      <AppointmentForm stores={stores} />
    </div>
  );
}
