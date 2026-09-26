'use client';
import { FilterBar } from '@/components/ui/FilterBar';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { simsApi, SimFormValues, SimImportResult, SimImportPreview } from '@/lib/api/sims';
import { SimNumber } from '@/types/product';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TextField, SelectField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/format';
import { settingsApi } from '@/lib/api/settings';
import { Pagination } from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import styles from '../admin-shared.module.scss';

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
  { value: 'hidden', label: 'Ẩn' },
];
const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  available: 'success',
  reserved: 'warning',
  sold: 'danger',
  hidden: 'warning',
};
const SUBSCRIPTION_OPTIONS = [
  { value: 'postpaid', label: 'Trả sau' },
  { value: 'prepaid', label: 'Trả trước' },
];
const EXPORT_COLUMNS = [
  { value: 'phone', label: 'Số thuê bao' },
  { value: 'subscription', label: 'Hình thức' },
  { value: 'catalog', label: 'Nhóm' },
  { value: 'pattern', label: 'Kiểu số' },
  { value: 'fee', label: 'Phí hòa mạng' },
  { value: 'commitment', label: 'Cam kết' },
  { value: 'status', label: 'Trạng thái' },
  { value: 'note', label: 'Ghi chú' },
  { value: 'createdAt', label: 'Ngày tạo' },
];

const simSchema = z.object({
  phone_number: z.string().regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'),
  subscription_type: z.enum(['prepaid', 'postpaid']),
  catalog: z.enum(['so_dep', 'phong_thuy', 'nam_sinh', 'tra_truoc', 'sim_data', 'esim']),
  sim_type: z.enum(['tam_hoa', 'tu_quy', 'phat_loc', 'than_tai', 'thuong']),
  bundle_note: z.string().max(255).optional().or(z.literal('')),
  commitment_months: z.coerce.number().int().min(0).max(36).optional(),
  status: z.enum(['available', 'reserved', 'sold', 'hidden']),
});

type SimSchemaValues = z.infer<typeof simSchema>;

