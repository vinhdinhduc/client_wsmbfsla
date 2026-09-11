'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { packagesApi, PackageFormValues } from '@/lib/api/packages';
import { Package } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField, SelectField, TextareaField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/format';
import styles from '../admin-shared.module.scss';

const GROUP_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'tra_truoc', label: 'Trả trước' },
  { value: 'tra_sau', label: 'Trả sau' },
  { value: 'wifi_5g', label: 'Wifi 5G' },
];
const DURATION_UNIT_OPTIONS = [
  { value: 'ngay', label: 'Ngày' },
  { value: 'thang', label: 'Tháng' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang bán' },
  { value: 'inactive', label: 'Ngừng bán' },
];

const packageSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã gói').max(20),
  name: z.string().min(1, 'Vui lòng nhập tên gói').max(100),
  slug: z.string().min(1, 'Vui lòng nhập slug').max(255),
  group_type: z.enum(['hot', 'tra_truoc', 'tra_sau', 'wifi_5g']),
  headline_desc: z.string().max(100).optional().or(z.literal('')),
  price: z.coerce.number().nonnegative('Giá không được âm'),
  duration_value: z.coerce.number().int().positive('Chu kỳ phải lớn hơn 0'),
  duration_unit: z.enum(['ngay', 'thang']),
  data_desc: z.string().max(255).optional().or(z.literal('')),
  call_desc: z.string().max(255).optional().or(z.literal('')),
  sms_desc: z.string().max(255).optional().or(z.literal('')),
  speed_desc: z.string().max(100).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  display_order: z.coerce.number().int(),
});

type PackageSchemaValues = z.infer<typeof packageSchema>;

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: Package } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => packagesApi.listAdmin(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PackageSchemaValues>({ resolver: zodResolver(packageSchema) });

  function openCreate() {
    reset({
      code: '',
      name: '',
      slug: '',
      group_type: 'hot',
      headline_desc: '',
      price: 0,
      duration_value: 30,
      duration_unit: 'ngay',
      data_desc: '',
      call_desc: '',
      sms_desc: '',
      speed_desc: '',
      description: '',
      status: 'active',
      display_order: 0,
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: Package) {
    reset({
      code: item.code,
      name: item.name,
      slug: item.slug,
      group_type: item.group_type,
      headline_desc: item.headline_desc ?? '',
      price: item.price,
      duration_value: item.duration_value,
      duration_unit: item.duration_unit,
      data_desc: item.data_desc ?? '',
      call_desc: item.call_desc ?? '',
      sms_desc: item.sms_desc ?? '',
      speed_desc: item.speed_desc ?? '',
      description: item.description ?? '',
      status: item.status,
      display_order: item.display_order,
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      modalState?.mode === 'edit' && modalState.item
        ? packagesApi.update(modalState.item.id, values)
        : packagesApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      showToast('Đã lưu gói cước thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => packagesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      showToast('Đã xóa gói cước');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: PackageSchemaValues) {
    saveMutation.mutate({
      ...values,
      headline_desc: values.headline_desc || null,
      data_desc: values.data_desc || null,
      call_desc: values.call_desc || null,
      sms_desc: values.sms_desc || null,
      speed_desc: values.speed_desc || null,
      description: values.description || null,
    });
  }

  const columns: TableColumn<Package>[] = [
    { key: 'name', header: 'Tên gói', render: (p) => p.name, sortAccessor: (p) => p.name },
    {
      key: 'group_type',
      header: 'Nhóm',
      render: (p) => GROUP_OPTIONS.find((g) => g.value === p.group_type)?.label,
    },
    {
      key: 'price',
      header: 'Giá',
      render: (p) => formatPrice(p.price),
      sortAccessor: (p) => p.price,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (p) => (
        <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>
          {STATUS_OPTIONS.find((s) => s.value === p.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className={styles.iconActions}>
          <button
            type="button"
            onClick={() => openEdit(p)}
            aria-label="Sửa"
            className={styles.iconButton}
          >
            <Pencil className={styles.icon} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(p)}
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
        <h1 className={styles.title}>Quản lý Gói cước</h1>
        <Button onClick={openCreate}>
          <Plus className={styles.icon} /> Thêm gói cước
        </Button>
      </div>

      <Table columns={columns} data={packages ?? []} rowKey={(p) => p.id} isLoading={isLoading} />

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Sửa gói cước' : 'Thêm gói cước'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.grid2}>
            <TextField label="Mã gói" error={errors.code?.message} {...register('code')} />
            <TextField label="Tên gói" error={errors.name?.message} {...register('name')} />
          </div>
          <TextField label="Slug" error={errors.slug?.message} {...register('slug')} />
          <div className={styles.grid2}>
            <SelectField
              label="Nhóm"
              options={GROUP_OPTIONS}
              error={errors.group_type?.message}
              {...register('group_type')}
            />
            <SelectField
              label="Trạng thái"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              {...register('status')}
            />
          </div>
          <TextField
            label="Mô tả ngắn (headline)"
            error={errors.headline_desc?.message}
            {...register('headline_desc')}
          />
          <div className={styles.grid3}>
            <TextField
              type="number"
              step="1000"
              label="Giá (đ)"
              error={errors.price?.message}
              {...register('price')}
            />
            <TextField
              type="number"
              label="Chu kỳ"
              error={errors.duration_value?.message}
              {...register('duration_value')}
            />
            <SelectField
              label="Đơn vị chu kỳ"
              options={DURATION_UNIT_OPTIONS}
              error={errors.duration_unit?.message}
              {...register('duration_unit')}
            />
          </div>
          <div className={styles.grid2}>
            <TextField label="Data" error={errors.data_desc?.message} {...register('data_desc')} />
            <TextField
              label="Gọi thoại"
              error={errors.call_desc?.message}
              {...register('call_desc')}
            />
            <TextField label="SMS" error={errors.sms_desc?.message} {...register('sms_desc')} />
            <TextField
              label="Tốc độ"
              error={errors.speed_desc?.message}
              {...register('speed_desc')}
            />
          </div>
          <TextareaField
            label="Mô tả chi tiết"
            error={errors.description?.message}
            {...register('description')}
          />
          <TextField
            type="number"
            label="Thứ tự hiển thị"
            error={errors.display_order?.message}
            {...register('display_order')}
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
          Bạn có chắc muốn xóa gói cước <strong>{deleteTarget?.name}</strong>?
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
