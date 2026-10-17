'use client';
import { FilterBar } from '@/components/ui/FilterBar';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { packagesApi, PackageFormValues } from '@/lib/api/packages';
import { Package } from '@/types/product';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { PackageExcel } from './PackageExcel';
import { ordersApi } from '@/lib/api/orders';
import { PackagePreview } from './PackagePreview';
import { BenefitsEditor } from './BenefitsEditor';
import { packageData, packageDuration } from '@/lib/package-display';
import local from './packages.module.scss';
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
  { value: 'hidden', label: 'Ẩn' },
];
const SERVICE_OPTIONS = [
  { value: 'mobile', label: 'Di động' },
  { value: 'data', label: 'Data' },
  { value: 'wifi_5g', label: 'Wifi 5G' },
  { value: 'combo', label: 'Combo' },
];
const SUBSCRIPTION_OPTIONS = [
  { value: 'none', label: 'Không áp dụng' },
  { value: 'prepaid', label: 'Trả trước' },
  { value: 'postpaid', label: 'Trả sau' },
];

const packageSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã gói')
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ gồm chữ in hoa, số, dấu gạch ngang/gạch dưới'),
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
  status: z.enum(['active', 'inactive', 'hidden']),
  display_order: z.coerce.number().int(),
  service_type: z.enum(['mobile', 'data', 'wifi_5g', 'combo']),
  subscription_type: z.enum(['prepaid', 'postpaid', 'none']),
  sms_syntax: z.string().max(255).optional(),
  image_url: z.string().max(255).optional(),
  conditions: z.string().optional(),
  audience: z.string().max(255).optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional(),
  data_per_day_gb: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
  data_per_cycle_gb: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
  unlimited_data: z.boolean().default(false),
  badges: z.array(z.enum(['hot', 'new', 'bestseller'])).default([]),
});

