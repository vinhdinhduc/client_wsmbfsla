import type { ChatSource } from './api/chatbot';

export const CHAT_SESSION_KEY = 'mfsl_chat_session_id';
export const CHAT_HISTORY_KEY = 'mfsl_chat_history';
export const CHAT_INTRO_KEY = 'mfsl_chat_intro_dismissed';
export const MAX_CHAT_LENGTH = 500;
export const DEFAULT_CHAT_SUGGESTIONS = [
  'Gói cước nào rẻ?',
  'Cửa hàng gần tôi',
  'Tư vấn giải pháp doanh nghiệp',
];
export const AI_NOTICE =
  'Trợ lý AI có thể chưa chính xác. Vui lòng gọi hotline để xác nhận giá và ưu đãi.';
export const UNCONFIRMED_REPLY =
  'Tôi chưa có thông tin đã được xác nhận để trả lời câu hỏi này. Vui lòng gặp nhân viên tư vấn để kiểm tra thông tin hiện hành.';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt?: string;
  failedQuestion?: string;
  needsHuman?: boolean;
  sources?: ChatSource[];
  vote?: 'up' | 'down';
  feedback?: string;
  answerId?: number;
}

export function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function welcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    text: 'Xin chào! Tôi là trợ lý MobiFone Sơn La. Tôi có thể giúp bạn tìm gói cước, cửa hàng hoặc giải pháp cho doanh nghiệp.',
    createdAt: new Date().toISOString(),
  };
}

export function safeSources(sources: unknown): ChatSource[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter(
      (source): source is ChatSource =>
        source &&
        typeof source.title === 'string' &&
        !hasKnowledgePlaceholder(source.title) &&
        typeof source.href === 'string' &&
        /^(?:\/(?:goi-cuoc|sim-so-dep|giai-phap-so|tin-tuc)\/[a-zA-Z0-9_-]+|\/cua-hang)$/.test(
          source.href,
        ),
    )
    .slice(0, 6)
    .map(({ title, href }) => ({ title: title.slice(0, 255), href }));
}

export function hasKnowledgePlaceholder(text: string): boolean {
  return /\[\s*(?:ĐIỀN|XÁC\s*NHẬN|DIEN|XAC\s*NHAN)\s*:[^\]]*\]|\{\{[\s\S]*?\}\}/i.test(text);
}

export function needsHumanSupport(text: string): boolean {
  return (
    hasKnowledgePlaceholder(text) ||
    /chưa (?:có|thể|được xác nhận)|không (?:chắc|có thông tin|tìm thấy|thể xác nhận)|ngoài (?:phạm vi|khả năng)|liên hệ (?:nhân viên|hotline)|gọi hotline/i.test(
      text,
    )
  );
}

export function restoreHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.text === 'string' &&
        ['user', 'assistant'].includes(item.role),
    )
    .slice(-50)
    .map((item) => {
      const placeholder = item.role === 'assistant' && hasKnowledgePlaceholder(item.text);
      return {
        id: item.id.slice(0, 100),
        role: item.role,
        text: placeholder ? UNCONFIRMED_REPLY : item.text.slice(0, 20000),
        createdAt:
          typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt))
            ? item.createdAt
            : undefined,
        sources: placeholder ? [] : safeSources(item.sources),
        failedQuestion:
          typeof item.failedQuestion === 'string'
            ? item.failedQuestion.slice(0, MAX_CHAT_LENGTH)
            : undefined,
        needsHuman: placeholder || item.needsHuman === true,
        vote: ['up', 'down'].includes(item.vote) ? item.vote : undefined,
        feedback: typeof item.feedback === 'string' ? item.feedback.slice(0, 500) : undefined,
        answerId:
          Number.isSafeInteger(item.answerId) && item.answerId > 0 ? item.answerId : undefined,
      };
    });
}

export function safeChatHref(value: string): string | undefined {
  const href = value.trim();
  if (/[\s\u0000-\u001f\\]/.test(href)) return undefined;
  if (/^\/(?!\/)/.test(href)) return href;
  if (/^tel:\+?\d{8,15}$/.test(href)) return href;
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function configuredSuggestions(value?: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value || 'null');
    if (Array.isArray(parsed)) {
      const questions = [
        ...new Set(
          parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length >= 2 && item.length <= 100),
        ),
      ].slice(0, 8);
      if (questions.length) return questions;
    }
  } catch {
    /* Use existing defaults for malformed configuration. */
  }
  return DEFAULT_CHAT_SUGGESTIONS;
}

/** Only infer a schedule from an explicit configured range; never invent hours. */
export function staffAvailability(
  hours: string | undefined,
  now = new Date(),
): 'open' | 'closed' | 'unknown' {
  if (!hours) return 'unknown';
  const normalized = hours
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  const times = [...normalized.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/g)];
  // Multiple shifts, exceptions and overnight ranges need a structured schedule.
  if (times.length !== 2) return 'unknown';
  const start = Number(times[0][1]) * 60 + Number(times[0][2]);
  const end = Number(times[1][1]) * 60 + Number(times[1][2]);
  if (end <= start) return 'unknown';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(read('weekday'));
  const current = Number(read('hour')) * 60 + Number(read('minute'));
  let days: number[];
  if (/hang ngay|moi ngay|thu hai\s*[–—-]\s*chu nhat|thu 2\s*[–—-]\s*chu nhat/.test(normalized))
    days = [0, 1, 2, 3, 4, 5, 6];
  else if (/thu (?:hai|2)\s*[–—-]\s*(?:thu )?(?:bay|7)/.test(normalized)) days = [1, 2, 3, 4, 5, 6];
  else if (/thu (?:hai|2)\s*[–—-]\s*(?:thu )?(?:sau|6)/.test(normalized)) days = [1, 2, 3, 4, 5];
  else return 'unknown';
  return days.includes(day) && current >= start && current < end ? 'open' : 'closed';
}
