'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Gift, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { promotionsApi, type Promotion } from '@/lib/api/promotions';
import { PromotionExperience } from '@/components/promotions/PromotionExperience';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { PromotionEditor } from './PromotionEditor';
import { formatPromotionDate } from './form';
import shared from '../admin-shared.module.scss';
import styles from './page.module.scss';

function promotionStatus(promotion: Promotion): { label: string; tone: 'neutral' | 'warning' | 'success' } {
  if (!promotion.is_active) return { label: 'Đã tắt', tone: 'neutral' };
  const now = Date.now();
  if (promotion.end_at && Date.parse(promotion.end_at) <= now) return { label: 'Hết hạn', tone: 'neutral' };
  if (promotion.start_at && Date.parse(promotion.start_at) > now) return { label: 'Chờ bắt đầu', tone: 'warning' };
  return { label: 'Đang hoạt động', tone: 'success' };
}

export default function AdminPromotionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editor, setEditor] = useState<{ promotion?: Promotion } | null>(null);
  const [preview, setPreview] = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['admin-promotions'], queryFn: promotionsApi.list, enabled: user?.role === 'admin',
  });
  const toggle = useMutation({
    mutationFn: (promotion: Promotion) => promotionsApi.update(promotion.id, { is_active: !promotion.is_active }),
    onSuccess: (promotion) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      showToast(promotion.is_active ? 'Đã bật chương trình khuyến mại' : 'Đã tắt chương trình khuyến mại');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: promotionsApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      showToast('Đã xóa chương trình khuyến mại');
      setDeleteTarget(null);
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const promotions = query.data ?? [];
  const visible = promotions.filter((promotion) =>
    `${promotion.name} ${promotion.title}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const totals = promotions.reduce((sum, promotion) => ({
    impressions: sum.impressions + promotion.impression_count,
    opens: sum.opens + promotion.open_count,
    clicks: sum.clicks + promotion.cta_count,
  }), { impressions: 0, opens: 0, clicks: 0 });
  const columns: TableColumn<Promotion>[] = [
    { key: 'name', header: 'Chương trình', sortAccessor: (promotion) => promotion.name,
      render: (promotion) => <div className={styles.programName}>
        <strong>{promotion.name}</strong><span>{promotion.title}</span>
      </div> },
    { key: 'status', header: 'Trạng thái', render: (promotion) => {
      const status = promotionStatus(promotion);
      return <div className={styles.statusCell}>
        <Badge tone={status.tone}>{status.label}</Badge>
        <button type="button" className={styles.toggle} disabled={toggle.isPending}
          aria-label={`${promotion.is_active ? 'Tắt' : 'Bật'} ${promotion.name}`}
          aria-pressed={promotion.is_active} onClick={() => toggle.mutate(promotion)}>
          <Power size={14} aria-hidden />{promotion.is_active ? 'Tắt' : 'Bật'}
        </button>
      </div>;
    } },
    { key: 'schedule', header: 'Hiệu lực (giờ Việt Nam)', render: (promotion) => <div className={styles.schedule}>
      <span>Từ: {formatPromotionDate(promotion.start_at)}</span>
      <span>Đến: {formatPromotionDate(promotion.end_at)}</span>
    </div> },
    { key: 'target', header: 'Phạm vi', render: (promotion) => <div className={styles.schedule}>
      <span>{!promotion.target_pages.length ? 'Toàn bộ website' : promotion.target_pages.length === 1 && promotion.target_pages[0] === '/' ? 'Chỉ trang chủ' : `${promotion.target_pages.length} trang`}</span>
      <span>{promotion.device === 'all' ? 'Mọi thiết bị' : promotion.device === 'mobile' ? 'Điện thoại' : 'Máy tính'}</span>
    </div> },
    { key: 'impressions', header: 'Hiển thị', sortAccessor: (promotion) => promotion.impression_count,
      render: (promotion) => promotion.impression_count.toLocaleString('vi-VN') },
    { key: 'opens', header: 'Mở quà', sortAccessor: (promotion) => promotion.open_count,
      render: (promotion) => promotion.open_count.toLocaleString('vi-VN') },
    { key: 'clicks', header: 'Bấm nút', sortAccessor: (promotion) => promotion.cta_count,
      render: (promotion) => promotion.cta_count.toLocaleString('vi-VN') },
    { key: 'actions', header: 'Thao tác', render: (promotion) => <div className={shared.iconActions}>
      <button type="button" className={shared.iconButton} title="Xem trước"
        aria-label={`Xem trước ${promotion.name}`} onClick={() => setPreview(promotion)}><Eye size={17} aria-hidden /></button>
      <button type="button" className={shared.iconButton} title="Sửa"
        aria-label={`Sửa ${promotion.name}`} onClick={() => setEditor({ promotion })}><Pencil size={17} aria-hidden /></button>
      <button type="button" className={shared.iconButton} title="Xóa"
        aria-label={`Xóa ${promotion.name}`} onClick={() => setDeleteTarget(promotion)}><Trash2 size={17} aria-hidden /></button>
    </div> },
  ];

  if (user?.role !== 'admin') return null;

  return <div className={shared.page}>
    <div className={shared.header}>
      <div><h1 className={shared.title}><Gift size={25} aria-hidden /> Hộp quà khuyến mại</h1>
        <p className={styles.intro}>Cấu hình hộp quà, ưu đãi và thời điểm hiển thị cho khách truy cập.</p></div>
      <Button onClick={() => setEditor({})}><Plus size={17} aria-hidden /> Thêm chương trình</Button>
    </div>
    <div className={styles.stats} aria-label="Thống kê khuyến mại">
      <div><span>Lượt hiển thị</span><strong>{totals.impressions.toLocaleString('vi-VN')}</strong></div>
      <div><span>Lượt mở quà</span><strong>{totals.opens.toLocaleString('vi-VN')}</strong></div>
      <div><span>Lượt bấm nút</span><strong>{totals.clicks.toLocaleString('vi-VN')}</strong></div>
    </div>
    <div className={shared.toolbar}>
      <TextField label="Tìm chương trình" placeholder="Tên hoặc tiêu đề…" value={search}
        onChange={(event) => setSearch(event.target.value)} />
      <p className={styles.help}>Xem trước luôn hiển thị ngay và không ghi nhận thống kê.</p>
    </div>
    {query.isError ? <div className={styles.error} role="alert">
      <p>{query.error.message}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Tải lại</Button>
    </div> : <Table columns={columns} data={visible} rowKey={(promotion) => promotion.id}
      isLoading={query.isLoading} emptyMessage={search ? 'Không có chương trình phù hợp' : 'Chưa có chương trình khuyến mại'} />}
    <p className={styles.help}>Nếu nhiều chương trình cùng đủ điều kiện, website ưu tiên chương trình được tạo gần nhất. Khách có thể đóng hộp quà bất kỳ lúc nào.</p>
    {editor && <PromotionEditor promotion={editor.promotion} onClose={() => setEditor(null)} />}
    {preview && <PromotionExperience promotion={preview} preview onDismiss={() => setPreview(null)} />}
    <Modal isOpen={Boolean(deleteTarget)} title="Xóa chương trình khuyến mại"
      onClose={() => { if (!remove.isPending) setDeleteTarget(null); }} maxWidth="sm">
      <p className={shared.confirm}>Xóa chương trình <strong>{deleteTarget?.name}</strong> và thống kê của chương trình?</p>
      <div className={shared.confirmActions}>
        <Button type="button" variant="outline" disabled={remove.isPending} onClick={() => setDeleteTarget(null)}>Hủy</Button>
        <Button type="button" variant="danger" isLoading={remove.isPending}
          onClick={() => { if (deleteTarget) remove.mutate(deleteTarget.id); }}>Xóa chương trình</Button>
      </div>
    </Modal>
  </div>;
}
