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
  const [playground, setPlayground] = useState('');
  const [reply, setReply] = useState('');
  const stats = useQuery({ queryKey: ['ai-stats'], queryFn: aiApi.stats });
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  const save = useMutation({
    mutationFn: () => aiApi.updateSettings({ ...form, api_key: apiKey || undefined }),
    onSuccess: (result) => {
      setForm(result);
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
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
  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    test.reset();
    setForm((previous) => ({ ...previous, [key]: value }));
  };
  const preview = useMutation({
    mutationFn: () => aiApi.playground(playground.trim()),
    onSuccess: (result) => setReply(result.reply),
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Cấu hình AI Chatbot</h1>
      <p className={styles.description}>
        RAG giúp trợ lý trả lời dựa trên dữ liệu thật của chi nhánh.
      </p>
      <div className={styles.panel}>
        <section>
          <h2>Thống kê 30 ngày</h2>
          <p>
            {stats.data?.conversations || 0} hội thoại · {stats.data?.input_tokens || 0} token vào ·{' '}
            {stats.data?.output_tokens || 0} token ra · chi phí ước tính $
            {Number(stats.data?.estimated_cost || 0).toFixed(4)} · độ trễ TB{' '}
            {Math.round(Number(stats.data?.avg_latency_ms || 0))} ms
          </p>
        </section>
        <label>
          Nhà cung cấp
          <select
            value={form.provider}
            onChange={(event) => {
              test.reset();
              setApiKey('');
              setForm((previous) => ({
                ...previous,
                provider: event.target.value as AiSettings['provider'],
                model: '',
                has_api_key: false,
                api_key_masked: null,
              }));
            }}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label>
          Model
          <input
            placeholder="Nhập tên model từ tài khoản nhà cung cấp"
            value={form.model}
            onChange={(event) => update('model', event.target.value)}
          />
        </label>
        <label>
          API key mới
          <input
            type="password"
            value={apiKey}
            placeholder={form.api_key_masked ?? 'Chưa cấu hình'}
            autoComplete="off"
            onChange={(event) => {
              test.reset();
              setApiKey(event.target.value);
            }}
          />
          <small>
            {form.has_api_key
              ? 'Đã có API key. Để trống nếu giữ nguyên; bấm Kiểm tra kết nối để xác nhận key còn hoạt động.'
              : 'Nhập API key của nhà cung cấp, kiểm tra kết nối rồi lưu cấu hình.'}
          </small>
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
          <Button
            variant="outline"
            disabled={!form.model.trim()}
            isLoading={test.isPending}
            onClick={() => test.mutate()}
          >
            Kiểm tra kết nối
          </Button>
          <Button
            disabled={!form.model.trim() || !form.system_prompt.trim()}
            isLoading={save.isPending}
            onClick={() => save.mutate()}
          >
            Lưu cấu hình
          </Button>
        </div>
        {test.isSuccess && <p role="status">✓ {test.data.message}</p>}
        {test.isError && (
          <p role="alert" style={{ color: 'var(--color-danger)' }}>
            {test.error.message}
          </p>
        )}
        <section>
          <h2>Thử hội thoại</h2>
          <p>Lưu cấu hình trước khi gửi câu hỏi thử.</p>
          <textarea
            aria-label="Câu hỏi thử chatbot"
            maxLength={2000}
            rows={3}
            value={playground}
            onChange={(event) => setPlayground(event.target.value)}
            placeholder="Nhập câu hỏi cho trợ lý AI"
          />
          <Button
            variant="outline"
            isLoading={preview.isPending}
            disabled={!playground.trim()}
            onClick={() => preview.mutate()}
          >
            Gửi thử
          </Button>
          {reply && (
            <p style={{ whiteSpace: 'pre-wrap' }} role="status">
              {reply}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
