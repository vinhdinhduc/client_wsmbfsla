'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { solutionsApi, SolutionFormValues } from '@/lib/api/solutions';
import { Solution } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormField';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin-shared.module.scss';

const CATEGORY_OPTIONS = [
  { value: 'sme', label: 'Doanh nghiệp (SME)' },
  { value: 'ubnd', label: 'UBND' },
  { value: 'ho_kinh_doanh', label: 'Hộ kinh doanh' },
  { value: 'cuc_nganh', label: 'Cục / Ngành' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang áp dụng' },
  { value: 'inactive', label: 'Ngừng áp dụng' },
];

const solutionSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên giải pháp').max(255),
  slug: z.string().min(1, 'Vui lòng nhập slug').max(255),
  category: z.enum(['sme', 'ubnd', 'ho_kinh_doanh', 'cuc_nganh']),
  thumbnail: z.string().max(255).optional().or(z.literal('')),
  summary: z.string().optional().or(z.literal('')),
  content: z.string().min(1, 'Vui lòng nhập nội dung'),
  is_hot: z.boolean(),
  status: z.enum(['active', 'inactive']),
});

type SolutionSchemaValues = z.infer<typeof solutionSchema>;

export default function AdminSolutionsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: Solution } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Solution | null>(null);

  const { data: solutions, isLoading } = useQuery({
    queryKey: ['admin-solutions'],
    queryFn: () => solutionsApi.listAdmin(),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SolutionSchemaValues>({
    resolver: zodResolver(solutionSchema),
  });
  const content = watch('content');

  function openCreate() {
    reset({
      name: '',
      slug: '',
      category: 'sme',
      thumbnail: '',
      summary: '',
      content: '',
      is_hot: false,
      status: 'active',
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: Solution) {
    reset({
      name: item.name,
      slug: item.slug,
      category: item.category,
      thumbnail: item.thumbnail ?? '',
      summary: item.summary ?? '',
      content: item.content,
      is_hot: item.is_hot,
      status: item.status,
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: SolutionFormValues) =>
      modalState?.mode === 'edit' && modalState.item
        ? solutionsApi.update(modalState.item.id, values)
        : solutionsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
      showToast('Đã lưu giải pháp thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => solutionsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
      showToast('Đã xóa giải pháp');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: SolutionSchemaValues) {
    saveMutation.mutate({
      ...values,
      thumbnail: values.thumbnail || null,
      summary: values.summary || null,
    });
  }

  const columns: TableColumn<Solution>[] = [
    { key: 'name', header: 'Tên giải pháp', render: (s) => s.name, sortAccessor: (s) => s.name },
    {
      key: 'category',
      header: 'Nhóm',
      render: (s) => CATEGORY_OPTIONS.find((c) => c.value === s.category)?.label,
    },
    {
      key: 'is_hot',
      header: 'Hot',
      render: (s) => (s.is_hot ? <Badge tone="accent">HOT</Badge> : null),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <Badge tone={s.status === 'active' ? 'success' : 'neutral'}>
          {STATUS_OPTIONS.find((o) => o.value === s.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className={styles.iconActions}>
          <button
            type="button"
            onClick={() => openEdit(s)}
            aria-label="Sửa"
            className={styles.iconButton}
          >
            <Pencil className={styles.icon} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(s)}
            aria-label="Xóa"
            className={styles.iconButton}
          >
            <Trash2 className={styles.icon} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Giải pháp số</h1>
        <Button onClick={openCreate}>
          <Plus className={styles.icon} /> Thêm giải pháp
        </Button>
      </div>

      <Table columns={columns} data={solutions ?? []} rowKey={(s) => s.id} isLoading={isLoading} />

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Sửa giải pháp' : 'Thêm giải pháp'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <TextField label="Tên giải pháp" error={errors.name?.message} {...register('name')} />
          <TextField label="Slug" error={errors.slug?.message} {...register('slug')} />
          <div className={styles.grid2}>
            <SelectField
              label="Nhóm"
              options={CATEGORY_OPTIONS}
              error={errors.category?.message}
              {...register('category')}
            />
            <SelectField
              label="Trạng thái"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>
          <TextField
            label="Ảnh đại diện (URL)"
            placeholder="https://..."
            error={errors.thumbnail?.message}
            {...register('thumbnail')}
          />
          <TextField label="Tóm tắt" error={errors.summary?.message} {...register('summary')} />
          <CheckboxField label="Đánh dấu là giải pháp nổi bật (HOT)" {...register('is_hot')} />
          <RichTextEditor
            label="Nội dung chi tiết"
            value={content ?? ''}
            onChange={(html) => setValue('content', html, { shouldValidate: true })}
            error={errors.content?.message}
          />
          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => setModalState(null)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
      >
        <p className={styles.confirm}>
          Bạn có chắc muốn xóa giải pháp <strong>{deleteTarget?.name}</strong>?
        </p>
        <div className={styles.confirmActions}>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
