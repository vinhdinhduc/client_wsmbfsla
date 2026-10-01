'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiApi,
  AiSettings,
  AiProfile,
  AiModel,
  AiProviderDefinition,
  AiPreview,
} from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import ProviderPicker, { ProviderAvatar } from './ProviderPicker';
import ModelPicker from './ModelPicker';
import styles from './page.module.scss';

const defaults: AiSettings = {
  provider: '',
  model: '',
  temperature: 0.2,
  max_tokens: 1024,
  top_p: 1,
  system_prompt: '',
  daily_limit: 20,
  rag_enabled: true,
  enabled: true,
  has_api_key: false,
  api_key_masked: null,
  prices: [],
  profiles: [],
};
type ChatMessage = { role: 'user' | 'assistant'; text: string; result?: AiPreview };
const keySlot = (p: AiProfile) =>
  `${p.id}:${p.provider}:${p.endpoint_id || ''}:${p.base_url || ''}`;
const target = (p: AiProfile) => `${keySlot(p)}:${p.host || ''}:${p.model}:${p.api_key || ''}`;
const modelTarget = (p: AiProfile) => `${keySlot(p)}:${p.host || ''}:${p.api_key || ''}`;
const money = (value: number | null | undefined) =>
  value == null ? 'Chưa có giá' : `$${Number(value).toFixed(6)}`;

