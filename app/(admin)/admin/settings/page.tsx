'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SettingGroup } from '@/lib/api/settings';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { TextField, CheckboxField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';

const TABS: Array<{ value: SettingGroup; label: string }> = [
  { value: 'general', label: 'Chung' },
  { value: 'theme', label: 'Giao diện' },
  { value: 'ai', label: 'AI Chatbot' },
];

/** Cac khoa duoc quan ly boi tung tab (khop voi noi dung muc 8.3 dau bai). */
const GROUP_FIELDS: Record<SettingGroup | 'analytics', Array<{ key: string; label: string; type: 'text' | 'checkbox' | 'color' | 'number' }>> = {
  general: [
    { key: 'site_name', label: 'Tên site', type: 'text' },
    { key: 'site_logo', label: 'URL logo', type: 'text' },
    { key: 'hotline', label: 'Hotline mặc định', type: 'text' },
  ],
  theme: [
    { key: 'theme_primary_color', label: 'Màu chủ đạo', type: 'color' },
    { key: 'home_banner', label: 'Banner trang chủ (URL ảnh)', type: 'text' },
  ],
  ai: [
    { key: 'ai_chatbot_enabled', label: 'Bật AI Chatbot', type: 'checkbox' },
    { key: 'ai_chatbot_system_prompt', label: 'System prompt', type: 'text' },
    { key: 'ai_chatbot_daily_limit', label: 'Giới hạn câu hỏi/ngày', type: 'number' },
  ],
  analytics: [],
};

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<SettingGroup>('general');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: () => settingsApi.listAdmin() });
  const [values, setValues] = useState<Record<string, string>>({});

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

  const fields = GROUP_FIELDS[tab];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-neutral-900">Cài đặt hệ thống</h1>

      <Tabs tabs={TABS} value={tab} onChange={(v) => setTab(v as SettingGroup)} />

      <div className="max-w-xl space-y-4 rounded-lg border border-neutral-100 bg-white p-5">
        {fields.map((field) => {
          if (field.type === 'checkbox') {
            return (
              <CheckboxField
                key={field.key}
                label={field.label}
                checked={values[field.key] === 'true'}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.checked ? 'true' : 'false' }))}
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

        <div className="flex justify-end pt-2">
          <Button isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate(tab)}>
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
