'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { slidersApi, SliderItem, SliderItemFormValues, SliderZone } from '@/lib/api/sliders';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { TextField, SelectField, CheckboxField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { env } from '@/lib/env';
import styles from '../admin-shared.module.scss';

const ANIMATION_OPTIONS = [
  { value: 'fade', label: 'Mờ dần' },
  { value: 'slide', label: 'Trượt' },
  { value: 'zoom', label: 'Phóng to' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hiển thị' },
  { value: 'inactive', label: 'Ẩn' },
];

const zoneConfigSchema = z.object({
  animation_type: z.enum(['fade', 'slide', 'zoom']),
  autoplay_enabled: z.boolean(),
  autoplay_speed_ms: z.coerce.number().int().min(1000, 'Tối thiểu 1000ms'),
});
type ZoneConfigValues = z.infer<typeof zoneConfigSchema>;

const itemSchema = z.object({
  image_url: z.string().optional(),
  link_url: z.string().max(500).optional().or(z.literal('')),
  title: z.string().max(150).optional().or(z.literal('')),
  caption: z.string().max(255).optional().or(z.literal('')),
  display_order: z.coerce.number().int(),
  status: z.enum(['active', 'inactive']),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
});
type ItemSchemaValues = z.infer<typeof itemSchema>;

function getImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('blob:')) return imageUrl;
  const apiBaseUrl = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${apiBaseUrl}/${imageUrl.replace(/^\/+/, '')}`;
}

export default function AdminSlidersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [itemModal, setItemModal] = useState<{ mode: 'create' | 'edit'; item?: SliderItem } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SliderItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedImage) return;
    const objectUrl = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const { data: zones } = useQuery({
    queryKey: ['admin-slider-zones'],
    queryFn: () => slidersApi.listZones(),
  });
  const activeZone: SliderZone | undefined =
    zones?.find((z) => z.id === activeZoneId) ?? zones?.[0];
  const resolvedZoneId = activeZoneId ?? zones?.[0]?.id;

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-slider-items', resolvedZoneId],
    queryFn: () => slidersApi.listItems(resolvedZoneId as number),
    enabled: Boolean(resolvedZoneId),
  });

  const zoneForm = useForm<ZoneConfigValues>({ resolver: zodResolver(zoneConfigSchema) });
  const itemForm = useForm<ItemSchemaValues>({ resolver: zodResolver(itemSchema) });

  function openConfig() {
    if (!activeZone) return;
    zoneForm.reset({
      animation_type: activeZone.animation_type,
      autoplay_enabled: activeZone.autoplay_enabled,
      autoplay_speed_ms: activeZone.autoplay_speed_ms,
    });
    setIsConfigOpen(true);
  }

  const updateZoneMutation = useMutation({
    mutationFn: (values: ZoneConfigValues) => slidersApi.updateZone(activeZone!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slider-zones'] });
      showToast('Đã cập nhật cấu hình zone');
      setIsConfigOpen(false);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function openCreateItem() {
    setSelectedImage(null);
    setExistingImageUrl(null);
    setImagePreviewUrl(null);
    setImagePreviewError(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    itemForm.reset({
      image_url: '',
      link_url: '',
      title: '',
      caption: '',
      display_order: 0,
      status: 'active',
      start_date: '',
      end_date: '',
    });
    setItemModal({ mode: 'create' });
  }

  function openEditItem(item: SliderItem) {
    setSelectedImage(null);
    const currentImageUrl = getImageUrl(item.image_url);
    setExistingImageUrl(currentImageUrl);
    setImagePreviewUrl(currentImageUrl);
    setImagePreviewError(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    itemForm.reset({
      image_url: item.image_url,
      link_url: item.link_url ?? '',
      title: item.title ?? '',
      caption: item.caption ?? '',
      display_order: item.display_order,
      status: item.status,
      start_date: item.start_date ?? '',
      end_date: item.end_date ?? '',
    });
    setItemModal({ mode: 'edit', item });
  }

  const saveItemMutation = useMutation({
    mutationFn: (values: SliderItemFormValues) =>
      itemModal?.mode === 'edit' && itemModal.item
        ? slidersApi.updateItem(itemModal.item.id, values)
        : slidersApi.createItem(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slider-items', resolvedZoneId] });
      showToast('Đã lưu slide thành công');
      setItemModal(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => slidersApi.removeItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slider-items', resolvedZoneId] });
      showToast('Đã xóa slide');
      setDeleteTarget(null);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function onSubmitItem(values: ItemSchemaValues) {
    if (!resolvedZoneId) return;
    if (itemModal?.mode === 'create' && !selectedImage) {
      showToast('Vui lòng chọn ảnh cho slide', 'error');
      return;
    }
    saveItemMutation.mutate({
      ...values,
      zone_id: resolvedZoneId,
      image: selectedImage ?? undefined,
      link_url: values.link_url || null,
      title: values.title || null,
      caption: values.caption || null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
    });
  }

  const columns: TableColumn<SliderItem>[] = [
    { key: 'title', header: 'Tiêu đề', render: (i) => i.title ?? '(không có)' },
    {
      key: 'image_url',
      header: 'Ảnh',
      render: (i) => <span className={styles.imageUrl}>{i.image_url}</span>,
    },
    {
      key: 'display_order',
      header: 'Thứ tự',
      render: (i) => i.display_order,
      sortAccessor: (i) => i.display_order,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (i) => (
        <Badge tone={i.status === 'active' ? 'success' : 'neutral'}>
          {STATUS_OPTIONS.find((s) => s.value === i.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'start_date',
      header: 'Hiệu lực',
      render: (i) =>
        i.start_date || i.end_date
          ? `${formatDate(i.start_date)} - ${formatDate(i.end_date)}`
          : 'Không giới hạn',
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (i) => (
        <div className={styles.iconActions}>
          <button
            type="button"
            onClick={() => openEditItem(i)}
            aria-label="Sửa"
            className={styles.iconButton}
          >
            <Pencil className={styles.icon} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(i)}
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
      <h1 className={styles.title}>Quản lý Banner</h1>

      {zones && zones.length > 0 && (
        <Tabs
          tabs={zones.map((z) => ({ value: String(z.id), label: z.name }))}
          value={String(resolvedZoneId ?? '')}
          onChange={(v) => setActiveZoneId(Number(v))}
        />
      )}

      <div className={styles.toolbar}>
        <p className={styles.muted}>
          Có 3 khu vực banner mặc định. Bạn có thể chỉnh hiệu ứng, tự động chuyển ảnh và thêm, sửa
          hoặc xóa từng banner.
        </p>
        <div className={styles.buttonGroup}>
          <Button variant="outline" size="sm" onClick={openConfig}>
            <Settings2 className={styles.icon} /> Cấu hình khu vực
          </Button>
          <Button size="sm" onClick={openCreateItem}>
            <Plus className={styles.icon} /> Thêm banner
          </Button>
        </div>
      </div>

      <Table columns={columns} data={items ?? []} rowKey={(i) => i.id} isLoading={isLoading} />

      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title={`Cấu hình khu vực: ${activeZone?.name ?? ''}`}
      >
        <form
          onSubmit={zoneForm.handleSubmit((v) => updateZoneMutation.mutate(v))}
          className={styles.form}
        >
          <SelectField
            label="Hiệu ứng"
            options={ANIMATION_OPTIONS}
            error={zoneForm.formState.errors.animation_type?.message}
            {...zoneForm.register('animation_type')}
          />
          <CheckboxField label="Tự động chuyển ảnh" {...zoneForm.register('autoplay_enabled')} />
          <TextField
            type="number"
            label="Thời gian chuyển ảnh (mili giây)"
            error={zoneForm.formState.errors.autoplay_speed_ms?.message}
            {...zoneForm.register('autoplay_speed_ms')}
          />
          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={updateZoneMutation.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={itemModal !== null}
        onClose={() => setItemModal(null)}
        title={itemModal?.mode === 'edit' ? 'Sửa banner' : 'Thêm banner'}
      >
        <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className={styles.form}>
          <div className={styles.fileField}>
            <label htmlFor="slider-image">Ảnh slide</label>
            <input
              ref={imageInputRef}
              id="slider-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                setImagePreviewError(false);
                setSelectedImage(event.target.files?.[0] ?? null);
              }}
            />
            {imagePreviewUrl && !imagePreviewError && (
              <div className={styles.imagePreviewBox}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt={selectedImage ? 'Ảnh mới được chọn' : 'Ảnh hiện tại của slide'}
                  onError={() => setImagePreviewError(true)}
                  className={styles.imagePreview}
                />
                <p className={styles.imagePreviewCaption}>
                  {selectedImage ? 'Ảnh mới sẽ được sử dụng' : 'Ảnh hiện tại đang được lưu'}
                </p>
              </div>
            )}
            {imagePreviewError && itemModal?.mode === 'edit' && existingImageUrl && (
              <p className={styles.imagePreviewError}>
                Không thể hiển thị ảnh hiện tại. Đường dẫn: {existingImageUrl}
              </p>
            )}
            <p className={styles.muted}>JPG, PNG, WEBP hoặc GIF, tối đa 5MB.</p>
            {selectedImage && <p className={styles.imageUrl}>Đã chọn: {selectedImage.name}</p>}
          </div>
          <TextField
            label="Liên kết khi bấm vào (tùy chọn)"
            placeholder="https://..."
            error={itemForm.formState.errors.link_url?.message}
            {...itemForm.register('link_url')}
          />
          <TextField
            label="Tiêu đề"
            error={itemForm.formState.errors.title?.message}
            {...itemForm.register('title')}
          />
          <TextField
            label="Chú thích (caption)"
            error={itemForm.formState.errors.caption?.message}
            {...itemForm.register('caption')}
          />
          <div className={styles.grid2}>
            <TextField
              type="number"
              label="Thứ tự hiển thị"
              error={itemForm.formState.errors.display_order?.message}
              {...itemForm.register('display_order')}
            />
            <SelectField
              label="Trạng thái"
              options={STATUS_OPTIONS}
              error={itemForm.formState.errors.status?.message}
              {...itemForm.register('status')}
            />
          </div>
          <div className={styles.grid2}>
            <TextField
              type="date"
              label="Ngày bắt đầu hiệu lực"
              error={itemForm.formState.errors.start_date?.message}
              {...itemForm.register('start_date')}
            />
            <TextField
              type="date"
              label="Ngày kết thúc hiệu lực"
              error={itemForm.formState.errors.end_date?.message}
              {...itemForm.register('end_date')}
            />
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="outline" onClick={() => setItemModal(null)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={saveItemMutation.isPending}>
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
        <p className={styles.confirm}>Bạn có chắc muốn xóa slide này?</p>
        <div className={styles.confirmActions}>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            isLoading={deleteItemMutation.isPending}
            onClick={() => deleteTarget && deleteItemMutation.mutate(deleteTarget.id)}
          >
            Xóa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
