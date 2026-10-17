'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SettingGroup } from '@/lib/api/settings';
import { Tabs } from '@/components/ui/Tabs';
import { FormActions } from '@/components/ui/FormLayout';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextareaField, TextField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { ImageUploadField } from '@/components/shared/ImageUploadField';
import { mediaApi } from '@/lib/api/media';
import styles from './page.module.scss';
import { AboutBlocksEditor } from './AboutBlocksEditor';

type FieldType = 'text' | 'textarea' | 'checkbox' | 'color' | 'number' | 'url' | 'image';
type SettingField = { key: string; label: string; type: FieldType; hint?: string };
type Section = { group: SettingGroup; label: string; description: string; fields: SettingField[] };

const SECTIONS: Record<string, Section> = {
  site: {
    group: 'general',
    label: 'Thông tin website',
    description: 'Tên thương hiệu, logo và kênh liên hệ chính.',
    fields: [
      { key: 'site_name', label: 'Tên website', type: 'text' },
      { key: 'site_logo', label: 'Logo website', type: 'image' },
      {
        key: 'email_logo_url',
        label: 'Logo email',
        type: 'image',
        hint: 'Nên dùng ảnh PNG/JPG, logo trắng trên nền xanh.',
      },
      {
        key: 'hotline',
        label: 'Hotline mặc định',
        type: 'text',
        hint: 'Dùng khi chưa có giao dịch viên trong ca trực.',
      },
      { key: 'notify_email', label: 'Email nhận thông báo', type: 'text' },
      {
        key: 'recaptcha_site_key',
        label: 'reCAPTCHA Site Key',
        type: 'text',
        hint: 'Chỉ nhập public site key; secret key đặt trong .env.',
      },
    ],
  },
  footer: {
    group: 'general',
    label: 'Giới thiệu & footer',
    description: 'Nội dung giới thiệu và thông tin liên hệ hiển thị cuối trang.',
    fields: [
      { key: 'footer_about_title', label: 'Tiêu đề giới thiệu', type: 'text' },
      { key: 'footer_about_content', label: 'Nội dung giới thiệu', type: 'textarea' },
      { key: 'footer_branch_name', label: 'Tên chi nhánh', type: 'text' },
      { key: 'contact_address', label: 'Địa chỉ liên hệ', type: 'textarea' },
      { key: 'contact_email', label: 'Email liên hệ', type: 'text' },
      { key: 'working_hours', label: 'Giờ làm việc', type: 'text' },
      { key: 'footer_copyright', label: 'Dòng bản quyền', type: 'text' },
      {
        key: 'about_blocks',
        label: 'Các khối trang Giới thiệu (JSON, sắp xếp theo thứ tự mảng)',
        type: 'textarea',
        hint: 'Mỗi khối gồm type, enabled, title, content. Có thể bật/tắt và đổi thứ tự.',
      },
    ],
  },
  social: {
    group: 'general',
    label: 'Mạng xã hội & hỗ trợ',
    description: 'Các liên kết ngoài và lời nhắn bên cạnh nút gọi/Zalo.',
    fields: [
      { key: 'footer_facebook_url', label: 'Facebook URL', type: 'url' },
      { key: 'footer_zalo_url', label: 'Zalo URL', type: 'url' },
      { key: 'footer_youtube_url', label: 'YouTube URL', type: 'url' },
      { key: 'contact_widget_enabled', label: 'Hiện nút gọi điện và Zalo', type: 'checkbox' },
      {
        key: 'contact_widget_message',
        label: 'Lời nhắn hỗ trợ',
        type: 'textarea',
        hint: 'Ví dụ: Cần hỗ trợ? Nhắn Zalo hoặc gọi ngay.',
      },
      {
        key: 'ai_chatbot_quick_replies',
        label: 'Câu hỏi gợi ý trong widget chatbot',
        type: 'textarea',
        hint: 'Mảng JSON từ 1–8 câu, tối đa 100 ký tự/câu. Có thể thêm “Đăng ký SIM/gói cước”, “Giờ làm việc”.',
      },
    ],
  },
  appearance: {
    group: 'theme',
    label: 'Giao diện',
    description: 'Màu thương hiệu và banner trang chủ.',
    fields: [
      { key: 'theme_primary_color', label: 'Màu chủ đạo', type: 'color' },
      { key: 'home_banner', label: 'Banner trang chủ', type: 'image' },
    ],
  },
  campaigns: {
    group: 'general',
    label: 'Thanh thông báo',
    description: 'Nội dung hiển thị theo lịch trên trang công khai.',
    fields: [
      { key: 'announcement_text', label: 'Nội dung thanh thông báo', type: 'text' },
      { key: 'announcement_url', label: 'Liên kết thông báo', type: 'url' },
      { key: 'announcement_starts_at', label: 'Bắt đầu (ISO)', type: 'text' },
      { key: 'announcement_ends_at', label: 'Kết thúc (ISO)', type: 'text' },
    ],
  },
  analytics: {
    group: 'analytics',
    label: 'Đo lường',
    description: 'Mã theo dõi công khai cho website.',
    fields: [
      { key: 'ga4_id', label: 'Google Analytics 4 Measurement ID', type: 'text' },
      { key: 'fb_pixel_id', label: 'Meta Pixel ID', type: 'text' },
    ],
  },
};
const TABS: Array<{ value: SettingGroup; label: string }> = [
  { value: 'general', label: 'Thông tin & footer' },
  { value: 'theme', label: 'Giao diện' },
  { value: 'ai', label: 'AI Chatbot' },
  { value: 'analytics', label: 'Đo lường' },
];

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get('section') === 'chatbot') router.replace('/admin/ai-settings');
  }, [searchParams, router]);
  const sectionKey = searchParams.get('section');
  const selectedSection = sectionKey && SECTIONS[sectionKey] ? SECTIONS[sectionKey] : undefined;
  const [tab, setTab] = useState<SettingGroup>(selectedSection?.group ?? 'general');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: settingsApi.listAdmin,
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (selectedSection) setTab(selectedSection.group);
  }, [sectionKey, selectedSection]);
  useEffect(() => {
    if (settings) setValues(Object.fromEntries(settings.map((item) => [item.key, item.value])));
  }, [settings]);
  const fields = useMemo(
    () =>
      selectedSection?.fields ??
      Object.values(SECTIONS)
        .filter((item) => item.group === tab)
        .flatMap((item) => item.fields),
    [selectedSection, tab],
  );
  const activeGroup = selectedSection?.group ?? tab;
  async function uploadSettingImage(key: string, file: File | null) {
    if (!file) return;
    setUploadingFields((previous) => new Set(previous).add(key));
    try {
      const { url } = await mediaApi.upload(file);
      setValues((previous) => ({ ...previous, [key]: url }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải ảnh lên', 'error');
    } finally {
      setUploadingFields((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  }
  const saveMutation = useMutation({
    mutationFn: () =>
      settingsApi.update(
        activeGroup,
        fields.map((field) => ({ key: field.key, value: values[field.key] ?? (field.key === 'ai_chatbot_quick_replies' ? '["Gói cước nào rẻ?","Cửa hàng gần tôi","Tư vấn giải pháp doanh nghiệp"]' : '') })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      showToast('Đã lưu cài đặt thành công');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{selectedSection?.label ?? 'Cài đặt hệ thống'}</h1>
        {selectedSection && <p className={styles.description}>{selectedSection.description}</p>}
      </div>
      {!selectedSection && (
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={(value) =>
            value === 'ai' ? router.push('/admin/ai-settings') : setTab(value as SettingGroup)
          }
        />
      )}
      <div className={styles.panel}>
        {activeGroup === 'general' && (!selectedSection || sectionKey === 'campaigns') && (
          <p>Hộp quà và popup được cấu hình tại <Link href="/admin/promotions">Quản lý khuyến mại</Link>.</p>
        )}
        {fields.map((field) => {
          if (field.key === 'about_blocks')
            return (
              <AboutBlocksEditor
                key={field.key}
                value={values[field.key] ?? '[]'}
                onChange={(value) => setValues((previous) => ({ ...previous, [field.key]: value }))}
              />
            );
          if (field.type === 'checkbox')
            return (
              <CheckboxField
                key={field.key}
                label={field.label}
                checked={values[field.key] === 'true'}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [field.key]: event.target.checked ? 'true' : 'false',
                  }))
                }
              />
            );
          if (field.type === 'image')
            return (
              <ImageUploadField
                key={field.key}
                id={`setting-${field.key}`}
                label={field.label}
                hint={field.hint}
                value={values[field.key]}
                isUploading={uploadingFields.has(field.key)}
                onChange={(file) => uploadSettingImage(field.key, file)}
              />
            );
          const common = {
            label: field.label,
            hint: field.hint,
            value: values[field.key] ?? (field.key === 'ai_chatbot_quick_replies' ? '["Gói cước nào rẻ?","Cửa hàng gần tôi","Tư vấn giải pháp doanh nghiệp"]' : ''),
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setValues((previous) => ({ ...previous, [field.key]: event.target.value })),
          };
          return field.type === 'textarea' ? (
            <TextareaField key={field.key} {...common} />
          ) : (
            <TextField key={field.key} {...common} type={field.type} />
          );
        })}
        <FormActions>
          <Button
            isLoading={saveMutation.isPending}
            disabled={uploadingFields.size > 0}
            onClick={() => saveMutation.mutate()}
          >
            Lưu thay đổi
          </Button>
        </FormActions>
      </div>
    </div>
  );
}