export default function AdminSimsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = [10, 20, 50].includes(Number(searchParams.get('page_size')))
    ? Number(searchParams.get('page_size'))
    : 20;
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(searchValue, 300);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{
    mode: 'create' | 'edit';
    item?: SimNumber;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SimNumber | null>(null);
  const [importResult, setImportResult] = useState<SimImportResult | null>(null);
  const [importPreview, setImportPreview] = useState<SimImportPreview | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importMode, setImportMode] = useState<'skip' | 'update'>('skip');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportColumns, setExportColumns] = useState(EXPORT_COLUMNS.map((column) => column.value));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sims, isLoading } = useQuery({
    queryKey: ['admin-sims', searchParams.toString()],
    queryFn: () =>
      simsApi.listAdmin({
        q: searchParams.get('q') || undefined,
        prefix: searchParams.get('prefix') || undefined,
        catalog: (searchParams.get('catalog') || undefined) as SimFormValues['catalog'] | undefined,
        sim_type: (searchParams.get('sim_type') || undefined) as
          | SimFormValues['sim_type']
          | undefined,
        type: (searchParams.get('type') || undefined) as
          | SimFormValues['subscription_type']
          | undefined,
        status: (searchParams.get('status') || undefined) as SimFormValues['status'] | undefined,
        page,
        page_size: pageSize,
      }),
  });
  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const activationFees = {
    prepaid: Number(publicSettings?.sim_activation_fee_prepaid ?? 50000),
    postpaid: Number(publicSettings?.sim_activation_fee_postpaid ?? 60000),
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SimSchemaValues>({ resolver: zodResolver(simSchema) });
  const selectedSubscriptionType = watch('subscription_type', 'postpaid');

  function updateQuery(key: string, value?: string | number) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.set('page', '1');
    router.replace(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (debouncedSearch !== current) updateQuery('q', debouncedSearch);
    // updateQuery intentionally derives the latest URL state from searchParams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function openCreate() {
    reset({
      phone_number: '',
      subscription_type: 'postpaid',
      catalog: 'so_dep',
      sim_type: 'thuong',
      bundle_note: '',
      commitment_months: 0,
      status: 'available',
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: SimNumber) {
    reset({
      phone_number: item.phone_number,
      subscription_type: item.subscription_type,
      catalog: item.catalog,
      sim_type: item.sim_type,
      bundle_note: item.bundle_note ?? '',
      commitment_months: item.commitment_months ?? 0,
      status: item.status,
    });
    setModalState({ mode: 'edit', item });
  }

  const saveMutation = useMutation({
    mutationFn: (values: SimFormValues) =>
      modalState?.mode === 'edit' && modalState.item
        ? simsApi.update(modalState.item.id, values)
        : simsApi.create(values),
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
  const bulkStatusMutation = useMutation({
    mutationFn: (status: SimFormValues['status']) => simsApi.bulkUpdateStatus(selectedIds, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sims'] });
      showToast(`Đã cập nhật ${result.updated} số sim`);
      setSelectedIds([]);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: () => simsApi.bulkRemove(selectedIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sims'] });
      showToast(`Đã xóa mềm ${result.deleted} số sim`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const previewMutation = useMutation({
    mutationFn: (file: File) => simsApi.previewImport(file, importMode),
    onSuccess: (result) => setImportPreview(result),
    onError: (err: Error) => {
      setImportFile(null);
      showToast(err.message, 'error');
    },
  });
  const importMutation = useMutation({
    mutationFn: () => {
      if (!importFile || !importPreview) throw new Error('Vui lòng xem trước tệp Excel');
      return simsApi.importExcel(
        importFile,
        importMode,
        importPreview.digest,
        importPreview.preview_token,
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sims'] });
      setImportPreview(null);
      setImportFile(null);
      setImportResult(result);
      showToast(`Đã thêm ${result.inserted}, cập nhật ${result.updated} số sim`);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
  const templateMutation = useMutation({
    mutationFn: () => simsApi.downloadImportTemplate(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'mau-import-kho-sim.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: (format: 'xlsx' | 'csv') =>
      simsApi.exportData(
        format,
        {
          q: searchParams.get('q') || undefined,
          prefix: searchParams.get('prefix') || undefined,
          catalog: searchParams.get('catalog') || undefined,
          sim_type: searchParams.get('sim_type') || undefined,
          type: searchParams.get('type') || undefined,
          status: searchParams.get('status') || undefined,
        },
        { scope: exportScope, columns: exportColumns },
      ),
    onSuccess: (blob, format) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kho-sim.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      showToast('Xuất dữ liệu kho sim thành công');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmit(values: SimSchemaValues) {
    saveMutation.mutate({
      ...values,
      bundle_note: values.bundle_note || null,
      commitment_months: values.commitment_months ?? null,
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) {
        showToast('Chỉ chấp nhận tệp .xlsx tối đa 5 MB', 'error');
      } else {
        setImportFile(file);
        setImportPreview(null);
        previewMutation.mutate(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function downloadImportErrors(errors: SimImportResult['errors']) {
    if (!errors.length) return;
    const rows = [
      'Dòng,Lý do',
      ...errors.map((error) => `${error.row},"${error.message.replace(/"/g, '""')}"`),
    ];
    const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'loi-import-kho-sim.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const columns: TableColumn<SimNumber>[] = [
    {
      key: 'select',
      header: 'Chọn',
      render: (sim) => (
        <input
          type="checkbox"
          aria-label={`Chọn số ${sim.phone_number}`}
          checked={selectedIds.includes(sim.id)}
          onChange={(event) =>
            setSelectedIds((current) =>
              event.target.checked ? [...current, sim.id] : current.filter((id) => id !== sim.id),
            )
          }
        />
      ),
    },
    {
      key: 'phone_number',
      header: 'Số điện thoại',
      render: (s) => <span className={styles.strong}>{s.phone_number}</span>,
      sortAccessor: (s) => s.phone_number,
    },
    {
      key: 'subscription_type',
      header: 'Hình thức',
      render: (s) => <Badge>{s.subscription_type === 'prepaid' ? 'Trả trước' : 'Trả sau'}</Badge>,
    },
    {
      key: 'sim_type',
      header: 'Kiểu số',
      render: (s) => SIM_TYPE_OPTIONS.find((t) => t.value === s.sim_type)?.label,
    },
    {
      key: 'activation_fee',
      header: 'Phí hòa mạng',
      render: (s) => formatPrice(activationFees[s.subscription_type]),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <Badge tone={STATUS_TONE[s.status]}>
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
        <h1 className={styles.title}>Quản lý Kho sim số</h1>
        <div className={styles.buttonGroup}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className={styles.hidden}
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            isLoading={previewMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={styles.icon} /> Import Excel
          </Button>
          <select
            aria-label="Xử lý số sim trùng khi import"
            value={importMode}
            onChange={(event) => {
              setImportMode(event.target.value as 'skip' | 'update');
              setImportPreview(null);
              setImportFile(null);
            }}
          >
            <option value="skip">Trùng: bỏ qua</option>
            <option value="update">Trùng: cập nhật</option>
          </select>
          <Button
            variant="outline"
            isLoading={templateMutation.isPending}
            onClick={() => templateMutation.mutate()}
          >
            <Download className={styles.icon} /> Tải file mẫu
          </Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className={styles.icon} /> Xuất dữ liệu
          </Button>
          <Button onClick={openCreate}>
            <Plus className={styles.icon} /> Thêm số sim
          </Button>
        </div>
      </div>

      <FilterBar label="Bộ lọc kho sim">
        <TextField
          label="Tìm số thuê bao"
          placeholder="Ví dụ: 090* hoặc *8888"
          inputMode="numeric"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <SelectField
          label="Hình thức thuê bao"
          value={searchParams.get('type') ?? ''}
          options={[{ value: '', label: 'Tất cả' }, ...SUBSCRIPTION_OPTIONS]}
          onChange={(event) => updateQuery('type', event.target.value)}
        />
        <SelectField
          label="Trạng thái"
          value={searchParams.get('status') ?? ''}
          options={[{ value: '', label: 'Tất cả' }, ...STATUS_OPTIONS]}
          onChange={(event) => updateQuery('status', event.target.value)}
        />
        <SelectField
          label="Nhóm hiển thị"
          value={searchParams.get('catalog') ?? ''}
          options={[{ value: '', label: 'Tất cả' }, ...CATALOG_OPTIONS]}
          onChange={(event) => updateQuery('catalog', event.target.value)}
        />
        <SelectField
          label="Kiểu số"
          value={searchParams.get('sim_type') ?? ''}
          options={[{ value: '', label: 'Tất cả' }, ...SIM_TYPE_OPTIONS]}
          onChange={(event) => updateQuery('sim_type', event.target.value)}
        />
        <SelectField
          label="Số dòng mỗi trang"
          value={String(pageSize)}
          options={[10, 20, 50].map((value) => ({ value: String(value), label: `${value} dòng` }))}
          onChange={(event) => updateQuery('page_size', event.target.value)}
        />
      </FilterBar>

      {selectedIds.length > 0 && (
        <div className={styles.toolbar} role="region" aria-label="Thao tác hàng loạt">
          <strong>Đã chọn {selectedIds.length} số</strong>
          <div className={styles.buttonGroup}>
            <SelectField
              label="Đổi trạng thái"
              value=""
              options={[{ value: '', label: 'Chọn trạng thái' }, ...STATUS_OPTIONS]}
              onChange={(event) => {
                if (event.target.value) {
                  bulkStatusMutation.mutate(event.target.value as SimFormValues['status']);
                }
              }}
            />
            <Button variant="danger" onClick={() => setBulkDeleteOpen(true)}>
              Xóa các số đã chọn
            </Button>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={sims?.items ?? []}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="Không tìm thấy số phù hợp — hãy thử bớt điều kiện lọc"
      />
      <Pagination
        page={sims?.page ?? page}
        pageSize={sims?.page_size ?? pageSize}
        total={sims?.total ?? 0}
        onPageChange={(nextPage) => updateQuery('page', nextPage)}
      />

      <Modal isOpen={exportOpen} onClose={() => setExportOpen(false)} title="Xuất dữ liệu kho sim">
        <div className={styles.form}>
          <SelectField
            label="Phạm vi xuất"
            value={exportScope}
            options={[
              { value: 'filtered', label: 'Theo bộ lọc hiện tại' },
              { value: 'all', label: 'Tất cả số sim' },
            ]}
            onChange={(event) => setExportScope(event.target.value as 'filtered' | 'all')}
          />
          <fieldset>
            <legend>Chọn cột xuất</legend>
            <div className={styles.grid2}>
              {EXPORT_COLUMNS.map((column) => (
                <label key={column.value}>
                  <input
                    type="checkbox"
                    checked={exportColumns.includes(column.value)}
                    onChange={(event) =>
                      setExportColumns((current) =>
                        event.target.checked
                          ? [...current, column.value]
                          : current.filter((value) => value !== column.value),
                      )
                    }
                  />{' '}
                  {column.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="outline"
              disabled={exportColumns.length === 0}
              isLoading={exportMutation.isPending}
              onClick={() => exportMutation.mutate('csv')}
            >
              Xuất CSV
            </Button>
            <Button
              disabled={exportColumns.length === 0}
              isLoading={exportMutation.isPending}
              onClick={() => exportMutation.mutate('xlsx')}
            >
              Xuất Excel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Sửa số sim' : 'Thêm số sim'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <TextField
            label="Số điện thoại"
            error={errors.phone_number?.message}
            {...register('phone_number')}
          />
          <SelectField
            label="Hình thức thuê bao *"
            options={SUBSCRIPTION_OPTIONS}
            error={errors.subscription_type?.message}
            {...register('subscription_type')}
          />
          <div className={styles.grid2}>
            <SelectField
              label="Nhóm hiển thị"
              options={CATALOG_OPTIONS}
              error={errors.catalog?.message}
              {...register('catalog')}
            />
            <SelectField
              label="Kiểu số đẹp"
              options={SIM_TYPE_OPTIONS}
              error={errors.sim_type?.message}
              {...register('sim_type')}
            />
          </div>
          <div className={styles.grid2}>
            <TextField
              label="Phí hòa mạng dự kiến"
              value={formatPrice(activationFees[selectedSubscriptionType])}
              readOnly
            />
            <TextField
              type="number"
              label="Cam kết (tháng)"
              error={errors.commitment_months?.message}
              {...register('commitment_months')}
            />
          </div>
          <TextField
            label="Ghi chú gói cước kèm theo"
            error={errors.bundle_note?.message}
            {...register('bundle_note')}
          />
          <SelectField
            label="Trạng thái"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status')}
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

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate()}
        isPending={bulkDeleteMutation.isPending}
        destructive
        title="Xóa mềm nhiều số sim"
        confirmLabel={`Xóa ${selectedIds.length} số`}
      >
        Các số đã chọn sẽ bị ẩn khỏi hệ thống nhưng dữ liệu vẫn được giữ để có thể phục hồi.
      </ConfirmDialog>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
      >
        <p className={styles.confirm}>
          Bạn có chắc muốn xóa số <strong>{deleteTarget?.phone_number}</strong>?
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

      <Modal
        isOpen={importPreview !== null}
        onClose={() => {
          setImportPreview(null);
          setImportFile(null);
        }}
        title="Xem trước import kho sim"
      >
        {importPreview && (
          <div className={styles.form}>
            <p>
              Tệp: <strong>{importFile?.name}</strong> · {importPreview.total} dòng dữ liệu
            </p>
            <p>
              Dự kiến thêm {importPreview.inserted}, cập nhật {importPreview.updated}, bỏ qua{' '}
              {importPreview.skipped} dòng. Số liệu có thể thay đổi nếu kho sim được sửa trước khi
              xác nhận.
            </p>
            <p>20 dòng đầu được kiểm tra:</p>
            <ul className={styles.errorList}>
              {importPreview.sample.map((row) => (
                <li key={row.row}>
                  Dòng {row.row}: {row.phone_number} · {row.subscription_type} · {row.action}
                </li>
              ))}
            </ul>
            {importPreview.errors.length > 0 && (
              <div className={styles.errorBox}>
                <p className={styles.errorTitle}>{importPreview.errors.length} dòng lỗi:</p>
                <ul className={styles.errorList}>
                  {importPreview.errors.slice(0, 20).map((error) => (
                    <li key={error.row}>
                      Dòng {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.actions}>
              {importPreview.errors.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => downloadImportErrors(importPreview.errors)}
                >
                  Tải danh sách lỗi CSV
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setImportPreview(null);
                  setImportFile(null);
                }}
              >
                Hủy
              </Button>
              <Button
                isLoading={importMutation.isPending}
                disabled={importPreview.inserted + importPreview.updated === 0}
                onClick={() => importMutation.mutate()}
              >
                Xác nhận nhập
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={importResult !== null}
        onClose={() => setImportResult(null)}
        title="Kết quả Import Excel"
      >
        {importResult && (
          <div className={styles.form}>
            <p className={styles.confirm}>
              Đã nhập thành công <strong>{importResult.inserted}</strong> số, bỏ qua{' '}
              <strong>{importResult.skipped}</strong> dòng và cập nhật{' '}
              <strong>{importResult.updated}</strong> số.
            </p>
            {importResult.errors.length > 0 && (
              <div className={styles.errorBox}>
                <p className={styles.errorTitle}>Các dòng lỗi:</p>
                <ul className={styles.errorList}>
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>
                      Dòng {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.actions}>
              {importResult.errors.length > 0 && (
                <Button variant="outline" onClick={() => downloadImportErrors(importResult.errors)}>
                  Tải danh sách lỗi CSV
                </Button>
              )}
              <Button onClick={() => setImportResult(null)}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
