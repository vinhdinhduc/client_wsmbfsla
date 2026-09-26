import { apiFetch } from './client';

export interface AiSettings {
  provider: 'openai' | 'anthropic' | 'gemini';
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
  created_at: string;
}

export const aiApi = {
  getSettings: () => apiFetch<AiSettings>('/admin/ai-settings'),
  updateSettings: (body: Partial<AiSettings> & { api_key?: string }) =>
    apiFetch<AiSettings>('/admin/ai-settings', { method: 'PUT', body }),
  testConnection: (body: { provider: string; model: string; api_key?: string }) =>
    apiFetch<{ ok: boolean; message: string }>('/admin/ai-settings/test-connection', {
      method: 'POST',
      body,
    }),
  listKnowledge: (search?: string) =>
    apiFetch<AiKnowledgeEntry[]>('/admin/ai-knowledge', { params: { search } }),
  createKnowledge: (body: Pick<AiKnowledgeEntry, 'title' | 'content' | 'tags' | 'status'>) =>
    apiFetch<AiKnowledgeEntry>('/admin/ai-knowledge', { method: 'POST', body }),
  updateKnowledge: (
    id: number,
    body: Partial<Pick<AiKnowledgeEntry, 'title' | 'content' | 'tags' | 'status'>>,
  ) => apiFetch<AiKnowledgeEntry>(`/admin/ai-knowledge/${id}`, { method: 'PUT', body }),
  deleteKnowledge: (id: number) =>
    apiFetch<null>(`/admin/ai-knowledge/${id}`, { method: 'DELETE' }),
  listLogs: (flagged?: boolean) =>
    apiFetch<AiChatLog[]>('/admin/ai-chat-logs', { params: { flagged } }),
  updateLog: (id: number, body: { flagged_for_review?: boolean; was_helpful?: boolean | null }) =>
    apiFetch<AiChatLog>(`/admin/ai-chat-logs/${id}`, { method: 'PUT', body }),
  stats: () => apiFetch<{ conversations:number;input_tokens:number;output_tokens:number;estimated_cost:number;avg_latency_ms:number;flagged:number }>('/admin/ai-stats'),
  playground: (message:string) => apiFetch<{reply:string}>('/admin/ai-playground',{method:'POST',body:{message}}),
};
