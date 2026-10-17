'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Upload } from 'lucide-react';
import { mediaApi } from '@/lib/api/media';
import { promotionsApi, type Promotion, type PublicPromotion } from '@/lib/api/promotions';
import { assetUrl } from '@/lib/assets';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CheckboxField, SelectField, TextareaField, TextField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { PromotionExperience } from '@/components/promotions/PromotionExperience';
import { promotionDefaults, promotionFormSchema, toPromotionInput, type PromotionFormValues } from './form';
import shared from '../admin-shared.module.scss';
import styles from './page.module.scss';

export function PromotionEditor({ promotion, onClose }: { promotion?: Promotion; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [preview, setPreview] = useState<PublicPromotion | null>(null);
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema), defaultValues: promotionDefaults(promotion),
  });
  const { register, watch, handleSubmit, formState: { errors } } = form;
  const triggerType = watch('trigger_type');
  const scope = watch('page_scope');
  const effectType = watch('effect_type');
  const imageUrl = assetUrl(watch('image_url'));
  const save = useMutation({
    mutationFn: (values: PromotionFormValues) => promotion
      ? promotionsApi.update(promotion.id, toPromotionInput(values))
      : promotionsApi.create(toPromotionInput(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      showToast('Đã lưu chương trình khuyến mại');
      onClose();
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const upload = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: ({ url }) => {
      form.setValue('image_url', url, { shouldDirty: true, shouldValidate: true });
      showToast('Đã tải ảnh banner');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const busy = save.isPending || upload.isPending;

  function showPreview(values: PromotionFormValues) {
    const { name: _name, ...publicFields } = toPromotionInput(values);
    setPreview({ ...publicFields, id: promotion?.id ?? 0 });
  }

  return <>
    <Modal isOpen={!preview} onClose={() => { if (!busy) onClose(); }}
      title={promotion ? 'Sửa chương trình khuyến mại' : 'Thêm chương trình khuyến mại'} maxWidth="2xl">
      <form className={shared.form} onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <fieldset className={styles.section} disabled={busy}>
          <legend>Nội dung khuyến mại</legend>
          <TextField label="Tên chương trình (nội bộ)" maxLength={160} required
            error={errors.name?.message} {...register('name')} />
          <TextField label="Tiêu đề hiển thị" maxLength={255} required
            error={errors.title?.message} {...register('title')} />
          <TextareaField label="Nội dung khuyến mại" maxLength={10000} required rows={5}
            hint="Mô tả ưu đãi và điều kiện áp dụng. Nội dung hiển thị dạng văn bản, giữ các dòng xuống hàng."
            error={errors.content?.message} {...register('content')} />
          <TextField label="Đường dẫn ảnh banner" placeholder="/uploads/banner.webp hoặc https://..."
            error={errors.image_url?.message} {...register('image_url')} />
          <div className={styles.uploadRow}>
            <label className={styles.uploadLabel}>
              <Upload size={16} aria-hidden /> {upload.isPending ? 'Đang tải ảnh…' : 'Tải ảnh từ thiết bị'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy}
                aria-label="Tải ảnh banner từ thiết bị" onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (!file) return;
                  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
                    showToast('Chọn ảnh JPG, PNG, WebP hoặc GIF', 'error'); return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    showToast('Ảnh tối đa 5 MB', 'error'); return;
                  }
                  upload.mutate(file);
                }} />
            </label>
            {imageUrl && <Button type="button" variant="ghost" size="sm"
              onClick={() => form.setValue('image_url', '', { shouldDirty: true })}>Bỏ ảnh</Button>}
            <span className={styles.help}>JPG, PNG, WebP, GIF; tối đa 5 MB. Nên dùng ảnh dưới 500 KB.</span>
          </div>
          {imageUrl && <div className={styles.bannerPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Ảnh banner khuyến mại" />
          </div>}
          <TextField label="Mã giảm giá" maxLength={100} hint="Để trống nếu chương trình không có mã."
            error={errors.coupon_code?.message} {...register('coupon_code')} />
          <div className={styles.grid}>
            <TextField label="Nội dung nút" maxLength={100} placeholder="Xem ngay"
              error={errors.cta_text?.message} {...register('cta_text')} />
            <TextField label="Đường dẫn nút" placeholder="/goi-cuoc hoặc https://..."
              error={errors.cta_link?.message} {...register('cta_link')} />
          </div>
        </fieldset>

        <fieldset className={styles.section} disabled={busy}>
          <legend>Cấu hình hiển thị</legend>
          <div className={styles.grid}>
            <SelectField label="Kiểu hiệu ứng" {...register('effect_type')} options={[
              { value: 'bounce', label: 'Hộp quà bật nảy, pháo giấy' },
              { value: 'shake', label: 'Hộp quà rung và mở nắp' },
              { value: 'popup', label: 'Popup thông thường' },
            ]} />
            <SelectField label="Vị trí hộp quà"
              hint={effectType === 'popup' ? 'Popup thông thường luôn hiện ở giữa màn hình.' : undefined}
              {...register('position')} options={[
                { value: 'center', label: 'Giữa màn hình' },
                { value: 'bottom_right', label: 'Góc dưới phải' },
                { value: 'bottom_left', label: 'Góc dưới trái' },
              ]} />
            <SelectField label="Thời điểm kích hoạt" {...register('trigger_type')} options={[
              { value: 'immediate', label: 'Ngay khi vào trang' },
              { value: 'delay', label: 'Sau số giây cấu hình' },
              { value: 'scroll', label: 'Khi cuộn đến phần trăm cấu hình' },
            ]} onChange={(event) => {
              form.setValue('trigger_type', event.target.value as PromotionFormValues['trigger_type'], { shouldDirty: true });
              form.setValue('trigger_value', event.target.value === 'delay' ? 3 : event.target.value === 'scroll' ? 50 : 0, { shouldDirty: true });
            }} />
            {triggerType !== 'immediate' && <TextField type="number"
              label={triggerType === 'delay' ? 'Sau bao nhiêu giây?' : 'Phần trăm cuộn trang'}
              min={0} max={triggerType === 'delay' ? 3600 : 100} step={1}
              error={errors.trigger_value?.message} {...register('trigger_value')} />}
          </div>
          <SelectField label="Trang áp dụng" {...register('page_scope')} options={[
            { value: 'all', label: 'Toàn bộ website' },
            { value: 'home', label: 'Chỉ trang chủ' },
            { value: 'specific', label: 'Chọn trang cụ thể' },
          ]} />
          {scope === 'specific' && <TextareaField label="Các đường dẫn áp dụng"
            placeholder={'/goi-cuoc\n/sim-so-dep'} rows={3} error={errors.paths?.message}
            hint="Mỗi dòng một đường dẫn. Áp dụng đúng đường dẫn này, không tự bao gồm trang con."
            {...register('paths')} />}
          <div className={styles.grid}>
            <SelectField label="Tần suất hiển thị" {...register('frequency')} options={[
              { value: 'visit', label: 'Mỗi lần truy cập' },
              { value: 'daily', label: 'Mỗi ngày một lần' },
              { value: 'once', label: 'Chỉ một lần' },
            ]} hint="Mỗi lần truy cập tính theo phiên của tab trình duyệt; tải lại trang không hiện lại. Một ngày tính theo giờ Việt Nam. Ghi nhớ trên trình duyệt của khách." />
            <SelectField label="Thiết bị" {...register('device')} options={[
              { value: 'all', label: 'Máy tính và điện thoại' },
              { value: 'desktop', label: 'Chỉ máy tính' },
              { value: 'mobile', label: 'Chỉ điện thoại' },
            ]} />
          </div>
        </fieldset>

        <fieldset className={styles.section} disabled={busy}>
          <legend>Thời gian hiệu lực và trạng thái</legend>
          <p className={styles.help}>Giờ Việt Nam (UTC+7). Để trống thời gian bắt đầu hoặc kết thúc nếu không giới hạn.</p>
          <div className={styles.grid}>
            <TextField type="datetime-local" label="Bắt đầu (giờ Việt Nam)"
              error={errors.start_at?.message} {...register('start_at')} />
            <TextField type="datetime-local" label="Kết thúc (giờ Việt Nam)"
              error={errors.end_at?.message} {...register('end_at')} />
          </div>
          <CheckboxField label="Bật chương trình" {...register('is_active')} />
        </fieldset>
        <div className={styles.editorActions}>
          <Button type="button" variant="outline" disabled={busy}
            onClick={handleSubmit(showPreview)}><Eye size={16} aria-hidden /> Xem trước</Button>
          <div className={shared.buttonGroup}>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
            <Button type="submit" isLoading={save.isPending} disabled={upload.isPending}>Lưu chương trình</Button>
          </div>
        </div>
      </form>
    </Modal>
    {preview && <PromotionExperience promotion={preview} preview onDismiss={() => setPreview(null)} />}
  </>;
}
