import { apiFetch } from './client';

export interface ChatSource {
  title: string;
  href: string;
}
export interface ChatAnswer {
  answer_id?: number;
  reply: string;
  status?: 'answered' | 'unavailable' | 'limited' | 'restricted';
  sources?: ChatSource[];
}

export const chatbotApi = {
  sendMessage: (sessionId: string, message: string, signal?: AbortSignal) =>
    apiFetch<ChatAnswer>('/public/chat', {
      method: 'POST',
      body: { session_id: sessionId, message },
      cache: 'no-store',
      signal,
    }),
  feedback: (sessionId: string, answerId: number, helpful: boolean, comment?: string) =>
    apiFetch<{ saved: boolean }>('/public/chat/feedback', {
      method: 'POST',
      body: { session_id: sessionId, answer_id: answerId, was_helpful: helpful, comment },
    }),
};
