import { apiFetch } from './client';

export interface AiPrice {
  provider: string;
  model: string;
  input_per_million: number;
  output_per_million: number;
}

export interface AiSettings {
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  system_prompt: string;
  daily_limit: number;
  rag_enabled: boolean;
  enabled: boolean;
  has_api_key: boolean;
  api_key_masked: string | null;
  api_key_error?: string | null;
  prices?: AiPrice[];
  profiles?: AiProfile[];
  log_retention_days?: number;
}

export interface AiProfile {
  id: string;
  name: string;
  provider: string;
  model: string;
  endpoint_id?: string;
  base_url?: string;
  host?: string;
  enabled: boolean;
  temperature: number;
  max_tokens: number;
  top_p: number;
  api_key?: string;
  has_api_key: boolean;
  api_key_masked: string | null;
  api_key_error?: string | null;
}
export interface AiModel {
  id: string;
  label: string;
  group: 'recommended' | 'fast' | 'powerful' | 'other';
  contextWindow: number | null;
  maxOutputTokens: number | null;
  priceInPer1M: number | null;
  priceOutPer1M: number | null;
  tools: boolean | null;
  streaming: boolean | null;
  recommended: boolean;
  deprecated: boolean;
  verified: boolean;
  source: 'static' | 'api';
}
export interface AiProviderDefinition {
  id: string;
  name: string;
  tagline: string;
  category: 'native' | 'openai_compatible' | 'aggregator' | 'fast_inference';
  endpoints: Array<{
    id: string;
    label: string;
    baseUrl: string;
    verified: boolean;
    disabled?: boolean;
    hostProvider?: string;
  }>;
  defaultEndpoint: string;
  keyHelp: { url: string; placeholder: string; regex?: string };
  capabilities: {
    tools: boolean | null;
    streaming: boolean | null;
    vision: boolean | null;
    jsonMode: boolean | null;
  };
  models: AiModel[];
  extraFields: Array<{ id: string; label: string; placeholder: string }>;
  verified: boolean;
  checkedAt: string;
  sources: string[];
  modelListPath?: string;
}
export interface AiPreview {
  reply: string;
  model?: string;
  usage?: { inputTokens: number | null; outputTokens: number | null };
  estimated_cost?: number | null;
  latency_ms?: number;
}

export interface AiKnowledgeEntry {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  status: 'active' | 'inactive';
  updated_at: string;
}

export interface AiChatLog {
  id: number;
  session_id: string;
  user_message: string;
  ai_response: string;
  flagged_for_review: boolean;
  was_helpful: boolean | null;
  feedback_comment?: string | null;
  created_at: string;
  review_status?: AiLogReviewStatus;
  internal_note?: string | null;
  knowledge_entry_id?: number | null;
  question_key?: string;
  provider?: string | null;
  model?: string | null;
  latency_ms?: number | null;
  is_unanswered?: boolean;
  has_contact_info?: boolean;
  diagnostics?: {
    answer_status?: 'answered' | 'unavailable' | 'restricted';
    rag_enabled?: boolean;
    retrieval_mode?: 'keyword';
    retrieved_count?: number;
    sources?: Array<{ type: string; id?: number; title: string; href?: string }>;
    max_score?: number | null;
    fallback_reason?: string | null;
  } | null;
}

export type AiLogReviewStatus = 'new' | 'needs_knowledge' | 'resolved' | 'ignored';
export type AiLogTab = 'all' | 'unanswered' | 'needs_knowledge' | 'resolved' | 'disliked';
export interface AiLogFilters {
  mode?: 'conversations' | 'messages';
  search?: string;
  status?: AiLogReviewStatus | '';
  from?: string;
  to?: string;
  unanswered?: boolean;
  feedback?: 'positive' | 'negative' | '';
  sort?: 'newest' | 'oldest' | 'frequent';
  tab?: AiLogTab;
}
export interface AiLogConversation {
  session_id: string;
  started_at: string;
  last_at: string;
  message_count: number;
  first_question: string;
  has_unanswered: boolean;
  has_contact_info: boolean;
}
export interface AiLogPage {
  items: Array<AiChatLog | AiLogConversation>;
  total: number;
  page: number;
  page_size: number;
  mode: 'conversations' | 'messages';
  tab_counts: Record<AiLogTab, number>;
  snapshot_max_id: number;
  legacy?: boolean;
}
export interface AiLogSummary {
  conversations: number;
  total_messages: number;
  answered_rate: number;
  unanswered: number;
  dislikes: number;
  retention_days: number;
  daily: Array<{ day: string; total: number; unanswered: number }>;
  faq: Array<{ question_key: string; question: string; count: number; latest_at: string }>;
}
export interface AiLogSelection {
  ids?: number[];
  session_ids?: string[];
  filter?: AiLogFilters;
  snapshot_max_id?: number;
  cleanup?: { older_than_days?: 30 | 60 | 90; status?: 'resolved'; answered?: boolean; all?: boolean };
}

