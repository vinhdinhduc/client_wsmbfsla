import { apiFetch } from './client';

export interface ChatSource {
  title: string;
  href: string;
}
export interface ChatAnswer {
  reply: string;
  status?: 'answered' | 'unavailable' | 'limited' | 'restricted';
  sources?: ChatSource[];
}

export const chatbotApi = {
  sendMessage: (sessionId: string, message: string, agreed_terms: boolean) =>
    apiFetch<ChatAnswer>('/chat', {
      method: 'POST',
      body: { session_id: sessionId, message, agreed_terms },
      cache: 'no-store',
    }),
};
