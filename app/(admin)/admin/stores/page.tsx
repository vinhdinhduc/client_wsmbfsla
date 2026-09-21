'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { storesApi, StoreFormValues } from '@/lib/api/stores';
import { Store } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin-shared.module.scss';

const MapPicker = dynamic(() => import('@/components/shared/MapPicker').then((module) => module.MapPicker), { ssr: false, loading: () => <p>Đang tải bản đồ…</p> });

const storeSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên cửa hàng').max(150),
  street_address: z.string().min(1, 'Vui lòng nhập số nhà, đường, tổ/bản').max(255),
  ward_code: z.string().regex(/^\d{5}$/, 'Vui lòng chọn xã/phường'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ').max(20),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  lat: z.coerce.number().min(8).max(24),
  lng: z.coerce.number().min(102).max(110),
  opening_hours_json: z.array(z.object({
    days: z.array(z.number().int().min(1).max(7)).min(1),
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ'),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ không hợp lệ'),
  }).refine((slot) => slot.close > slot.open, { message: 'Giờ đóng phải sau giờ mở', path: ['close'] })).min(1),
  status: z.enum(['active', 'inactive']),
  geocode_source: z.enum(['map', 'address', 'manual']).optional(),
});

type StoreSchemaValues = z.infer<typeof storeSchema>;

