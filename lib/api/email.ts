import { apiFetch } from './client';

export interface SmtpConfig { host: string; port: number; security: 'none' | 'starttls' | 'ssl'; username: string; from_name: string; from_email: string; reply_to: string | null; bcc: string | null; send_limit_hour: number; password_configured: boolean }
export interface EmailTemplate { key: string; name: string; subject: string; html: string; enabled: boolean | number }
export interface EmailLog { id: number; recipient: string; template_key: string; status: string; attempts: number; last_error: string | null; created_at: string; sent_at: string | null }
export const emailApi = {
  config: () => apiFetch<SmtpConfig>('/admin/email/config'),
  saveConfig: (body: Omit<SmtpConfig, 'password_configured'> & { password?: string }) => apiFetch<SmtpConfig>('/admin/email/config', { method: 'PUT', body }),
  verify: () => apiFetch<{ ok: boolean }>('/admin/email/verify', { method: 'POST' }),
  test: () => apiFetch<{ sent: boolean; recipient: string }>('/admin/email/test', { method: 'POST' }),
  templates: () => apiFetch<EmailTemplate[]>('/admin/email/templates'),
  saveTemplate: (key: string, body: Pick<EmailTemplate, 'subject' | 'html' | 'enabled'>) => apiFetch<EmailTemplate[]>(`/admin/email/templates/${key}`, { method: 'PUT', body: { ...body, enabled: Boolean(body.enabled) } }),
  restore: (key: string) => apiFetch<EmailTemplate[]>(`/admin/email/templates/${key}/restore`, { method: 'POST' }),
  preview: (key: string) => apiFetch<{ subject: string; html: string; text: string }>(`/admin/email/templates/${key}/preview`),
  logs: () => apiFetch<EmailLog[]>('/admin/email/logs'),
  retry: (id: number) => apiFetch('/admin/email/logs/' + id + '/retry', { method: 'POST' }),
  suppressions: () => apiFetch<Array<{ email: string; reason: string }>>('/admin/email/suppressions'),
  suppress: (email: string, reason: string) => apiFetch('/admin/email/suppressions', { method: 'POST', body: { email, reason } }),
  unsuppress: (email: string) => apiFetch('/admin/email/suppressions', { method: 'DELETE', body: { email } }),
};
