'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { solutionsApi } from '@/lib/api/solutions';
import { Solution } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin-shared.module.scss';

const labels: Record<Solution['category'], string> = { sme: 'Doanh nghiệp (SME)', ubnd: 'UBND', ho_kinh_doanh: 'Hộ kinh doanh', cuc_nganh: 'Cục / Ngành', chuyen_doi_so: 'Chuyển đổi số' };

export default function AdminSolutionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Solution | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-solutions'], queryFn: solutionsApi.listAdmin });
  const remove = useMutation({
    mutationFn: solutionsApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-solutions'] }); showToast('Đã xóa giải pháp'); setDeleteTarget(null); },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const duplicate = useMutation({
    mutationFn: async (item: Solution) => {
      const source = await solutionsApi.getById(item.id);
      return solutionsApi.create({
        ...source, name: `${source.name} (bản sao)`, slug: `${source.slug}-copy-${Date.now()}`, status: 'inactive',
        features: source.features?.map(({ icon, title, description, sort_order }) => ({ icon, title, description, sort_order })),
        pricing: source.pricing?.map(({ package_code, package_name, price, cycle_months, condition_note, status, sort_order }) => ({ package_code, package_name, price, cycle_months, condition_note, status, sort_order })),
        faqs: source.faqs?.map(({ question, answer, sort_order }) => ({ question, answer, sort_order })),
        gallery: source.gallery?.map(({ image_url, caption, sort_order }) => ({ image_url, caption, sort_order })),
        steps: source.steps?.map(({ title, description, icon, sort_order }) => ({ title, description, icon, sort_order })),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-solutions'] }); showToast('Đã nhân bản giải pháp'); },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const columns: TableColumn<Solution>[] = [
    { key: 'name', header: 'Tên giải pháp', render: item => item.name, sortAccessor: item => item.name },
    { key: 'category', header: 'Nhóm', render: item => labels[item.category] },
    { key: 'status', header: 'Trạng thái', render: item => <Badge tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? 'Đang áp dụng' : 'Ngừng áp dụng'}</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: item => <div className={styles.iconActions}>
      <button type="button" className={styles.iconButton} aria-label="Sửa giải pháp" onClick={() => router.push(`/admin/solutions/${item.id}/edit`)}><Pencil className={styles.icon} /></button>
      <button type="button" className={styles.iconButton} aria-label="Nhân bản giải pháp" onClick={() => duplicate.mutate(item)}><Copy className={styles.icon} /></button>
      <button type="button" className={styles.iconButton} aria-label="Xóa giải pháp" onClick={() => setDeleteTarget(item)}><Trash2 className={styles.icon} /></button>
    </div> },
  ];
  return <div className={styles.page}>
    <div className={styles.header}><div><h1 className={styles.title}>Quản lý Giải pháp số</h1><p className={styles.muted}>Quản lý nội dung và các tính năng của từng giải pháp.</p></div><Button onClick={() => router.push('/admin/solutions/new')}><Plus className={styles.icon} /> Thêm giải pháp</Button></div>
    <Table columns={columns} data={data ?? []} rowKey={item => item.id} isLoading={isLoading} />
    <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa"><p className={styles.confirm}>Bạn có chắc muốn xóa giải pháp <strong>{deleteTarget?.name}</strong>?</p><div className={styles.confirmActions}><Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button><Button variant="danger" isLoading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>Xóa</Button></div></Modal>
  </div>;
}