export const aiApi = {
  providers: () => apiFetch<AiProviderDefinition[]>('/admin/ai/providers'),
  models: (profile: AiProfile) =>
    apiFetch<{ models: AiModel[]; source: string; message?: string }>(
      `/admin/ai/providers/${encodeURIComponent(profile.provider)}/models`,
      {
        method: 'POST',
        body: { ...profile, profile_id: profile.id },
      },
    ),
  getSettings: () => apiFetch<AiSettings>('/admin/ai-settings'),
  updateSettings: (body: Partial<AiSettings> & { api_key?: string }) =>
    apiFetch<AiSettings>('/admin/ai-settings', { method: 'PUT', body }),
  testConnection: (body: {
    provider: string;
    model: string;
    api_key?: string;
    profile_id?: string;
    endpoint_id?: string;
    base_url?: string;
    host?: string;
  }) =>
    apiFetch<{ ok: boolean; message: string; latency_ms?: number; model?: string }>(
      '/admin/ai-settings/test-connection',
      {
        method: 'POST',
        body,
      },
    ),
  listKnowledge: (search?: string) =>
    apiFetch<AiKnowledgeEntry[]>('/admin/ai-knowledge', { params: { search } }),
  createKnowledge: (body: Pick<AiKnowledgeEntry, 'title' | 'content' | 'tags' | 'status'> & { source_log_ids?: number[]; source_question_key?: string }) =>
    apiFetch<AiKnowledgeEntry>('/admin/ai-knowledge', { method: 'POST', body }),
  updateKnowledge: (
    id: number,
    body: Partial<Pick<AiKnowledgeEntry, 'title' | 'content' | 'tags' | 'status'>>,
  ) => apiFetch<AiKnowledgeEntry>(`/admin/ai-knowledge/${id}`, { method: 'PUT', body }),
  deleteKnowledge: (id: number) =>
    apiFetch<null>(`/admin/ai-knowledge/${id}`, { method: 'DELETE' }),
  listLogs: (flagged?: boolean) =>
    apiFetch<AiChatLog[]>('/admin/ai-chat-logs', { params: { flagged } }),
  queryLogs: (filters: AiLogFilters & { page: number; page_size: number }, signal?: AbortSignal) =>
    apiFetch<AiLogPage | AiChatLog[]>('/admin/ai-chat-logs', { params: { ...filters }, signal }),
  logSummary: (filters: AiLogFilters, signal?: AbortSignal) =>
    apiFetch<AiLogSummary>('/admin/ai-chat-logs/summary', { params: { ...filters }, signal }),
  logSession: (sessionId: string, page = 1, signal?: AbortSignal) =>
    apiFetch<{ items: AiChatLog[]; total: number; page: number; page_size: number }>(
      `/admin/ai-chat-logs/sessions/${encodeURIComponent(sessionId)}`, { params: { page, page_size: 100 }, signal }),
  revealLog: (id: number) => apiFetch<AiChatLog>(`/admin/ai-chat-logs/${id}/reveal`, { method: 'POST' }),
  bulkLogs: (body: AiLogSelection & { action: 'preview_delete' | 'delete' | 'resolve'; expected_count?: number; confirmation?: string }) =>
    apiFetch<{ count: number; affected?: number; batch_id?: string; requires_confirmation?: boolean }>('/admin/ai-chat-logs/bulk', { method: 'POST', body }),
  deleteLog: (id: number) => apiFetch<{ affected: number; batch_id: string }>(`/admin/ai-chat-logs/${id}`, { method: 'DELETE' }),
  deleteLogSession: (sessionId: string) => apiFetch<{ affected: number; batch_id: string }>(`/admin/ai-chat-logs/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  restoreLogs: (batch_id: string) => apiFetch<{ affected: number }>('/admin/ai-chat-logs/restore', { method: 'POST', body: { batch_id } }),
  exportLogs: (selection: AiLogSelection, format: 'csv' | 'xlsx' = 'csv') =>
    apiFetch<Blob>('/admin/ai-chat-logs/export', { method: 'POST', body: { ...selection, format } }),
  updateLog: (id: number, body: { flagged_for_review?: boolean; was_helpful?: boolean | null; review_status?: AiLogReviewStatus; internal_note?: string }) =>
    apiFetch<AiChatLog>(`/admin/ai-chat-logs/${id}`, { method: 'PUT', body }),
  stats: () =>
    apiFetch<{
      conversations: number;
      input_tokens: number;
      output_tokens: number;
      estimated_cost: number;
      avg_latency_ms: number;
      flagged: number;
      provider_calls: number;
      failed_calls: number;
      usage_missing: number;
      cost_missing: number;
      daily?: Array<{ day: string; calls: number; cost: number; errors: number }>;
      models?: Array<{
        provider: string;
        model: string;
        calls: number;
        cost: number;
        errors: number;
        cost_missing: number;
      }>;
    }>('/admin/ai-stats'),
  playground: (
    message: string,
    draft?: {
      profile: AiProfile;
      system_prompt: string;
      rag_enabled: boolean;
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ) => apiFetch<AiPreview>('/admin/ai-playground', { method: 'POST', body: { message, ...draft } }),
};
