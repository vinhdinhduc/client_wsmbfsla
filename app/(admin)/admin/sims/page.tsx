'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { simsApi, SimFormValues, SimImportResult } from '@/lib/api/sims';
import { SimNumber } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField, SelectField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/format';

const CATALOG_OPTIONS = [
  { value: 'so_dep', label: 'Số đẹp' },
  { value: 'phong_thuy', label: 'Phong thủy' },
  { value: 'nam_sinh', label: 'Năm sinh' },
  { value: 'tra_truoc', label: 'Trả trước' },
  { value: 'sim_data', label: 'Sim Data' },
  { value: 'esim', label: 'eSim' },
];
const SIM_TYPE_OPTIONS = [
  { value: 'tam_hoa', label: 'Tam hoa' },
  { value: 'tu_quy', label: 'Tứ quý' },
  { value: 'phat_loc', label: 'Phát lộc' },
  { value: 'than_tai', label: 'Thần tài' },
  { value: 'thuong', label: 'Thường' },
];
const STATUS_OPTIONS = [
  { value: 'available', label: 'Còn hàng' },
  { value: 'reserved', label: 'Đang giữ' },
  { value: 'sold', label: 'Đã bán' },
];
const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  available: 'success',
  reserved: 'warning',
  sold: 'danger',
};

const simSchema = z.object({
  phone_number: z.string().min(9, 'Số điện thoại không hợp lệ').max(15),
  prefix: z.string().min(2, 'Vui lòng nhập đầu số').max(5),
  catalog: z.enum(['so_dep', 'phong_thuy', 'nam_sinh', 'tra_truoc', 'sim_data', 'esim']),
  sim_type: z.enum(['tam_hoa', 'tu_quy', 'phat_loc', 'than_tai', 'thuong']),
  price: z.coerce.number().nonnegative('Giá không được âm'),
  bundle_note: z.string().max(255).optional().or(z.literal('')),
  commitment_months: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['available', 'reserved', 'sold']),
});

type SimSchemaValues = z.infer<typeof simSchema>;

export default function AdminSimsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: SimNumber } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SimNumber | null>(null);
  const [importResult, setImportResult] = useState<SimImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sims, isLoading } = useQuery({ queryKey: ['admin-sims'], queryFn: () => simsApi.listAdmin() });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SimSchemaValues>({ resolver: zodResolver(simSchema) });

  function openCreate() {
    reset({ phone_number: '', prefix: '', catalog: 'so_dep', sim_type: 'thuong', price: 0, bundle_note: '', commitment_months: 0, status: 'available' });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: SimNumber) {
    reset({
      phone_number: item.phone_number, prefix: item.prefix, catalog: item.catalog, sim_type: item.sim_type,
      price: item.price, bundle_note: item.bundle_note ?? '', commitment_months: item.commitment_months ?? 0,
      status: item.status,
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: SimFormValues) =>
      modalState?.mode === 'edit' && modalState.item ? simsApi.update(modalState.item.id, values) : simsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sims'] });
      showToast('Đã lưu số sim thành công');
      setModalState(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => simsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sims'] });
      showToast('Đã xóa số sim');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => simsApi.importExcel(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sims'] });
      setImportResult(result);
      showToast(`Đã nhập ${result.inserted} số sim thành công`);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: SimSchemaValues) {
    saveMutation.mutate({ ...values, bundle_note: values.bundle_note || null, commitment_months: values.commitment_months ?? null });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const columns: TableColumn<SimNumber>[] = [
    { key: 'phone_number', header: 'Số điện thoại', render: (s) => <span className="font-semibold">{s.phone_number}</span>, sortAccessor: (s) => s.phone_number },
    { key: 'sim_type', header: 'Loại sim', render: (s) => SIM_TYPE_OPTIONS.find((t) => t.value === s.sim_type)?.label },
    { key: 'price', header: 'Giá', render: (s) => formatPrice(s.price), sortAccessor: (s) => s.price },
    { key: 'status', header: 'Trạng thái', render: (s) => <Badge tone={STATUS_TONE[s.status]}>{STATUS_OPTIONS.find((o) => o.value === s.status)?.label}</Badge> },
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold text-neutral-900">Quản lý Kho sim số</h1>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" isLoading={importMutation.isPending} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import Excel
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Thêm số sim</Button>
        </div>
      </div>

      <Table columns={columns} data={sims ?? []} rowKey={(s) => s.id} isLoading={isLoading} />

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)} title={modalState?.mode === 'edit' ? 'Sửa số sim' : 'Thêm số sim'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField label="Số điện thoại" error={errors.phone_number?.message} {...register('phone_number')} />
          <TextField label="Đầu số" placeholder="090, 093..." error={errors.prefix?.message} {...register('prefix')} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Danh mục" options={CATALOG_OPTIONS} error={errors.catalog?.message} {...register('catalog')} />
            <SelectField label="Loại sim" options={SIM_TYPE_OPTIONS} error={errors.sim_type?.message} {...register('sim_type')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField type="number" label="Giá (đ)" error={errors.price?.message} {...register('price')} />
            <TextField type="number" label="Cam kết (tháng)" error={errors.commitment_months?.message} {...register('commitment_months')} />
          </div>
          <TextField label="Ghi chú gói cước kèm theo" error={errors.bundle_note?.message} {...register('bundle_note')} />
          <SelectField label="Trạng thái" options={STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalState(null)}>Hủy</Button>
            <Button type="submit" isLoading={saveMutation.isPending}>Lưu</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Xác nhận xóa">
        <p className="text-neutral-900">Bạn có chắc muốn xóa số <strong>{deleteTarget?.phone_number}</strong>?</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Xóa</Button>
        </div>
      </Modal>

      <Modal isOpen={importResult !== null} onClose={() => setImportResult(null)} title="Kết quả Import Excel">
        {importResult && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-900">
              Đã nhập thành công <strong>{importResult.inserted}</strong> số, bỏ qua <strong>{importResult.skipped}</strong> dòng.
            </p>
            {importResult.errors.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border border-danger/30 bg-danger/5 p-3">
                <p className="mb-2 text-sm font-semibold text-danger">Các dòng lỗi:</p>
                <ul className="space-y-1 text-sm text-neutral-900">
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>
                      Dòng {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setImportResult(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
