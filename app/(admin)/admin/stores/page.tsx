'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { storesApi, StoreFormValues } from '@/lib/api/stores';
import { Store } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';

const storeSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên cửa hàng').max(150),
  address: z.string().min(1, 'Vui lòng nhập địa chỉ').max(255),
  district: z.string().min(1, 'Vui lòng nhập huyện/thành phố').max(100),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ').max(20),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  opening_hours: z.string().max(100).optional().or(z.literal('')),
});

type StoreSchemaValues = z.infer<typeof storeSchema>;

export default function AdminStoresPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: Store } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const { data: stores, isLoading } = useQuery({ queryKey: ['admin-stores'], queryFn: () => storesApi.listAdmin() });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StoreSchemaValues>({
    resolver: zodResolver(storeSchema),
  });

  function openCreate() {
    reset({ name: '', address: '', district: '', phone: '', lat: 21.3256, lng: 103.9188, opening_hours: '' });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: Store) {
    reset({
      name: item.name, address: item.address, district: item.district, phone: item.phone,
      lat: item.lat, lng: item.lng, opening_hours: item.opening_hours ?? '',
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: StoreFormValues) =>
      modalState?.mode === 'edit' && modalState.item ? storesApi.update(modalState.item.id, values) : storesApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      showToast('Đã lưu cửa hàng thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      showToast('Đã xóa cửa hàng');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: StoreSchemaValues) {
    saveMutation.mutate({ ...values, opening_hours: values.opening_hours || null });
  }

  const columns: TableColumn<Store>[] = [
    { key: 'name', header: 'Tên cửa hàng', render: (s) => s.name, sortAccessor: (s) => s.name },
    { key: 'district', header: 'Huyện/Thành phố', render: (s) => s.district, sortAccessor: (s) => s.district },
    { key: 'address', header: 'Địa chỉ', render: (s) => s.address },
    { key: 'phone', header: 'Hotline', render: (s) => s.phone },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => openEdit(s)} aria-label="Sửa" className="relative rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary before:absolute before:-inset-1 before:content-['']">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(s)} aria-label="Xóa" className="relative rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-danger before:absolute before:-inset-1 before:content-['']">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-neutral-900">Quản lý Cửa hàng</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Thêm cửa hàng</Button>
      </div>

      <Table columns={columns} data={stores ?? []} rowKey={(s) => s.id} isLoading={isLoading} />

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField label="Tên cửa hàng" error={errors.name?.message} {...register('name')} />
          <TextField label="Địa chỉ" error={errors.address?.message} {...register('address')} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Huyện/Thành phố" error={errors.district?.message} {...register('district')} />
            <TextField label="Hotline" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField type="number" step="0.000001" label="Vĩ độ (lat)" error={errors.lat?.message} {...register('lat')} />
            <TextField type="number" step="0.000001" label="Kinh độ (lng)" error={errors.lng?.message} {...register('lng')} />
          </div>
          <TextField label="Giờ mở cửa" placeholder="07:30 - 21:00" error={errors.opening_hours?.message} {...register('opening_hours')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalState(null)}>Hủy</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>Lưu</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa">
        <p className="text-neutral-900">Bạn có chắc muốn xóa cửa hàng <strong>{deleteTarget?.name}</strong>?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Xóa</Button>
        </div>
      </Modal>
    </div>
  );
}