export default function AiSettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const settings = useQuery({
    queryKey: ['ai-settings'],
    queryFn: aiApi.getSettings,
    refetchOnWindowFocus: false,
  });
  const registry = useQuery({ queryKey: ['ai-providers'], queryFn: aiApi.providers });
  const stats = useQuery({ queryKey: ['ai-stats'], queryFn: aiApi.stats });
  const [form, setForm] = useState<AiSettings>(defaults);
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeId, setActiveId] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [customTemperature, setCustomTemperature] = useState(false);
  const [customLength, setCustomLength] = useState(false);
  const [models, setModels] = useState<{ target: string; values: AiModel[] } | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [connection, setConnection] = useState<{
    target: string;
    message: string;
    error: boolean;
  } | null>(null);
  const [playground, setPlayground] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const baseline = useRef('');
  const keyDrafts = useRef<Record<string, string>>({});
  const generation = useRef(0);
  const currentTarget = useRef('');
  const currentModelTarget = useRef('');
  const initialized = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  function hydrate(data: AiSettings) {
    const next = data.profiles || [];
    setForm(data);
    setProfiles(next);
    setActiveId((id) => (next.some((p) => p.id === id) ? id : next[0]?.id || ''));
    baseline.current = JSON.stringify({ form: data, profiles: next });
    keyDrafts.current = {};
    setModels(null);
    setConnection(null);
    setMessages([]);
    setShowKey(false);
  }
  useEffect(() => {
    if (settings.data && !initialized.current) {
      hydrate(settings.data);
      initialized.current = true;
    }
  }, [settings.data]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);
  const profile = profiles.find((p) => p.id === activeId);
  const provider = registry.data?.find((p) => p.id === profile?.provider);
  const hostProviderId = provider?.endpoints.find(
    (e) => e.id === (profile?.endpoint_id || provider.defaultEndpoint),
  )?.hostProvider;
  const hostProvider = registry.data?.find((p) => p.id === hostProviderId) || provider;
  const signature = profile ? target(profile) : '';
  currentTarget.current = signature;
  const modelSignature = profile ? modelTarget(profile) : '';
  currentModelTarget.current = modelSignature;
  const staticModels =
    provider?.id === 'llama'
      ? (hostProvider?.models || []).filter((m) => /llama/i.test(m.id))
      : provider?.models || [];
  const availableModels = models?.target === modelSignature ? models.values : staticModels;
  const selectedModel = availableModels.find((m) => m.id === profile?.model);
  const dirty = JSON.stringify({ form, profiles }) !== baseline.current;
  function updateProfile(patch: Partial<AiProfile>) {
    setProfiles((items) => items.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  }
  function chooseProvider(p: AiProviderDefinition) {
    if (!profile) return;
    keyDrafts.current[keySlot(profile)] = profile.api_key || '';
    const saved = settings.data?.profiles?.find(
      (v) =>
        v.id === profile.id &&
        v.provider === p.id &&
        (v.endpoint_id || p.defaultEndpoint) === p.defaultEndpoint,
    );
    const next: AiProfile = {
      ...profile,
      provider: p.id,
      endpoint_id: saved ? saved.endpoint_id : p.defaultEndpoint,
      base_url: '',
      host: '',
      model: p.models.find((m) => m.recommended)?.id || p.models[0]?.id || '',
      api_key: '',
      has_api_key: saved?.has_api_key || false,
      api_key_masked: saved?.api_key_masked || null,
      api_key_error: saved?.api_key_error || null,
    };
    next.api_key = keyDrafts.current[keySlot(next)] || '';
    updateProfile(next);
    setExpanded(false);
    setShowKey(false);
  }
  function chooseEndpoint(id: string) {
    if (!profile || !provider) return;
    keyDrafts.current[keySlot(profile)] = profile.api_key || '';
    const route = provider.endpoints.find((e) => e.id === id);
    const host = registry.data?.find((p) => p.id === route?.hostProvider);
    const next = {
      ...profile,
      endpoint_id: id,
      model: host
        ? host.models.find((m) => /llama/i.test(m.id))?.id || ''
        : provider.models[0]?.id || '',
      has_api_key: false,
      api_key_masked: null,
      api_key_error: null,
      api_key: '',
    };
    const saved = settings.data?.profiles?.find((p) => keySlot(p) === keySlot(next));
    Object.assign(next, {
      has_api_key: saved?.has_api_key || false,
      api_key_masked: saved?.api_key_masked || null,
      api_key_error: saved?.api_key_error || null,
      api_key: keyDrafts.current[keySlot(next)] || '',
    });
    updateProfile(next);
  }
  function selectProfile(id: string) {
    setActiveId(id);
    setExpanded(false);
    setShowKey(false);
    setMessages([]);
    setCustomLength(false);
    setCustomTemperature(false);
  }
  function addProfile() {
    const p = registry.data?.[0];
    if (!p) return;
    const next: AiProfile = {
      id: crypto.randomUUID(),
      name: `Profile ${profiles.length + 1}`,
      provider: p.id,
      endpoint_id: p.defaultEndpoint,
      model: p.models.find((m) => m.recommended)?.id || p.models[0]?.id || '',
      temperature: 0.2,
      max_tokens: 1024,
      top_p: 1,
      enabled: true,
      has_api_key: false,
      api_key_masked: null,
    };
    setProfiles([...profiles, next]);
    selectProfile(next.id);
    setExpanded(true);
  }
  function moveProfile(delta: number) {
    const index = profiles.findIndex((p) => p.id === activeId);
    const next = [...profiles];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setProfiles(next);
  }
  const validKey = (p: AiProfile) =>
    !p.api_key ||
    (/^[\x21-\x7e]{1,500}$/.test(p.api_key) &&
      !p.api_key.startsWith('****') &&
      !p.api_key.startsWith('enc:'));
  const invalid =
    !form.system_prompt.trim() ||
    !Number.isInteger(form.daily_limit) ||
    form.daily_limit < 1 ||
    form.daily_limit > 10000 ||
    !profiles.length ||
    profiles.some(
      (p) =>
        !p.name.trim() ||
        !/^[a-zA-Z0-9~][a-zA-Z0-9._:/~-]{0,149}$/.test(p.model) ||
        !validKey(p) ||
        !Number.isInteger(p.max_tokens) ||
        p.max_tokens < 20 ||
        p.max_tokens > 4000 ||
        (p.provider === 'custom' && !/^https:\/\//.test(p.base_url || '')),
    );
  const save = useMutation({
    mutationFn: () => {
      const main = profiles.find((p) => p.enabled) || profiles[0];
      return aiApi.updateSettings({
        ...form,
        provider: main.provider,
        model: main.model,
        temperature: main.temperature,
        max_tokens: main.max_tokens,
        top_p: main.top_p,
        profiles,
      });
    },
    onSuccess: (data) => {
      hydrate(data);
      queryClient.setQueryData(['ai-settings'], data);
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      showToast('Đã lưu cấu hình AI');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const test = useMutation({
    mutationFn: async (p: AiProfile) => {
      const result = await aiApi.testConnection({ ...p, profile_id: p.id });
      return { result, target: target(p) };
    },
    onSuccess: ({ result, target }) => {
      setConnection({
        target,
        error: false,
        message: `${result.message} · ${result.latency_ms ?? '—'} ms · ${result.model || ''}`,
      });
    },
    onError: (error: Error, p) =>
      setConnection({ target: target(p), error: true, message: error.message }),
  });
  async function refreshModels() {
    if (!profile) return;
    const request = ++generation.current;
    const requestedTarget = modelSignature;
    setModelLoading(true);
    try {
      const result = await aiApi.models(profile);
      if (request === generation.current && currentModelTarget.current === requestedTarget) {
        setModels({ target: requestedTarget, values: result.models });
        showToast(result.message || `Đã lấy ${result.models.length} model`);
      }
    } catch (error) {
      if (currentModelTarget.current === requestedTarget)
        showToast(error instanceof Error ? error.message : 'Không tải được model', 'error');
    } finally {
      if (request === generation.current) setModelLoading(false);
    }
  }
  const preview = useMutation({
    mutationFn: async ({ message, p }: { message: string; p: AiProfile }) => ({
      result: await aiApi.playground(message, {
        profile: p,
        system_prompt: form.system_prompt,
        rag_enabled: form.rag_enabled,
        history: messages.slice(-12).map((m) => ({ role: m.role, content: m.text })),
      }),
      target: target(p),
    }),
    onMutate: ({ message }) => {
      setMessages((v) => [...v, { role: 'user', text: message }]);
      setPlayground('');
    },
    onSuccess: ({ result, target }) => {
      if (currentTarget.current === target)
        setMessages((v) => [...v, { role: 'assistant', text: result.reply, result }]);
      queryClient.invalidateQueries({ queryKey: ['ai-stats'] });
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  if (settings.isLoading || registry.isLoading)
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} role="status">
          Đang tải cấu hình AI…
        </div>
      </div>
    );
  if (settings.isError || registry.isError)
    return (
      <div className={styles.page}>
        <p role="alert">Không tải được cấu hình hoặc danh sách nhà cung cấp.</p>
        <Button
          onClick={() => {
            settings.refetch();
            registry.refetch();
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  const activeIndex = profiles.findIndex((p) => p.id === activeId);
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            <Sparkles size={15} /> TRỢ LÝ THÔNG MINH
          </span>
          <h1 className={styles.title}>AI Chatbot</h1>
          <p className={styles.description}>
            Chọn trí tuệ phù hợp. Tinh chỉnh cách trợ lý đồng hành cùng khách hàng.
          </p>
        </div>
        <span className={styles.status}>
          <span />
          {form.enabled ? 'Chatbot đang bật' : 'Chatbot đang tắt'}
        </span>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) save.mutate();
        }}
      >
        <fieldset disabled={save.isPending} className={styles.fieldset}>
          <section className={styles.panel} aria-label="Danh sách profile">
            <div className={styles.sectionHeading}>
              <div>
                <h2>Profile kết nối</h2>
                <p>Thử lần lượt các profile đang bật theo thứ tự từ trái sang phải.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addProfile}
                disabled={profiles.length >= 12}
              >
                <Plus size={16} /> Thêm profile
              </Button>
            </div>
            <div className={styles.profileTabs} role="tablist" aria-label="Profile AI">
              {profiles.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === activeId}
                  aria-controls="profile-editor"
                  id={`profile-${p.id}`}
                  onClick={() => selectProfile(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const next =
                        profiles[
                          (i + (e.key === 'ArrowRight' ? 1 : profiles.length - 1)) % profiles.length
                        ];
                      selectProfile(next.id);
                      document.getElementById(`profile-${next.id}`)?.focus();
                    }
                  }}
                >
                  <strong>{p.name}</strong>
                  <small>
                    {i === 0 ? 'Chính' : `Dự phòng #${i}`} · {p.enabled ? 'Đang bật' : 'Đã tắt'}
                  </small>
                </button>
              ))}
            </div>
          </section>
          {profile && provider && (
            <div
              id="profile-editor"
              role="tabpanel"
              aria-labelledby={`profile-${profile.id}`}
              className={styles.editor}
            >
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>
                      <Bot size={20} /> Nhà cung cấp & Model
                    </h2>
                    <p>Chọn nhà cung cấp, vùng kết nối và model cho profile này.</p>
                  </div>
                  <div className={styles.chips}>
                    <button
                      type="button"
                      aria-label="Đưa profile lên"
                      disabled={activeIndex === 0}
                      onClick={() => moveProfile(-1)}
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Đưa profile xuống"
                      disabled={activeIndex === profiles.length - 1}
                      onClick={() => moveProfile(1)}
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
                <div className={styles.grid}>
                  <label>
                    Tên profile
                    <input
                      maxLength={80}
                      required
                      value={profile.name}
                      onChange={(e) => updateProfile({ name: e.target.value })}
                    />
                  </label>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={profile.enabled}
                      onChange={(e) => updateProfile({ enabled: e.target.checked })}
                    />
                    Bật profile này
                  </label>
                </div>
                {!expanded ? (
                  <div className={styles.selectedProvider}>
                    <ProviderAvatar id={provider.id} name={provider.name} />
                    <div>
                      <small>Đang dùng</small>
                      <strong>{provider.name}</strong>
                      <span>{profile.model || 'Chưa chọn model'}</span>
                    </div>
                    <button type="button" onClick={() => setExpanded(true)}>
                      Đổi
                    </button>
                  </div>
                ) : (
                  <ProviderPicker
                    providers={registry.data || []}
                    profiles={profiles}
                    selected={profile.provider}
                    onSelect={chooseProvider}
                  />
                )}
                {provider.endpoints.length > 1 && (
                  <label>
                    Vùng / endpoint
                    <select
                      value={profile.endpoint_id || provider.defaultEndpoint}
                      onChange={(e) => chooseEndpoint(e.target.value)}
                    >
                      {provider.endpoints.map((endpoint) => (
                        <option key={endpoint.id} value={endpoint.id} disabled={endpoint.disabled}>
                          {endpoint.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {profile.provider === 'custom' ? (
                  <label>
                    URL API tùy chỉnh
                    <input
                      type="url"
                      required
                      value={profile.base_url || ''}
                      placeholder="https://api.example.com/v1"
                      onChange={(e) =>
                        updateProfile({
                          base_url: e.target.value,
                          has_api_key: false,
                          api_key_masked: null,
                        })
                      }
                    />
                  </label>
                ) : (
                  <small className={styles.endpoint}>
                    {
                      provider.endpoints.find(
                        (e) => e.id === (profile.endpoint_id || provider.defaultEndpoint),
                      )?.baseUrl
                    }
                  </small>
                )}
                {provider.extraFields.map((field) => (
                  <label key={field.id}>
                    {field.label}
                    <input
                      value={profile.host || ''}
                      maxLength={60}
                      placeholder={field.placeholder}
                      onChange={(e) => updateProfile({ host: e.target.value })}
                    />
                  </label>
                ))}
                <ModelPicker
                  key={`${profile.id}:${profile.provider}:${profile.endpoint_id}`}
                  models={availableModels}
                  value={profile.model}
                  loading={modelLoading}
                  onChange={(model) => updateProfile({ model })}
                />
                <div className={styles.inlineActions}>
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={modelLoading}
                    onClick={refreshModels}
                  >
                    <RefreshCw size={16} />
                    Lấy danh sách từ nhà cung cấp
                  </Button>
                  <small>Có thể nhập model mới bất cứ lúc nào.</small>
                </div>
                {selectedModel?.tools === false && (
                  <p className={styles.notice}>
                    Chatbot sẽ dùng chế độ tra cứu thay cho gọi công cụ.
                  </p>
                )}
                {selectedModel?.tools == null && (
                  <small>
                    Khả năng gọi công cụ của model này chưa được xác minh. Chatbot dùng tra cứu tri
                    thức hiện có.
                  </small>
                )}
              </section>
              <div className={styles.twoColumns}>
                <section className={styles.panel}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <h2>
                        <ShieldCheck size={20} /> Khóa API
                      </h2>
                      <p>Khóa được mã hóa và lưu riêng cho từng profile.</p>
                    </div>
                  </div>
                  <label htmlFor="provider-key">API key mới</label>
                  <div className={styles.keyInput}>
                    <input
                      id="provider-key"
                      type={showKey ? 'text' : 'password'}
                      autoComplete="new-password"
                      spellCheck={false}
                      maxLength={500}
                      value={profile.api_key || ''}
                      placeholder={profile.api_key_masked || hostProvider?.keyHelp.placeholder}
                      onChange={(e) => updateProfile({ api_key: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label={showKey ? 'Ẩn API key' : 'Hiện API key'}
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <small
                    className={
                      profile.api_key_error && !profile.api_key
                        ? styles.warning
                        : styles.description
                    }
                  >
                    {profile.api_key
                      ? 'Key mới đang nhập, chưa lưu'
                      : profile.api_key_error
                        ? 'Key cần nhập lại'
                        : profile.has_api_key
                          ? `Key đọc được · ${profile.api_key_masked}`
                          : 'Chưa có key — cần nhập API key'}
                  </small>
                  {!validKey(profile) && (
                    <p role="alert" className={styles.warning}>
                      Key không đúng định dạng. Kiểm tra khoảng trắng và ký tự đã nhập.
                    </p>
                  )}
                  <a href={hostProvider?.keyHelp.url} target="_blank" rel="noreferrer">
                    Lấy key tại {hostProvider?.name} ↗
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={test.isPending}
                    disabled={!profile.model || !validKey(profile)}
                    onClick={() => test.mutate(profile)}
                  >
                    Kiểm tra kết nối
                  </Button>
                  {connection?.target === signature && (
                    <p
                      role={connection.error ? 'alert' : 'status'}
                      className={connection.error ? styles.warning : styles.success}
                    >
                      {!connection.error && '✓ '}
                      {connection.message}
                    </p>
                  )}
                  <small>Kiểm tra kết nối là tùy chọn và có thể phát sinh phí.</small>
                </section>
                <section className={styles.panel}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <h2>
                        <Settings2 size={20} /> Tham số
                      </h2>
                      <p>Điều chỉnh độ linh hoạt và độ dài câu trả lời.</p>
                    </div>
                  </div>
                  <label>
                    Chế độ trả lời
                    <select
                      value={
                        customTemperature || ![0.2, 0.4, 0.7].includes(profile.temperature)
                          ? 'custom'
                          : profile.temperature
                      }
                      onChange={(e) => {
                        setCustomTemperature(e.target.value === 'custom');
                        if (e.target.value !== 'custom')
                          updateProfile({ temperature: Number(e.target.value) });
                      }}
                    >
                      <option value="0.2">Chính xác (0.2)</option>
                      <option value="0.4">Cân bằng (0.4)</option>
                      <option value="0.7">Sáng tạo (0.7)</option>
                      <option value="custom">Tùy chỉnh</option>
                    </select>
                  </label>
                  {(customTemperature || ![0.2, 0.4, 0.7].includes(profile.temperature)) && (
                    <label>
                      Độ sáng tạo: {profile.temperature.toFixed(1)}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={profile.temperature}
                        onChange={(e) => updateProfile({ temperature: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  <label>
                    Độ dài tối đa
                    <select
                      value={
                        customLength || ![512, 1024, 2048].includes(profile.max_tokens)
                          ? 'custom'
                          : profile.max_tokens
                      }
                      onChange={(e) => {
                        setCustomLength(e.target.value === 'custom');
                        if (e.target.value !== 'custom')
                          updateProfile({ max_tokens: Number(e.target.value) });
                      }}
                    >
                      <option value="512">Ngắn · 512 token</option>
                      <option value="1024">Vừa · 1024 token</option>
                      <option value="2048">Dài · 2048 token</option>
                      <option value="custom">Tùy chỉnh</option>
                    </select>
                  </label>
                  {(customLength || ![512, 1024, 2048].includes(profile.max_tokens)) && (
                    <label>
                      Số token tối đa
                      <input
                        type="number"
                        min="20"
                        max="4000"
                        step="1"
                        required
                        value={profile.max_tokens || ''}
                        onChange={(e) => updateProfile({ max_tokens: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {selectedModel?.maxOutputTokens &&
                  profile.max_tokens > selectedModel.maxOutputTokens ? (
                    <p className={styles.warning}>
                      Vượt giới hạn {selectedModel.maxOutputTokens.toLocaleString('vi-VN')} token
                      đầu ra của model.
                    </p>
                  ) : null}
                </section>
              </div>
            </div>
          )}
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Hành vi</h2>
                <p>Hướng dẫn chung áp dụng cho mọi profile của chatbot.</p>
              </div>
            </div>
            <div className={styles.grid}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                />
                Bật AI Chatbot
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={form.rag_enabled}
                  onChange={(e) => setForm({ ...form, rag_enabled: e.target.checked })}
                />
                Sử dụng dữ liệu RAG
              </label>
            </div>
            <label>
              Chỉ dẫn cho trợ lý
              <textarea
                rows={5}
                required
                maxLength={10000}
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              />
            </label>
            <label>
              Giới hạn câu hỏi/ngày
              <input
                type="number"
                min="1"
                max="10000"
                required
                step="1"
                value={form.daily_limit || ''}
                onChange={(e) => setForm({ ...form, daily_limit: Number(e.target.value) })}
              />
            </label>
          </section>
          <footer className={styles.saveBar}>
            <span>
              {dirty ? (
                '● Có thay đổi chưa lưu'
              ) : (
                <>
                  <Check size={16} /> Đã đồng bộ cấu hình
                </>
              )}
            </span>
            <div className={styles.actions}>
              <Button
                type="button"
                variant="outline"
                disabled={!dirty}
                onClick={() => {
                  if (settings.data) hydrate(settings.data);
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={invalid || !dirty} isLoading={save.isPending}>
                Lưu cấu hình
              </Button>
            </div>
          </footer>
        </fieldset>
      </form>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>
              <Sparkles size={20} /> Thử hội thoại
            </h2>
            <p>Dùng profile và cấu hình đang chỉnh, chưa cần lưu.</p>
          </div>
          <span className={styles.badge}>{profile?.model || 'Chưa chọn model'}</span>
        </div>
        <div className={styles.chat} role="log" aria-label="Lịch sử hội thoại thử">
          {!messages.length && (
            <div className={styles.chatEmpty}>
              <Bot size={32} />
              <strong>Trò chuyện thử với trợ lý</strong>
              <span>Gửi một câu hỏi thường gặp của khách hàng để kiểm tra cách trả lời.</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? styles.userMessage : styles.aiMessage}>
              <div>
                <p>{m.text}</p>
                {m.result && (
                  <small>
                    {m.result.model} · {m.result.usage?.inputTokens ?? '—'} token vào ·{' '}
                    {m.result.usage?.outputTokens ?? '—'} token ra ·{' '}
                    {money(m.result.estimated_cost)}
                  </small>
                )}
              </div>
            </div>
          ))}
          {preview.isPending && <p role="status">AI đang trả lời…</p>}
          <div ref={chatEnd} />
        </div>
        <label>
          Câu hỏi thử chatbot
          <textarea
            rows={3}
            maxLength={2000}
            value={playground}
            onChange={(e) => setPlayground(e.target.value)}
            placeholder="Ví dụ: Tôi muốn tìm gói cước data theo tháng…"
          />
        </label>
        <div className={styles.inlineActions}>
          <small>Lượt thử có thể phát sinh phí từ nhà cung cấp.</small>
          <Button
            variant="outline"
            isLoading={preview.isPending}
            disabled={!profile || playground.trim().length < 2 || invalid}
            onClick={() => profile && preview.mutate({ message: playground.trim(), p: profile })}
          >
            Gửi thử
          </Button>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Thống kê 30 ngày</h2>
            <p>Theo dõi mức sử dụng và chi phí ước tính của trợ lý.</p>
          </div>
        </div>
        {stats.isError ? (
          <p role="alert">Không tải được thống kê.</p>
        ) : (
          <>
            <div className={styles.stats}>
              {[
                { label: 'Số hội thoại', value: stats.data?.conversations },
                { label: 'Token vào', value: stats.data?.input_tokens },
                { label: 'Token ra', value: stats.data?.output_tokens },
                {
                  label: 'Chi phí ước tính',
                  value: stats.data ? money(stats.data.estimated_cost) : '…',
                },
              ].map((s) => (
                <div className={styles.stat} key={s.label}>
                  <small>{s.label}</small>
                  <strong>
                    {s.value == null
                      ? '…'
                      : typeof s.value === 'number'
                        ? s.value.toLocaleString('vi-VN')
                        : s.value}
                  </strong>
                </div>
              ))}
            </div>
            {!!stats.data?.daily?.length && (
              <div className={styles.dailyChart} role="img" aria-label="Số lần gọi AI theo ngày">
                {stats.data.daily.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.calls} lần gọi, ${d.errors} lỗi, ${money(d.cost)}`}
                  >
                    <span
                      style={{
                        height: `${Math.max(3, (Number(d.calls) / Math.max(...stats.data!.daily!.map((v) => Number(v.calls)))) * 100)}%`,
                      }}
                    />
                    <small>{String(d.day).slice(5, 10)}</small>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.tableWrap}>
              <table>
                <caption>Chi phí và lỗi theo model</caption>
                <thead>
                  <tr>
                    <th scope="col">Nhà cung cấp / Model</th>
                    <th scope="col">Lần gọi</th>
                    <th scope="col">Lỗi</th>
                    <th scope="col">Chi phí</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.data?.models?.map((m) => (
                    <tr key={`${m.provider}:${m.model}`}>
                      <th scope="row">
                        {registry.data?.find((p) => p.id === m.provider)?.name || m.provider}
                        <small>{m.model}</small>
                      </th>
                      <td>{m.calls}</td>
                      <td>{m.errors}</td>
                      <td>
                        {money(m.cost)}
                        {Number(m.cost_missing) > 0 && (
                          <small>{m.cost_missing} lượt chưa có giá</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!stats.data?.models?.length && <p>Chưa có dữ liệu theo model.</p>}
            </div>
            {!!Number(stats.data?.cost_missing) && (
              <p className={styles.notice}>
                {stats.data?.cost_missing} lượt chưa tính được chi phí do thiếu token hoặc bảng giá.
                Tổng hiển thị chỉ gồm các lượt đã có giá.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
