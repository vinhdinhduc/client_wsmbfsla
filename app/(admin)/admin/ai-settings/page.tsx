'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, AiSettings } from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  Bot,
  User,
  MessagesSquare,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
} from 'lucide-react';
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: aiApi.getSettings,
  });
  const [form, setForm] = useState(defaults);
  const [apiKey, setApiKey] = useState('');
  const [playground, setPlayground] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);
  const stats = useQuery({ queryKey: ['ai-stats'], queryFn: aiApi.stats, enabled: advanced });
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
    mutationFn: (message: string) => aiApi.playground(message),
    onMutate: (message) => {
      setMessages((previous) => [...previous, { role: 'user', text: message }]);
      setPlayground('');
    },
    onSuccess: (result) =>
      setMessages((previous) => [...previous, { role: 'assistant', text: result.reply }]),
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  if (isLoading) return <p role="status">Đang tải cấu hình…</p>;
  if (isError) return <p role="alert">Không tải được cấu hình. Vui lòng tải lại trang.</p>;
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>AI Chatbot</h1>
        <label className={styles.check}>
          <input
            type="checkbox"
            role="switch"
            checked={advanced}
            onChange={(event) => setAdvanced(event.target.checked)}
          />
          Chế độ nâng cao
        </label>
      </div>
      <form
        className={styles.panel}
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
          />
          Bật AI Chatbot
        </label>
        <label>
          System prompt
          <textarea
            required
            maxLength={10000}
            rows={8}
            value={form.system_prompt}
            onChange={(event) => update('system_prompt', event.target.value)}
          />
        </label>
        <label>
          Giới hạn câu hỏi/ngày
          <input
            required
            type="number"
            min="1"
            max="10000"
            step="1"
            value={form.daily_limit || ''}
            onChange={(event) => update('daily_limit', Number(event.target.value))}
          />
        </label>
        {advanced && (
          <>
            <section>
              <h2>Thống kê 30 ngày</h2>
              {stats.isError ? (
                <p role="alert">Không tải được thống kê.</p>
              ) : (
                <div className={styles.stats}>
                  {[
                    {
                      label: 'Số hội thoại',
                      value: stats.data?.conversations,
                      Icon: MessagesSquare,
                    },
                    { label: 'Token vào', value: stats.data?.input_tokens, Icon: ArrowDownToLine },
                    { label: 'Token ra', value: stats.data?.output_tokens, Icon: ArrowUpFromLine },
                    {
                      label: 'Chi phí ước tính',
                      value: stats.data
                        ? `$${Number(stats.data.estimated_cost).toFixed(4)}`
                        : undefined,
                      Icon: DollarSign,
                    },
                  ].map(({ label, value, Icon }) => (
                    <div className={styles.stat} key={label}>
                      <Icon aria-hidden="true" />
                      <strong>
                        {value === undefined
                          ? '…'
                          : typeof value === 'number'
                            ? value.toLocaleString('vi-VN')
                            : value}
                      </strong>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
              )}
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
                required
                maxLength={150}
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
                Temperature: {form.temperature.toFixed(1)}
                <input
                  type="range"
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
                  required
                  step="1"
                  placeholder="20–4000 token"
                  value={form.max_tokens || ''}
                  onChange={(event) => update('max_tokens', Number(event.target.value))}
                />
              </label>
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={form.rag_enabled}
                onChange={(event) => update('rag_enabled', event.target.checked)}
              />{' '}
              Sử dụng dữ liệu RAG
            </label>
          </>
        )}
        <div className={styles.actions}>
          {advanced && (
            <Button
              type="button"
              variant="outline"
              disabled={!form.model.trim()}
              isLoading={test.isPending}
              onClick={() => test.mutate()}
            >
              Kiểm tra kết nối
            </Button>
          )}
          <Button
            type="submit"
            disabled={
              !form.model.trim() ||
              !form.system_prompt.trim() ||
              !Number.isInteger(form.daily_limit) ||
              form.daily_limit < 1 ||
              form.daily_limit > 10000 ||
              !Number.isInteger(form.max_tokens) ||
              form.max_tokens < 20 ||
              form.max_tokens > 4000
            }
            isLoading={save.isPending}
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
      </form>
      {advanced && (
        <section className={styles.panel}>
          <h2>Thử hội thoại</h2>
          <p>Lưu cấu hình trước khi gửi câu hỏi thử.</p>
          <div className={styles.chat} role="log" aria-label="Lịch sử hội thoại thử">
            {messages.length === 0 && <p>Gửi câu hỏi để bắt đầu cuộc trò chuyện.</p>}
            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === 'user' ? styles.userMessage : styles.aiMessage}
              >
                {message.role === 'user' ? <User aria-label="Bạn" /> : <Bot aria-label="AI" />}
                <p>{message.text}</p>
              </div>
            ))}
            {preview.isPending && <p role="status">AI đang trả lời…</p>}
            {preview.isError && (
              <p role="alert">Gửi thất bại. Vui lòng nhập lại câu hỏi để thử lại.</p>
            )}
            <div ref={chatEnd} />
          </div>
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
            onClick={() => preview.mutate(playground.trim())}
          >
            Gửi thử
          </Button>
        </section>
      )}
    </div>
  );
}
