'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, AiSettings } from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

const defaults: AiSettings = {
  provider: 'anthropic',
  model: 'claude-haiku-4-5',
  temperature: 0.4,
  max_tokens: 500,
  top_p: 1,
  system_prompt: '',
  daily_limit: 20,
  rag_enabled: true,
  enabled: true,
  has_api_key: false,
  api_key_masked: null,
};

export default function AiSettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ['ai-settings'], queryFn: aiApi.getSettings });
  const [form, setForm] = useState(defaults);
  const [apiKey, setApiKey] = useState('');
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  const save = useMutation({
    mutationFn: () => aiApi.updateSettings({ ...form, api_key: apiKey || undefined }),
    onSuccess: (result) => {
      setForm(result);
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      showToast('Đã lưu cấu hình AI');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const test = useMutation({
    mutationFn: () =>
      aiApi.testConnection({
        provider: form.provider,
        model: form.model,
        api_key: apiKey || undefined,
      }),
    onSuccess: (result) => showToast(result.message),
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Cấu hình AI Chatbot</h1>
      <p className={styles.description}>
        RAG giúp trợ lý trả lời dựa trên dữ liệu thật của chi nhánh.
      </p>
      <div className={styles.panel}>
        <label>
          Nhà cung cấp
          <select
            value={form.provider}
            onChange={(event) => update('provider', event.target.value as AiSettings['provider'])}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label>
          Model
          <input value={form.model} onChange={(event) => update('model', event.target.value)} />
        </label>
        <label>
          API key mới
          <input
            type="password"
            value={apiKey}
            placeholder={form.api_key_masked ?? 'Chưa cấu hình'}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <div className={styles.grid}>
          <label>
            Temperature
            <input
              type="number"
              min="0"
              max="1"
              step=".1"
              value={form.temperature}
              onChange={(event) => update('temperature', Number(event.target.value))}
            />
          </label>
          <label>
            Max tokens
            <input
              type="number"
              min="20"
              max="4000"
              value={form.max_tokens}
              onChange={(event) => update('max_tokens', Number(event.target.value))}
            />
          </label>
          <label>
            Giới hạn/ngày
            <input
              type="number"
              min="1"
              value={form.daily_limit}
              onChange={(event) => update('daily_limit', Number(event.target.value))}
            />
          </label>
        </div>
        <label>
          System prompt
          <textarea
            rows={8}
            value={form.system_prompt}
            onChange={(event) => update('system_prompt', event.target.value)}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
          />{' '}
          Bật chatbot
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.rag_enabled}
            onChange={(event) => update('rag_enabled', event.target.checked)}
          />{' '}
          Sử dụng dữ liệu RAG
        </label>
        <div className={styles.actions}>
          <Button variant="outline" isLoading={test.isPending} onClick={() => test.mutate()}>
            Kiểm tra kết nối
          </Button>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>
            Lưu cấu hình
          </Button>
        </div>
      </div>
    </div>
  );
}
