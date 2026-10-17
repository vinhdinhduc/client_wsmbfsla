export type LogReviewStatus = 'new' | 'needs_knowledge' | 'resolved' | 'ignored';

export const reviewStatusLabels: Record<LogReviewStatus, string> = {
  new: 'Mới',
  needs_knowledge: 'Cần bổ sung tri thức',
  resolved: 'Đã xử lý',
  ignored: 'Bỏ qua',
};

export interface PresentableLog {
  id?: number;
  session_id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
  was_helpful?: boolean | null;
  flagged_for_review?: boolean;
  review_status?: LogReviewStatus;
  is_unanswered?: boolean;
  fallback_reason?: string | null;
}

// Keep expressions local to each call: global expressions carry a mutable lastIndex.
function emailPattern(): RegExp {
  return /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+/gi;
}

function phonePattern(): RegExp {
  const separator = '[\\s\\u0000-\\u001f\\u007f\\u200b-\\u200d\\u2060().-]*';
  const prefix = `\\(?(?:0|\\+?84)${separator}`;
  return new RegExp(
    `(^|[^\\d])(${prefix}[35789](?:${separator}\\d){8}|${prefix}2(?:${separator}\\d){9})(?!\\d)`,
    'g',
  );
}

export function maskContactInfo(value: string): string {
  return value
    .replace(emailPattern(), (email) => {
      const [local, domain] = email.split('@');
      return `${local.slice(0, 1)}***@${domain}`;
    })
    .replace(phonePattern(), (_match, before: string, phone: string) => {
      let digits = phone.replace(/\D/g, '');
      if (digits.startsWith('84')) digits = `0${digits.slice(2)}`;
      return `${before}${digits.slice(0, 4)} *** ${digits.slice(-3)}`;
    });
}

export function hasContactInfo(value: string): boolean {
  return emailPattern().test(value) || phonePattern().test(value) || /\b0\d{3}\s+\*{3}\s+\d{3}\b/.test(value);
}

export function normalizeLogQuestion(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUnansweredLog(
  log: Pick<PresentableLog, 'ai_response' | 'is_unanswered' | 'fallback_reason'>,
): boolean {
  if (typeof log.is_unanswered === 'boolean') return log.is_unanswered;
  if (log.fallback_reason) return true;
  const reply = normalizeLogQuestion(log.ai_response);
  if (
    /(?:chatbot chua the tra loi|chua co thong tin (?:da duoc xac nhan|phu hop)|khong (?:co|tim thay) (?:du lieu|thong tin|tri thuc) phu hop)/.test(
      reply,
    )
  )
    return true;
  // An opening statement that the requested subject has no data is a legacy
  // unanswered reply. Missing one detail later in a useful answer is not enough.
  const opening = normalizeLogQuestion(log.ai_response.split(/[.!?\n]/, 1)[0]);
  const hasUsefulFact =
    /\b(?:gia|muc cuoc|chu ky)\s+(?:la\s+|tu\s+|co\s+)?\d|\b\d+\s*(?:gb|mb|phut|ngay|thang|dong)\b/.test(
      opening,
    );
  if (
    !hasUsefulFact &&
    /(?:chua|khong)\s+(?:co|tim thay)\s+(?:thong tin|du lieu|tri thuc)\s+ve\b.*\b(?:trong|tu)\s+(?:du lieu|nguon|context)\b/.test(
      opening,
    )
  )
    return true;
  return /^(?:(?:toi|hien|xin loi|rat tiec|chatbot|tro ly ai|theo du lieu hien tai|trong du lieu duoc cung cap)\s+){0,3}(?:chua|khong)\s+(?:co|tim thay)\s+(?:thong tin|du lieu|tri thuc)\s+(?:ve|de|cho|phu hop|da duoc)/.test(
    opening,
  );
}

export function logReviewStatus(
  log: Pick<PresentableLog, 'review_status' | 'flagged_for_review'>,
): LogReviewStatus {
  if (log.review_status && Object.hasOwn(reviewStatusLabels, log.review_status))
    return log.review_status;
  return log.flagged_for_review ? 'needs_knowledge' : 'new';
}

export function formatLogDate(value: string, includeSeconds = false): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Không rõ thời gian';
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' as const } : {}),
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value || '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}${includeSeconds ? `:${part('second')}` : ''}`;
}

export function relativeLogTime(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Không rõ thời gian';
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 60) return seconds >= -60 ? 'Vừa xong' : formatLogDate(value);
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} ngày trước`;
  return formatLogDate(value);
}

export function safeCsvCell(value: string | number | null | undefined): string {
  let text = String(value ?? '');
  // Excel may ignore leading whitespace/control characters when interpreting a formula.
  if (/^[\s\u0000-\u001f\u007f\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createLogCsv(logs: PresentableLog[]): string {
  const rows: Array<Array<string | number>> = [
    ['Thời gian', 'Mã phiên', 'Câu hỏi', 'Trả lời', 'Trạng thái', 'Phản hồi'],
    ...logs.map((log) => [
      formatLogDate(log.created_at),
      log.session_id,
      maskContactInfo(log.user_message),
      maskContactInfo(log.ai_response),
      reviewStatusLabels[logReviewStatus(log)],
      log.was_helpful === true ? 'Hữu ích' : log.was_helpful === false ? 'Chưa hữu ích' : '',
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(',')).join('\r\n')}\r\n`;
}
