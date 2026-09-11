'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SettingGroup } from '@/lib/api/settings';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { TextField, CheckboxField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

const TABS: Array<{ value: SettingGroup; label: string }> = [
  { value: 'general', label: 'Chung' },
  { value: 'theme', label: 'Giao diện' },
  { value: 'ai', label: 'AI Chatbot' },
];

/** Cac khoa duoc quan ly boi tung tab (khop voi noi dung muc 8.3 dau bai). */
const GROUP_FIELDS: Record<
  SettingGroup | 'analytics',
  Array<{ key: string; label: string; type: 'text' | 'checkbox' | 'color' | 'number' }>
> = {
  general: [
    { key: 'site_name', label: 'Tên site', type: 'text' },
    { key: 'site_logo', label: 'URL logo', type: 'text' },
    { key: 'hotline', label: 'Hotline mặc định', type: 'text' },
    { key: 'notify_email', label: 'Email nhận thông báo', type: 'text' },
    { key: 'recaptcha_site_key', label: 'reCAPTCHA Site Key (public)', type: 'text' },
    { key: 'footer_branch_name', label: 'Tên chi nhánh ở footer', type: 'text' },
    { key: 'footer_address', label: 'Địa chỉ ở footer', type: 'text' },
    { key: 'footer_email', label: 'Email hiển thị ở footer', type: 'text' },
    { key: 'footer_description', label: 'Mô tả liên hệ ở footer', type: 'text' },
    { key: 'footer_facebook_url', label: 'Link Facebook ở footer', type: 'text' },
  ],
  theme: [
    { key: 'theme_primary_color', label: 'Màu chủ đạo', type: 'color' },
    { key: 'home_banner', label: 'Banner trang chủ (URL ảnh)', type: 'text' },
  ],
  ai: [
    { key: 'ai_chatbot_enabled', label: 'Bật AI Chatbot', type: 'checkbox' },
    { key: 'ai_chatbot_system_prompt', label: 'System prompt', type: 'text' },
    { key: 'ai_daily_limit', label: 'Giới hạn câu hỏi/ngày', type: 'number' },
  ],
  analytics: [],
};

const SECTION_FIELDS = {
  'api-key': { group: 'general' as SettingGroup, keys: ['recaptcha_site_key'] },
  email: { group: 'general' as SettingGroup, keys: ['notify_email'] },
  'rate-limit': { group: 'ai' as SettingGroup, keys: ['ai_daily_limit'] },
};

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<SettingGroup>('general');
  const searchParams = useSearchParams();
  const section = searchParams.get('section') as keyof typeof SECTION_FIELDS | null;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => settingsApi.listAdmin(),
  });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (section && SECTION_FIELDS[section]) setTab(SECTION_FIELDS[section].group);
  }, [section]);

  useEffect(() => {
    if (!settings) return;
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    setValues(map);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (group: SettingGroup) => {
      const fields = GROUP_FIELDS[group];
      const items = fields.map((f) => ({ key: f.key, value: values[f.key] ?? '' }));
      return settingsApi.update(group, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      showToast('Đã lưu cài đặt thành công');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const fields =
    section && SECTION_FIELDS[section]
      ? GROUP_FIELDS[SECTION_FIELDS[section].group].filter((field) =>
          SECTION_FIELDS[section].keys.includes(field.key),
        )
      : GROUP_FIELDS[tab];
  const activeGroup = section && SECTION_FIELDS[section] ? SECTION_FIELDS[section].group : tab;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Cài đặt hệ thống</h1>

      {!section && <Tabs tabs={TABS} value={tab} onChange={(v) => setTab(v as SettingGroup)} />}

      <div className={styles.panel}>
        {fields.map((field) => {
          if (field.type === 'checkbox') {
            return (
              <CheckboxField
                key={field.key}
                label={field.label}
                checked={values[field.key] === 'true'}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.key]: e.target.checked ? 'true' : 'false',
                  }))
                }
              />
            );
          }
          return (
            <TextField
              key={field.key}
              type={field.type === 'color' ? 'color' : field.type === 'number' ? 'number' : 'text'}
              label={field.label}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          );
        })}

        <div className={styles.actions}>
          <Button
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate(activeGroup)}
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