export default function AdminStoresPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: Store } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);
  const [wardSearch, setWardSearch] = useState('');
  const [listWard, setListWard] = useState('');

  const { data: stores, isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => storesApi.listAdmin(),
  });
  const { data: wards = [] } = useQuery({ queryKey: ['son-la-wards'], queryFn: storesApi.listWards });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    control,
    formState: { errors },
  } = useForm<StoreSchemaValues>({
    resolver: zodResolver(storeSchema),
  });
  const mapLat = watch('lat') ?? 21.3256;
  const mapLng = watch('lng') ?? 103.9188;
  const { fields: hourFields, append: appendHour, remove: removeHour } = useFieldArray({ control, name: 'opening_hours_json' });

  function openCreate() {
    setWardSearch('');
    reset({
      name: '',
      street_address: '',
      ward_code: '',
      phone: '',
      email: '',
      lat: 21.3256,
      lng: 103.9188,
      opening_hours_json: [{ days: [1, 2, 3, 4, 5, 6], open: '07:30', close: '17:30' }],
      status: 'active',
      geocode_source: 'manual',
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: Store) {
    setWardSearch('');
    reset({
      name: item.name,
      street_address: item.street_address ?? item.address,
      ward_code: item.ward_code ?? '',
      phone: item.phone,
      email: item.email ?? '',
      lat: item.lat,
      lng: item.lng,
      opening_hours_json: item.opening_hours_json?.length ? item.opening_hours_json : [{ days: [1, 2, 3, 4, 5, 6], open: '07:30', close: '17:30' }],
      status: item.status ?? 'active',
      geocode_source: 'manual',
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: StoreFormValues) =>
      modalState?.mode === 'edit' && modalState.item
        ? storesApi.update(modalState.item.id, values)
        : storesApi.create(values),
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
      showToast('Đã ngừng hoạt động cửa hàng');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
  const geocodeMutation = useMutation({
    mutationFn: () => {
      const ward = wards.find((item) => item.code === getValues('ward_code'));
      if (!ward || !getValues('street_address')) throw new Error('Vui lòng nhập địa chỉ và chọn xã/phường trước');
      return storesApi.geocode(`${getValues('street_address')}, ${ward.name_with_type}`);
    },
    onSuccess: (result) => {
      if (!result) { showToast('Không tìm thấy vị trí; bạn có thể chọn trên bản đồ', 'error'); return; }
      setValue('lat', result.lat, { shouldDirty: true, shouldValidate: true });
      setValue('lng', result.lng, { shouldDirty: true, shouldValidate: true });
      setValue('geocode_source', 'address');
      showToast('Đã tìm vị trí; hãy kiểm tra và chỉnh lại điểm đánh dấu nếu cần');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  function onSubmit(values: StoreSchemaValues) {
    saveMutation.mutate({ ...values, email: values.email || null });
  }

  const columns: TableColumn<Store>[] = [
    { key: 'name', header: 'Tên cửa hàng', render: (s) => s.name, sortAccessor: (s) => s.name },
    {
      key: 'ward',
      header: 'Xã/Phường',
      render: (s) => s.ward_code ? (wards.find((ward) => ward.code === s.ward_code)?.name_with_type ?? 'Cần rà soát') : 'Cần rà soát',
    },
    { key: 'address', header: 'Địa chỉ', render: (s) => s.full_address ?? s.address },
    { key: 'phone', header: 'Hotline', render: (s) => s.phone },
    { key: 'hours', header: 'Giờ mở', render: (s) => s.opening_hours ?? 'Chưa cập nhật' },
    { key: 'staff', header: 'Giao dịch viên', render: (s) => `${s.staff_count ?? 0} người` },
    { key: 'status', header: 'Trạng thái', render: (s) => s.status === 'inactive' ? 'Tạm đóng' : 'Hoạt động' },
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
        <h1 className={styles.title}>Quản lý Cửa hàng</h1>
        <Button onClick={openCreate}>
          <Plus className={styles.icon} /> Thêm cửa hàng
        </Button>
      </div>

      <SelectField label="Lọc theo xã/phường" value={listWard} onChange={(event) => setListWard(event.target.value)} options={[{ value: '', label: 'Tất cả xã/phường' }, ...wards.filter((ward) => stores?.some((store) => store.ward_code === ward.code)).map((ward) => ({ value: ward.code, label: ward.name_with_type }))]} />
      <Table columns={columns} data={(stores ?? []).filter((store) => !listWard || store.ward_code === listWard)} rowKey={(s) => s.id} isLoading={isLoading} />

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <TextField label="Tên cửa hàng" error={errors.name?.message} {...register('name')} />
          <TextField label="Số nhà, đường, tổ/bản *" error={errors.street_address?.message} {...register('street_address')} />
          <TextField label="Tìm xã/phường" value={wardSearch} onChange={(event) => setWardSearch(event.target.value)} placeholder="Nhập tên xã hoặc phường" />
          <div className={styles.grid2}>
            <SelectField
              label="Xã/Phường *"
              options={[{ value: '', label: 'Chọn xã/phường' }, ...wards.filter((ward) => !wardSearch || ward.name_with_type.toLocaleLowerCase('vi-VN').includes(wardSearch.toLocaleLowerCase('vi-VN')) || ward.code === watch('ward_code')).map((ward) => ({ value: ward.code, label: ward.name_with_type }))]}
              error={errors.ward_code?.message}
              {...register('ward_code')}
            />
            <TextField label="Hotline" error={errors.phone?.message} {...register('phone')} />
          </div>
          <MapPicker position={{ lat: Number(mapLat), lng: Number(mapLng) }} onChange={(position) => {
            setValue('lat', Number(position.lat.toFixed(7)), { shouldValidate: true, shouldDirty: true });
            setValue('lng', Number(position.lng.toFixed(7)), { shouldValidate: true, shouldDirty: true });
            setValue('geocode_source', 'map');
          }} />
          <p>Chạm bản đồ hoặc kéo điểm đánh dấu để chọn vị trí chính xác.</p>
          <Button type="button" variant="outline" isLoading={geocodeMutation.isPending} onClick={() => geocodeMutation.mutate()}>Tìm vị trí từ địa chỉ</Button>
          <TextField label="Email cửa hàng" error={errors.email?.message} {...register('email')} />
          <div className={styles.grid2}>
            <TextField
              type="number"
              step="0.000001"
              label="Vĩ độ (lat)"
              error={errors.lat?.message}
              {...register('lat')}
            />
            <TextField
              type="number"
              step="0.000001"
              label="Kinh độ (lng)"
              error={errors.lng?.message}
              {...register('lng')}
            />
          </div>
          {hourFields.map((field, index) => <div key={field.id} className={styles.form}>
            <strong>Khung giờ {index + 1}</strong>
            <div className={styles.grid2}>
              <TextField label="Giờ mở" type="time" error={errors.opening_hours_json?.[index]?.open?.message} {...register(`opening_hours_json.${index}.open`)} />
              <TextField label="Giờ đóng" type="time" error={errors.opening_hours_json?.[index]?.close?.message} {...register(`opening_hours_json.${index}.close`)} />
            </div>
            <SelectField label="Chọn nhanh ngày" value="" options={[{ value: '', label: 'Chọn mẫu' }, { value: 'weekday', label: 'Thứ Hai – Thứ Bảy' }, { value: 'all', label: 'Cả tuần' }]} onChange={(event) => {
              if (event.target.value) setValue(`opening_hours_json.${index}.days`, event.target.value === 'all' ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6], { shouldValidate: true, shouldDirty: true });
            }} />
            <div role="group" aria-label={`Ngày mở cửa khung ${index + 1}`} className={styles.buttonGroup}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, dayIndex) => {
                const day = dayIndex + 1;
                const selected = watch(`opening_hours_json.${index}.days`) ?? [];
                return <label key={day}><input type="checkbox" checked={selected.includes(day)} onChange={(event) => setValue(`opening_hours_json.${index}.days`, event.target.checked ? [...selected, day].sort() : selected.filter((item) => item !== day), { shouldValidate: true, shouldDirty: true })} /> {label}</label>;
              })}
            </div>
            {hourFields.length > 1 && <Button type="button" variant="outline" onClick={() => removeHour(index)}>Bỏ khung giờ</Button>}
          </div>)}
          <Button type="button" variant="outline" onClick={() => appendHour({ days: [1, 2, 3, 4, 5, 6], open: '13:30', close: '17:30' })}>Thêm khung giờ</Button>
          <SelectField label="Trạng thái" options={[{ value: 'active', label: 'Hoạt động' }, { value: 'inactive', label: 'Tạm đóng' }]} {...register('status')} />
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
          Bạn có chắc muốn ngừng hoạt động cửa hàng <strong>{deleteTarget?.name}</strong>? Dữ liệu vẫn được giữ lại.
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
            Ngừng hoạt động
          </Button>
        </div>
      </Modal>
    </div>
  );
}