type PackageSchemaValues = z.infer<typeof packageSchema>;

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: Package } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [benefitsText, setBenefitsText] = useState('');
  const [draggedPackageId, setDraggedPackageId] = useState<number | null>(null);
  const [group, setGroup] = useState('all');
  const [sort, setSort] = useState('order');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<'active' | 'inactive' | null>(null);
  const [orderDraft, setOrderDraft] = useState<Package[] | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [extraDirty, setExtraDirty] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => packagesApi.listAdmin(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<PackageSchemaValues>({ resolver: zodResolver(packageSchema) });

  function openCreate() {
    setExtraDirty(false);
    setSelectedImage(null);
    setBenefitsText('');
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
      status: 'hidden',
      service_type: 'mobile',
      subscription_type: 'none',
      sms_syntax: '',
      image_url: '',
      conditions: '',
      audience: '',
      effective_from: '',
      effective_to: '',
      data_per_day_gb: 0,
      data_per_cycle_gb: 0,
      unlimited_data: false,
      badges: [],
      display_order: 0,
    });
    setModalState({ mode: 'create' });
  }

  function openEdit(item: Package) {
    setExtraDirty(false);
    setSelectedImage(null);
    setBenefitsText(item.benefits?.join('\n') || '');
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
      service_type: item.service_type || 'mobile',
      subscription_type: item.subscription_type || 'none',
      sms_syntax: item.sms_syntax || '',
      image_url: item.image_url || '',
      conditions: item.conditions || '',
      audience: item.audience || '',
      effective_from: item.effective_from?.slice(0, 10) || '',
      effective_to: item.effective_to?.slice(0, 10) || '',
      data_per_day_gb: item.data_per_day_gb ?? undefined,
      data_per_cycle_gb: item.data_per_cycle_gb ?? undefined,
      unlimited_data: item.unlimited_data || false,
      badges: item.badges || [],
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
      const previous = modalState?.item;
      if (
        previous &&
        (Number(previous.price) !== Number(watch('price')) || watch('status') === 'inactive')
      )
        showToast('Hãy rà soát nội dung tri thức và giá giải pháp số liên quan.');
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
  function duplicate(item: Package) {
    openEdit(item);
    setValue('code', '');
    setValue('slug', '');
    setValue('name', `${item.name.slice(0, 90)} (bản sao)`);
    setValue('status', 'hidden');
    setModalState({ mode: 'create' });
  }
  const reorderMutation = useMutation({
    mutationFn: async () => {
      if (!orderDraft) return;
      const slots = (packages ?? []).filter((p) => group === 'all' || p.group_type === group);
      const positions = slots.map((p) => p.display_order).sort((a, b) => a - b);
      // Older records may share order=0. Normalize all positions only in that case.
      const unique =
        new Set((packages ?? []).map((p) => p.display_order)).size === (packages ?? []).length;
      const full = [...(packages ?? [])];
      let index = 0;
      const merged = full.map((p) =>
        group === 'all' || p.group_type === group ? orderDraft[index++] : p,
      );
      const updates = unique
        ? orderDraft.map((p, i) => ({ id: p.id, order: positions[i] }))
        : merged.map((p, i) => ({ id: p.id, order: i }));
      for (const item of updates) await packagesApi.update(item.id, { display_order: item.order });
    },
    onSuccess: () => {
      setOrderDraft(null);
      refresh();
      showToast('Đã lưu thứ tự hiển thị');
    },
    onError: (err: Error) => {
      refresh();
      showToast(`Lưu chưa hoàn tất: ${err.message}. Hãy kiểm tra và lưu lại.`, 'error');
    },
  });
  const bulkMutation = useMutation({
    mutationFn: async (status: 'active' | 'inactive') => {
      for (const id of selected) await packagesApi.update(id, { status });
    },
    onSuccess: () => {
      refresh();
      setSelected([]);
      setBulkStatus(null);
      showToast('Đã đổi trạng thái. Hãy rà soát nội dung tri thức liên quan.');
    },
    onError: (err: Error) => {
      refresh();
      showToast(`Một số gói có thể đã được cập nhật: ${err.message}`, 'error');
    },
  });
  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
    queryClient.invalidateQueries({ queryKey: ['package-reference-counts'] });
  }
  const { data: referenceCounts, isError: referencesError } = useQuery({
    queryKey: ['package-reference-counts'],
    queryFn: async () => {
      const counts: Record<number, number> = {};
      let page = 1;
      while (true) {
        const batch = await ordersApi.list({ page, page_size: 100 });
        for (const order of batch.items) {
          const ids = new Set(
            order.items.filter((i) => i.type === 'goi_cuoc').map((i) => i.reference_id),
          );
          for (const id of ids) counts[id] = (counts[id] || 0) + 1;
        }
        if (batch.items.length < 100) break;
        page++;
      }
      return counts;
    },
    retry: false,
  });
  const values = watch();
  const duplicateCode = (packages ?? []).some(
    (p) =>
      p.id !== (modalState?.mode === 'edit' ? modalState.item?.id : undefined) &&
      p.code.toUpperCase() === (values.code || '').trim().toUpperCase(),
  );
  const unsaved = !!orderDraft || (!!modalState && (isDirty || extraDirty));
  useEffect(() => {
    if (!unsaved) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const navigate = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]');
      if (anchor && !window.confirm('Có thay đổi chưa lưu. Rời trang?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', leave);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('click', navigate, true);
    };
  }, [unsaved]);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [search, statusFilter, group, pageSize]);
  function closeForm() {
    if (saveMutation.isPending) return;
    if (!(isDirty || extraDirty) || window.confirm('Bỏ các thay đổi chưa lưu?'))
      setModalState(null);
  }
  function move(source: number, target: number) {
    setOrderDraft((current) => {
      if (!current) return current;
      const result = [...current],
        from = result.findIndex((p) => p.id === source),
        to = result.findIndex((p) => p.id === target);
      if (from < 0 || to < 0) return current;
      result.splice(to, 0, result.splice(from, 1)[0]);
      return result;
    });
  }
  function onSubmit(values: PackageSchemaValues) {
    if (duplicateCode) {
      setError('code', { message: 'Mã gói đã tồn tại' });
      return;
    }
    saveMutation.mutate({
      ...values,
      data_per_day_gb: values.data_per_day_gb ?? null,
      data_per_cycle_gb: values.data_per_cycle_gb ?? null,
      headline_desc: values.headline_desc || null,
      data_desc: values.data_desc || null,
      call_desc: values.call_desc || null,
      sms_desc: values.sms_desc || null,
      speed_desc: values.speed_desc || null,
      description: values.description || null,
      sms_syntax: values.sms_syntax || null,
      image_url: values.image_url || null,
      conditions: values.conditions || null,
      audience: values.audience || null,
      effective_from: values.effective_from || null,
      effective_to: values.effective_to || null,
      benefits: benefitsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      image: selectedImage || undefined,
    });
  }

  const groups = Array.from(new Set((packages ?? []).map((p) => p.group_type)));
  const filtered = (packages ?? [])
    .filter(
      (p) =>
        (group === 'all' || p.group_type === group) &&
        (statusFilter === 'all' || p.status === statusFilter) &&
        `${p.code} ${p.name}`.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'price_asc'
        ? Number(a.price) - Number(b.price)
        : sort === 'price_desc'
          ? Number(b.price) - Number(a.price)
          : a.display_order - b.display_order || a.id - b.id,
    );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const visible =
    orderDraft ?? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasBenefits = (packages ?? []).some((p) => packageData(p) || p.call_desc || p.sms_desc);
  function toggle(id: number) {
    setSelected((list) => (list.includes(id) ? list.filter((i) => i !== id) : [...list, id]));
  }
  function actions(p: Package) {
    return (
      <div className={local.actions} onClick={(e) => e.stopPropagation()}>
        <button title="Nhân bản" aria-label={`Nhân bản ${p.code}`} onClick={() => duplicate(p)}>
          <Copy size={16} />
        </button>
        <button title="Sửa" aria-label={`Sửa ${p.code}`} onClick={() => openEdit(p)}>
          <Pencil size={16} />
        </button>
        <button
          title="Xóa"
          aria-label={`Xóa ${p.code}`}
          onClick={() => {
            setDeleteCode('');
            setDeleteTarget(p);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }
  function status(p: Package) {
    return (
      <span className={local.status}>
        <Badge
          tone={p.status === 'active' ? 'success' : p.status === 'hidden' ? 'warning' : 'neutral'}
        >
          ● {STATUS_OPTIONS.find((s) => s.value === p.status)?.label}
        </Badge>
      </span>
    );
  }
  function handle(p: Package, index: number) {
    return (
      <button
        className={local.handle}
        aria-label={`Di chuyển ${p.code}`}
        title="Space để chọn; mũi tên lên/xuống để di chuyển"
        draggable
        onClick={(e) => e.stopPropagation()}
        onDragStart={() => setDraggedPackageId(p.id)}
        onDragEnd={() => setDraggedPackageId(null)}
        aria-pressed={draggedPackageId === p.id}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setDraggedPackageId(draggedPackageId === p.id ? null : p.id);
          }
          if (draggedPackageId === p.id && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            const target = visible[index + (e.key === 'ArrowUp' ? -1 : 1)];
            if (target) move(p.id, target.id);
          }
        }}
      >
        ⠿
      </button>
    );
  }
  return (
    <div className={`${styles.page} ${local.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý Gói cước</h1>
        <Button onClick={openCreate} disabled={!!orderDraft}>
          <Plus className={styles.icon} /> Thêm gói cước
        </Button>
      </div>
      <Tabs
        tabs={[
          { value: 'all', label: `Tất cả (${packages?.length ?? 0})` },
          ...groups.map((value) => ({
            value,
            label: `${GROUP_OPTIONS.find((g) => g.value === value)?.label ?? value} (${packages?.filter((p) => p.group_type === value).length ?? 0})`,
          })),
        ]}
        value={group}
        onChange={(value) => {
          if (!orderDraft) setGroup(value);
        }}
      />
      <FilterBar label="Lọc gói cước">
        <input
          disabled={!!orderDraft}
          type="search"
          aria-label="Tìm gói cước"
          placeholder="Tìm mã hoặc tên gói"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          disabled={!!orderDraft}
          aria-label="Lọc trạng thái"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          disabled={!!orderDraft}
          aria-label="Sắp xếp"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="order">Thứ tự hiển thị</option>
          <option value="price_asc">Giá tăng</option>
          <option value="price_desc">Giá giảm</option>
        </select>
      </FilterBar>
      <div className={local.toolbar}>
        <Button
          variant="outline"
          disabled={
            !!orderDraft ||
            isLoading ||
            !packages?.length ||
            !!search ||
            statusFilter !== 'all' ||
            sort !== 'order'
          }
          onClick={() => {
            setSelected([]);
            setOrderDraft(filtered);
          }}
        >
          Sắp xếp thứ tự
        </Button>
        <span className={local.hint}>
          Sắp xếp khi không tìm kiếm, xem tất cả trạng thái và theo thứ tự hiển thị.
        </span>
      </div>
      <PackageExcel
        packages={packages ?? []}
        filtered={filtered}
        disabled={!!orderDraft}
        onDone={refresh}
      />
      {orderDraft && (
        <div className={local.toolbar}>
          <strong>Thứ tự hiển thị trên website</strong>
          <span role="status">
            {draggedPackageId
              ? `Đang chọn ${visible.find((p) => p.id === draggedPackageId)?.code}`
              : 'Kéo tay cầm hoặc dùng Space và phím mũi tên.'}
          </span>
          <Button isLoading={reorderMutation.isPending} onClick={() => reorderMutation.mutate()}>
            Lưu
          </Button>
          <Button
            variant="outline"
            disabled={reorderMutation.isPending}
            onClick={() => {
              if (window.confirm('Hủy thay đổi thứ tự?')) setOrderDraft(null);
            }}
          >
            Hủy
          </Button>
        </div>
      )}
      {selected.length > 0 && (
        <div className={local.bulk}>
          <strong>Đã chọn {selected.length} gói</strong>
          <Button onClick={() => setBulkStatus('active')}>Đang bán</Button>
          <Button variant="outline" onClick={() => setBulkStatus('inactive')}>
            Ngừng bán
          </Button>
          <Button variant="outline" onClick={() => setSelected([])}>
            Bỏ chọn
          </Button>
        </div>
      )}
      {isLoading ? (
        <p role="status">Đang tải gói cước…</p>
      ) : visible.length === 0 ? (
        <div className={local.empty}>
          <p>Không có gói cước phù hợp.</p>
          <Button onClick={openCreate}>Thêm gói cước</Button>
        </div>
      ) : (
        <>
          <div className={local.tableWrap}>
            <table className={local.table}>
              <thead>
                <tr>
                  <th>
                    {!orderDraft && (
                      <input
                        type="checkbox"
                        aria-label="Chọn trang hiện tại"
                        checked={visible.every((p) => selected.includes(p.id))}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? Array.from(new Set([...selected, ...visible.map((p) => p.id)]))
                              : selected.filter((id) => !visible.some((p) => p.id === id)),
                          )
                        }
                      />
                    )}
                  </th>
                  <th>Mã gói</th>
                  <th>Tên gói</th>
                  <th>Nhóm</th>
                  <th className={local.price}>Giá / chu kỳ</th>
                  {hasBenefits && <th>Ưu đãi chính</th>}
                  <th>Trạng thái</th>
                  {referenceCounts && <th>Đăng ký</th>}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p, index) => (
                  <tr
                    key={p.id}
                    onClick={() => !orderDraft && openEdit(p)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedPackageId !== null) move(draggedPackageId, p.id);
                      setDraggedPackageId(null);
                    }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      {orderDraft ? (
                        handle(p, index)
                      ) : (
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${p.code}`}
                          checked={selected.includes(p.id)}
                          onChange={() => toggle(p.id)}
                        />
                      )}
                    </td>
                    <td>
                      <button
                        className={local.code}
                        disabled={!!orderDraft}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                      >
                        {p.code}
                      </button>
                    </td>
                    <td>
                      <strong className={local.name}>{p.name}</strong>
                      {p.headline_desc && (
                        <span className={local.description} title={p.headline_desc}>
                          {p.headline_desc}
                        </span>
                      )}
                    </td>
                    <td>
                      {GROUP_OPTIONS.find((g) => g.value === p.group_type)?.label ?? p.group_type}
                    </td>
                    <td className={local.price}>
                      <strong>{formatPrice(p.price)}</strong>
                      <small>{packageDuration(p)}</small>
                    </td>
                    {hasBenefits && (
                      <td>
                        <div className={local.chips}>
                          {[packageData(p), p.call_desc, p.sms_desc].filter(Boolean).map((b, i) => (
                            <Badge key={i}>{b}</Badge>
                          ))}
                        </div>
                      </td>
                    )}
                    <td>{status(p)}</td>
                    {referenceCounts && <td>{referenceCounts[p.id] || 0}</td>}
                    <td>{!orderDraft && actions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={local.cards}>
            {visible.map((p, index) => (
              <article
                key={p.id}
                className={local.card}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedPackageId !== null) move(draggedPackageId, p.id);
                  setDraggedPackageId(null);
                }}
              >
                <div className={local.toolbar}>
                  {orderDraft ? (
                    handle(p, index)
                  ) : (
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${p.code}`}
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  )}
                  <button
                    className={local.code}
                    disabled={!!orderDraft}
                    onClick={() => openEdit(p)}
                  >
                    {p.code}
                  </button>
                  {status(p)}
                  {!orderDraft && (
                    <details className={local.menu}>
                      <summary aria-label={`Thao tác ${p.code}`}>⋯</summary>
                      {actions(p)}
                    </details>
                  )}
                </div>
                <button
                  className={local.cardBody}
                  disabled={!!orderDraft}
                  onClick={() => openEdit(p)}
                >
                  <strong>{p.name}</strong>
                  <span>{p.headline_desc}</span>
                  <span>{GROUP_OPTIONS.find((g) => g.value === p.group_type)?.label}</span>
                  <strong>
                    {formatPrice(p.price)} / {packageDuration(p)}
                  </strong>
                  <span>
                    {[packageData(p), p.call_desc, p.sms_desc].filter(Boolean).join(' · ')}
                  </span>
                  {referenceCounts && <span>{referenceCounts[p.id] || 0} đăng ký</span>}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {!orderDraft && (
        <div className={local.toolbar}>
          <span>{filtered.length} gói</span>
          <label>
            Số dòng{' '}
            <select
              aria-label="Số dòng mỗi trang"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      )}
      {referencesError && (
        <p className={local.hint}>
          Chưa tải được số đăng ký; backend vẫn kiểm tra tham chiếu trước khi xóa.
        </p>
      )}
      <Modal
        isOpen={bulkStatus !== null}
        onClose={() => !bulkMutation.isPending && setBulkStatus(null)}
        title="Đổi trạng thái hàng loạt"
      >
        <p>
          Chuyển {selected.length} gói sang {bulkStatus === 'active' ? 'Đang bán' : 'Ngừng bán'}?
        </p>
        <p>Hãy rà soát nội dung chatbot/tri thức liên quan.</p>
        <Button
          isLoading={bulkMutation.isPending}
          onClick={() => bulkStatus && bulkMutation.mutate(bulkStatus)}
        >
          Xác nhận
        </Button>
      </Modal>
      <Modal
        isOpen={modalState !== null}
        onClose={closeForm}
        title={modalState?.mode === 'edit' ? 'Sửa gói cước' : 'Thêm gói cước'}
        maxWidth="2xl"
        placement="right"
      >
        <form onSubmit={handleSubmit(onSubmit)} className={`${styles.form} ${local.form}`}>
          <h3>Thông tin chính</h3>
          <div className={styles.grid2}>
            <TextField
              label="Mã gói"
              error={duplicateCode ? 'Mã gói đã tồn tại' : errors.code?.message}
              {...register('code', {
                onChange: (e) =>
                  setValue('code', e.target.value.toUpperCase(), { shouldDirty: true }),
              })}
            />
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
          <div className={styles.grid2}>
            <SelectField
              label="Loại dịch vụ"
              options={SERVICE_OPTIONS}
              {...register('service_type')}
            />
            <SelectField
              label="Hình thức thuê bao"
              options={SUBSCRIPTION_OPTIONS}
              {...register('subscription_type')}
            />
          </div>
          <h3>Ưu đãi</h3>
          <div className={styles.grid2}>
            <TextField
              type="number"
              step="0.01"
              label="GB mỗi ngày"
              error={errors.data_per_day_gb?.message}
              {...register('data_per_day_gb')}
            />
            <TextField
              type="number"
              step="0.01"
              label="GB mỗi chu kỳ"
              error={errors.data_per_cycle_gb?.message}
              {...register('data_per_cycle_gb')}
            />
          </div>
          <label>
            <input type="checkbox" {...register('unlimited_data')} /> Data không giới hạn
          </label>
          <fieldset>
            <legend>Nhãn</legend>
            <label>
              <input type="checkbox" value="hot" {...register('badges')} /> Hot
            </label>
            <label>
              <input type="checkbox" value="new" {...register('badges')} /> Mới
            </label>
            <label>
              <input type="checkbox" value="bestseller" {...register('badges')} /> Bán chạy
            </label>
          </fieldset>
          <BenefitsEditor
            value={benefitsText}
            onChange={(value) => {
              setExtraDirty(true);
              setBenefitsText(value);
            }}
          />
          <h3>Đăng ký & hiển thị</h3>
          <TextField
            label="Cú pháp SMS"
            error={errors.sms_syntax?.message}
            {...register('sms_syntax')}
          />
          <TextField label="URL ảnh" error={errors.image_url?.message} {...register('image_url')} />
          <label>
            Hoặc tải ảnh lên{' '}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setExtraDirty(true);
                setSelectedImage(event.target.files?.[0] || null);
              }}
            />
          </label>
          <TextField label="Đối tượng" error={errors.audience?.message} {...register('audience')} />
          <TextareaField label="Điều kiện" {...register('conditions')} />
          <div className={styles.grid2}>
            <TextField type="date" label="Hiệu lực từ" {...register('effective_from')} />
            <TextField type="date" label="Hiệu lực đến" {...register('effective_to')} />
          </div>
          <TextField
            label="Mô tả ngắn (headline)"
            error={errors.headline_desc?.message}
            {...register('headline_desc')}
          />
          <h3>Giá & chu kỳ</h3>
          <div className={styles.grid3}>
            <TextField
              type="number"
              step="1000"
              label="Giá (đ)"
              hint={formatPrice(Number(values.price) || 0)}
              error={errors.price?.message}
              {...register('price')}
            />
            <TextField
              type="number"
              label="Chu kỳ"
              list="package-duration-presets"
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
          <datalist id="package-duration-presets">
            {[7, 30, 90, 180, 365].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
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
          <PackagePreview
            pkg={
              {
                ...modalState?.item,
                ...values,
                id: modalState?.item?.id ?? 0,
                benefits: benefitsText.split('\n').filter(Boolean),
              } as Package
            }
          />
          <div className={local.footer}>
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={saveMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={duplicateCode}
              isLoading={saveMutation.isPending}
              onClick={() => {
                setValue('status', 'hidden');
                handleSubmit(onSubmit)();
              }}
            >
              Lưu ẩn
            </Button>
            <Button
              type="button"
              disabled={duplicateCode}
              isLoading={saveMutation.isPending}
              onClick={() => {
                setValue('status', 'active');
                handleSubmit(onSubmit)();
              }}
            >
              Lưu & đăng bán
            </Button>
            {values.status === 'inactive' && (
              <Button type="submit" isLoading={saveMutation.isPending}>
                Lưu ngừng bán
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa"
      >
        <p className={styles.confirm}>
          {deleteTarget && referenceCounts?.[deleteTarget.id] ? (
            `Gói này có ${referenceCounts[deleteTarget.id]} đăng ký. Chuyển sang Ngừng bán?`
          ) : (
            <>
              Gõ mã <strong>{deleteTarget?.code}</strong> để xác nhận xóa mềm. Lịch sử dữ liệu được
              giữ lại.
            </>
          )}
        </p>
        {!referenceCounts?.[deleteTarget?.id ?? 0] && (
          <TextField
            label="Nhập lại mã gói"
            value={deleteCode}
            onChange={(e) => setDeleteCode(e.target.value)}
          />
        )}
        <p>Nội dung chatbot/tri thức có thể cần cập nhật.</p>
        <div className={styles.confirmActions}>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            disabled={
              deleteMutation.isPending ||
              bulkMutation.isPending ||
              (!referenceCounts?.[deleteTarget?.id ?? 0] && deleteCode !== deleteTarget?.code)
            }
            onClick={async () => {
              if (!deleteTarget) return;
              if (referenceCounts?.[deleteTarget.id]) {
                try {
                  await packagesApi.update(deleteTarget.id, { status: 'inactive' });
                  refresh();
                  setDeleteTarget(null);
                  showToast('Đã ngừng bán gói cước');
                } catch (err) {
                  showToast((err as Error).message, 'error');
                }
              } else deleteMutation.mutate(deleteTarget.id);
            }}
          >
            {referenceCounts?.[deleteTarget?.id ?? 0] ? 'Chuyển sang Ngừng bán' : 'Xóa'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
