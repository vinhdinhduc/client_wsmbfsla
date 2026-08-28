import { apiFetch } from './client';

export const chatbotApi = {
  sendMessage: (sessionId: string, message: string) =>
    apiFetch<{ reply: string }>('/public/chatbot/message', {
      method: 'POST',
      body: { session_id: sessionId, message },
      cache: 'no-store',
    }),
};
