'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { newsApi, NewsFormValues } from '@/lib/api/news';
import { News } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField, SelectField } from '@/components/ui/FormField';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import styles from '../admin-shared.module.scss';

const CATEGORY_OPTIONS = [
  { value: 'khuyen_mai', label: 'Khuyến mãi' },
  { value: 'su_kien', label: 'Sự kiện' },
  { value: 'thong_bao', label: 'Thông báo' },
];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Bản nháp' },
  { value: 'published', label: 'Đã đăng' },
];
const STATUS_TONE: Record<string, 'success' | 'warning'> = {
  published: 'success',
  draft: 'warning',
};

const newsSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề').max(255),
  slug: z.string().min(1, 'Vui lòng nhập slug').max(255),
  category: z.enum(['khuyen_mai', 'su_kien', 'thong_bao']),
  thumbnail: z.string().max(255).optional().or(z.literal('')),
  summary: z.string().optional().or(z.literal('')),
  content: z.string().min(1, 'Vui lòng nhập nội dung'),
  status: z.enum(['draft', 'published']),
});

type NewsSchemaValues = z.infer<typeof newsSchema>;

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: News } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<News | null>(null);

  const { data: news, isLoading } = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => newsApi.listAdmin(),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NewsSchemaValues>({ resolver: zodResolver(newsSchema) });

  const content = watch('content');

  function openCreate() {
    reset({
      title: '',
      slug: '',
      category: 'thong_bao',
      thumbnail: '',
      summary: '',
      content: '',
      status: 'draft',
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: News) {
    reset({
      title: item.title,
      slug: item.slug,
      category: item.category,
      thumbnail: item.thumbnail ?? '',
      summary: item.summary ?? '',
      content: item.content,
      status: item.status,
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: NewsFormValues) =>
      modalState?.mode === 'edit' && modalState.item
        ? newsApi.update(modalState.item.id, values)
        : newsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      showToast('Đã lưu tin tức thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => newsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      showToast('Đã xóa tin tức');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: NewsSchemaValues) {
    saveMutation.mutate({
      ...values,
      thumbnail: values.thumbnail || null,
      summary: values.summary || null,
    });
  }

  const columns: TableColumn<News>[] = [
    { key: 'title', header: 'Tiêu đề', render: (n) => n.title, sortAccessor: (n) => n.title },
    {
      key: 'category',
      header: 'Danh mục',
      render: (n) => CATEGORY_OPTIONS.find((c) => c.value === n.category)?.label ?? n.category,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (n) => (
        <Badge tone={STATUS_TONE[n.status]}>
          {STATUS_OPTIONS.find((s) => s.value === n.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'published_at',
      header: 'Ngày đăng',
      render: (n) => formatDate(n.published_at),
      sortAccessor: (n) => n.published_at ?? '',
    },
    {
      key: 'actions',
      header: '',
      render: (n) => (
        <div className={styles.iconActions}>
          <button
            type="button"
            onClick={() => openEdit(n)}
            aria-label="Sửa"
            className={styles.iconButton}
          >
            <Pencil className={styles.icon} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(n)}
            aria-label="Xóa"
            className={styles.iconButton}
          >
            <Trash2 className={styles.icon} />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Tin tức</h1>
        <Button onClick={openCreate}>
          <Plus className={styles.icon} /> Thêm tin tức
        </Button>
      </div>

      <Table columns={columns} data={news ?? []} rowKey={(n) => n.id} isLoading={isLoading} />

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Sửa tin tức' : 'Thêm tin tức'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <TextField
            label="Tiêu đề"
            error={errors.title?.message}
            {...register('title', {
              onChange: (e) => {
                if (modalState?.mode !== 'edit') setValue('slug', slugify(e.target.value));
              },
            })}
          />
          <TextField label="Slug" error={errors.slug?.message} {...register('slug')} />
          <div className={styles.grid2}>
            <SelectField
              label="Danh mục"
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
          <RichTextEditor
            label="Nội dung"
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
          Bạn có chắc muốn xóa tin tức <strong>{deleteTarget?.title}</strong>? Hành động này không
          thể hoàn tác.
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
