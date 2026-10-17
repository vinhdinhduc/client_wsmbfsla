'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, Monitor, Moon, Save, Smartphone, Undo2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmailTemplate } from '@/lib/api/email';
import {
  EMAIL_SAMPLE_DATA,
  EMAIL_TEMPLATE_CATALOG,
  EMAIL_VARIABLES,
} from '@/lib/email-template-catalog';
import {
  createDebouncer,
  escapeEmailText,
  findUnsupportedEmailVariables,
  replaceEmailVariables,
  sanitizeEmailHtml,
} from '@/lib/email-template-preview';
import { PublicSettings } from '@/lib/api/settings';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { emailApi, SmtpConfig } from '@/lib/api/email';
import { env } from '@/lib/env';
import styles from './page.module.scss';

interface EmailTemplateWorkspaceProps {
  templates: EmailTemplate[];
  smtp: SmtpConfig;
  website: PublicSettings;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

function makePreviewDocument({
  subject,
  html,
  fromName,
  fromEmail,
  width,
  dark,
  samples,
  website,
}: {
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  width: 600 | 375;
  dark: boolean;
  samples: Record<string, string>;
  website: PublicSettings;
}) {
  const statusLabels: Record<string, string> = {
    moi: 'Đã tiếp nhận',
    dang_xu_ly: 'Đang xử lý',
    hoan_thanh: 'Hoàn tất',
    huy: 'Từ chối',
  };
  const renderSamples = {
    ...samples,
    status: statusLabels[samples.status] || samples.status,
  };
  const statusColors: Record<string, string> = {
    moi: 'background-color:#e0f2fe;color:#075985',
    'Đã tiếp nhận': 'background-color:#e0f2fe;color:#075985',
    dang_xu_ly: 'background-color:#fef3c7;color:#92400e',
    'Đang xử lý': 'background-color:#fef3c7;color:#92400e',
    hoan_thanh: 'background-color:#dcfce7;color:#166534',
    'Hoàn tất': 'background-color:#dcfce7;color:#166534',
    huy: 'background-color:#fee2e2;color:#991b1b',
    'Từ chối': 'background-color:#fee2e2;color:#991b1b',
  };
  const badgeStyle =
    statusColors[samples.status] ||
    statusColors[renderSamples.status] ||
    'background-color:#e0f2fe;color:#075985';
  const badgeHtml = html.replace(
    /<span\b(?=[^>]*class=["']registration-status-badge["'])[^>]*>/i,
    `<span class="registration-status-badge" style="display:inline-block;padding:5px 10px;border-radius:16px;${badgeStyle};font-weight:bold">`,
  );
  const safeBody = replaceEmailVariables(sanitizeEmailHtml(badgeHtml), renderSamples);
  const safeSubject = replaceEmailVariables(subject, renderSamples);
  const branchText =
    website.footer_branch_name || website.site_name || samples.branch_name || 'MobiFone Sơn La';
  const branchName = escapeEmailText(branchText);
  const hotline = escapeEmailText(
    website.hotline || website.footer_phone || samples.hotline || '18001090',
  );
  const address = escapeEmailText(website.contact_address || website.footer_address || '');
  const email = escapeEmailText(website.contact_email || website.footer_email || '');
  const workingHours = escapeEmailText(website.working_hours || website.footer_working_hours || '');
  const publicUrl = (value: string) => {
    try {
      const url = new URL(value);
      if (/^(localhost|.*\.localhost|.*\.local)$/i.test(url.hostname)) return '';
      if (
        /^(127\.|10\.|192\.168\.)/.test(url.hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)
      )
        return '';
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
    } catch {
      return '';
    }
  };
  const configuredLogo = website.email_logo_url ? publicUrl(website.email_logo_url) : '';
  const logoCandidate =
    configuredLogo && /\.(png|jpe?g)(?:[?#].*)?$/i.test(configuredLogo)
      ? configuredLogo
      : publicUrl(`${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/logo.png`) ||
        `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/logo.png`;
  const logoUrl = logoCandidate;
  const logo = logoUrl
    ? `<img src="${escapeEmailText(logoUrl)}" alt="MobiFone Sơn La" width="200" height="37" style="display:block;border:0;width:200px;height:37px;margin:0 auto" />`
    : '<div style="font:bold 24px/1.3 Arial,Helvetica,sans-serif;color:#ffffff">MobiFone Sơn La</div>';
  const background = dark ? '#111827' : '#f3f6fa';
  const paper = dark ? '#1f2937' : '#ffffff';
  const text = dark ? '#e5e7eb' : '#1f2937';
  const muted = dark ? '#cbd5e1' : '#64748b';
  const footerBackground = dark ? '#172331' : '#eef3f8';
  const phoneLink = `<a href="tel:${hotline}" style="color:#0065b3;text-decoration:none">${hotline}</a>`;
  const socialLinks = [
    website.footer_facebook_url && publicUrl(website.footer_facebook_url)
      ? `<a href="${escapeEmailText(publicUrl(website.footer_facebook_url))}" style="color:#0065b3">Facebook</a>`
      : '',
    website.footer_zalo_url && publicUrl(website.footer_zalo_url)
      ? `<a href="${escapeEmailText(publicUrl(website.footer_zalo_url))}" style="color:#0065b3">Zalo</a>`
      : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');
  const copyright = escapeEmailText(
    `© ${new Date().getFullYear()} ${branchText}. Bảo lưu mọi quyền.`,
  );

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>html,body{margin:0;padding:0;background:${background};font-family:Arial,Helvetica,'Segoe UI',sans-serif;color:${text}}table{border-collapse:collapse}.email-shell{width:100%;max-width:${width}px;background:${paper};border-radius:12px;overflow:hidden}.email-body{font-size:15px;line-height:1.65}.email-body p{margin:0 0 16px}.email-info{width:100%;margin:20px 0}.email-info td{padding:11px 14px}.email-footer{background:${footerBackground};color:${muted}}@media only screen and (max-width:480px){.email-content{padding:20px!important}.email-info td{display:block!important;width:auto!important}.email-cta-cell{display:block!important;width:100%!important}.email-cta-cell a{display:block!important;padding:14px 20px!important}.email-footer{padding:20px!important}}@media(prefers-color-scheme:dark){.email-outer{background:#111827!important}.email-shell,.email-content{background:#1f2937!important;color:#e5e7eb!important}.email-footer{background:#172331!important;color:#d1d5db!important}}</style></head><body class="email-outer" style="margin:0;padding:20px 8px;background:${background};color:${text}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center"><table class="email-shell" role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td class="meta" style="padding:12px 16px;background:${paper};border-bottom:1px solid #dbe3eb;font:13px/1.6 Arial,Helvetica,sans-serif;color:${muted}"><strong>Từ:</strong> ${escapeEmailText(fromName || 'MobiFone Sơn La')} &lt;${escapeEmailText(fromEmail || 'email@mobifone-sonla.vn')}&gt;<br><strong>Tiêu đề:</strong> ${safeSubject}</td></tr><tr><td align="center" bgcolor="#0065b3" style="padding:28px 20px 24px;background:#0065b3;color:#ffffff">${logo}<div style="padding-top:8px;font:13px/1.4 Arial,Helvetica,sans-serif;color:#ffffff">Đồng hành cùng Quý khách</div></td></tr><tr><td height="4" bgcolor="#e31837" style="height:4px;background:#e31837;font-size:0;line-height:0">&nbsp;</td></tr><tr><td class="email-content email-body" style="padding:34px 32px;background:${paper};color:${text}">${safeBody}</td></tr><tr><td class="email-footer" style="padding:24px 32px;background:${footerBackground};font:13px/1.7 Arial,Helvetica,sans-serif;color:${muted}"><strong style="font-size:14px">${branchName}</strong><br>Hotline: ${phoneLink}${email ? `<br><a href="mailto:${email}" style="color:#0065b3">${email}</a>` : ''}${address ? `<br>${address}` : ''}${workingHours ? `<br>${workingHours}` : ''}${socialLinks ? `<br>${socialLinks}` : ''}<br><span>Đây là email tự động, vui lòng không trả lời trực tiếp.</span><br><span>${copyright}</span></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function sameTemplate(left: EmailTemplate | null, right: EmailTemplate | null) {
  return Boolean(
    left &&
      right &&
      left.subject === right.subject &&
      left.html === right.html &&
      Boolean(left.enabled) === Boolean(right.enabled),
  );
}

export function EmailTemplateWorkspace({
  templates,
  smtp,
  website,
  showToast,
}: EmailTemplateWorkspaceProps) {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState('registration_received_customer');
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [sampleData, setSampleData] = useState(EMAIL_SAMPLE_DATA);
  const [previewWidth, setPreviewWidth] = useState<600 | 375>(600);
  const [previewDark, setPreviewDark] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreUndo, setRestoreUndo] = useState<EmailTemplate | null>(null);
  const [previewDraft, setPreviewDraft] = useState({ subject: '', html: '' });
  const selectedTemplate = templates.find((template) => template.key === selectedKey) ?? null;
  const catalog = EMAIL_TEMPLATE_CATALOG[selectedKey] ?? {
    title: selectedTemplate?.name || selectedKey,
    description: 'Mẫu email hệ thống.',
    variables: EMAIL_VARIABLES.map((variable) => variable.key),
  };
  const dirty = Boolean(draft && selectedTemplate && !sameTemplate(draft, selectedTemplate));
  const unsupportedCount = draft
    ? findUnsupportedEmailVariables(`${draft.subject}\n${draft.html}`, catalog.variables).length
    : 0;
  const [schedulePreview] = useState(() =>
    createDebouncer((value: { subject: string; html: string }) => setPreviewDraft(value), 300),
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    if (draft?.key === selectedTemplate.key) return;
    setDraft(selectedTemplate);
    setPreviewDraft({ subject: selectedTemplate.subject, html: selectedTemplate.html });
    setSavedAt(new Date());
    setSampleData({
      ...EMAIL_SAMPLE_DATA,
      ...(selectedTemplate.key === 'password_reset' ? { message: '012345' } : {}),
    });
  }, [draft, selectedTemplate]);

  useEffect(() => {
    if (!draft) return;
    schedulePreview({ subject: draft.subject, html: draft.html });
    return () => schedulePreview.cancel();
  }, [draft, schedulePreview]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: (template: EmailTemplate) => emailApi.saveTemplate(template.key, template),
    onSuccess: (rows, submitted) => {
      const saved = rows.find((row) => row.key === submitted.key) ?? submitted;
      setDraft(saved);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      showToast('Đã lưu mẫu thư');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const saveTemplate = saveMutation.mutate;
  const isSaving = saveMutation.isPending;
  const saveShortcut = useRef<() => void>(() => undefined);
  useEffect(() => {
    saveShortcut.current = () => {
      if (draft && dirty && unsupportedCount === 0 && !isSaving) saveTemplate(draft);
    };
  }, [draft, dirty, isSaving, saveTemplate, unsupportedCount]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveShortcut.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const restoreMutation = useMutation({
    mutationFn: () => emailApi.restore(selectedKey),
    onSuccess: (rows) => {
      const restored = rows.find((row) => row.key === selectedKey);
      if (draft) setRestoreUndo(draft);
      if (restored) setDraft(restored);
      setSavedAt(new Date());
      setRestoreOpen(false);
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      showToast('Đã khôi phục mẫu mặc định');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const undoMutation = useMutation({
    mutationFn: (template: EmailTemplate) => emailApi.saveTemplate(template.key, template),
    onSuccess: (rows, submitted) => {
      const restored = rows.find((row) => row.key === submitted.key) ?? submitted;
      setDraft(restored);
      setRestoreUndo(null);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      showToast('Đã hoàn tác khôi phục');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const sendTemplateTest = useMutation({
    mutationFn: (template: EmailTemplate) =>
      emailApi.test({ key: template.key, subject: template.subject, html: template.html }),
    onSuccess: () => showToast('Đã gửi thử mẫu tới email tài khoản'),
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  function selectTemplate(key: string) {
    if (key === selectedKey) return;
    if (dirty && !window.confirm('Mẫu hiện tại chưa lưu. Bỏ thay đổi và chuyển mẫu khác?')) return;
    setRestoreUndo(null);
    setDraft(null);
    setSelectedKey(key);
    setMobileView('edit');
  }

  const previewSource = draft ? { ...previewDraft } : { subject: '', html: '' };
  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const previewRoute: Record<string, string> = {
    account_created: '/admin/login',
    appointment_new_staff: '/admin/appointments',
    contact_new_staff: '/admin/contacts',
    registration_new_staff: '/admin/registrations',
  };
  const previewSamples = {
    ...sampleData,
    confirm_url: previewRoute[selectedKey]
      ? `${siteUrl}${previewRoute[selectedKey]}`
      : sampleData.confirm_url || `${siteUrl}/`,
  };
  const explicitPreviewTheme = previewDark
    ? '<style>html,body,.email-outer{background:#111827!important}.email-shell,.email-content{background:#1f2937!important;color:#e5e7eb!important}.email-footer{background:#172331!important;color:#d1d5db!important}.email-body,.email-info td{color:#e5e7eb!important}</style>'
    : '<style>html,body,.email-outer{background:#f3f6fa!important}.email-shell,.email-content{background:#ffffff!important;color:#1f2937!important}.email-footer{background:#eef3f8!important;color:#334155!important}</style>';
  const srcDoc = makePreviewDocument({
    ...previewSource,
    fromName: smtp.from_name,
    fromEmail: smtp.from_email,
    width: previewWidth,
    dark: previewDark,
    samples: previewSamples,
    website,
  })
    .replace('</head>', `${explicitPreviewTheme}</head>`)
    .replace(/<tr><td class="meta"[\s\S]*?<\/td><\/tr>/, '');
  const timeLabel = savedAt
    ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(savedAt)
    : '--:--';

  if (!draft) {
    return (
      <section className={styles.templateLoading} aria-label="Đang tải mẫu thư">
        <span />
        <span />
        <span />
      </section>
    );
  }

  return (
    <section className={styles.templateWorkspace}>
      <div className={styles.mobileViewTabs} role="tablist" aria-label="Mẫu thư và xem trước">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'edit'}
          onClick={() => setMobileView('edit')}
        >
          Soạn thảo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'preview'}
          onClick={() => setMobileView('preview')}
        >
          Xem trước
        </button>
      </div>
      <div className={styles.workspaceGrid}>
        <div
          className={`${styles.templateComposer} ${mobileView === 'preview' ? styles.mobileEditHidden : ''}`}
        >
          <div className={styles.templateChooser}>
            <div className={styles.sectionHeading}>
              <div>
                <h3>Danh sách mẫu</h3>
                <p>Chọn nội dung cần chỉnh sửa</p>
              </div>
              <span>{templates.length} mẫu</span>
            </div>
            <div className={styles.templateList} role="listbox" aria-label="Danh sách mẫu email">
              {templates.map((template) => {
                const item = EMAIL_TEMPLATE_CATALOG[template.key];
                const active = template.key === selectedKey;
                return (
                  <button
                    key={template.key}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${styles.templateOption} ${active ? styles.templateOptionActive : ''}`}
                    onClick={() => selectTemplate(template.key)}
                  >
                    <span className={styles.templateOptionHead}>
                      <strong>{item?.title || template.name}</strong>
                      <span
                        className={`${styles.statusBadge} ${template.enabled ? styles.statusEnabled : styles.statusDisabled}`}
                      >
                        {template.enabled ? 'Bật' : 'Tắt'}
                      </span>
                    </span>
                    <span className={styles.templateDescription}>
                      {item?.description || 'Mẫu email hệ thống.'}
                    </span>
                    <code>{template.key}</code>
                  </button>
                );
              })}
            </div>
          </div>

          <form
            className={styles.templateForm}
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate(draft);
            }}
          >
            <div className={styles.templateTitleRow}>
              <div>
                <p className={styles.eyebrow}>ĐANG SOẠN</p>
                <h2>{catalog.title}</h2>
                <code>{draft.key}</code>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(draft.enabled)}
                aria-label="Bật mẫu thư"
                className={`${styles.switch} ${draft.enabled ? styles.switchOn : ''}`}
                onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
              >
                <span />
              </button>
            </div>
            <label className={styles.fieldLabel}>
              Tiêu đề thư
              <input
                value={draft.subject}
                maxLength={255}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              />
            </label>
            <EmailTemplateEditor
              key={draft.key}
              value={draft.html}
              onChange={(html) => setDraft((current) => (current ? { ...current, html } : current))}
              variables={EMAIL_VARIABLES}
              supportedVariables={catalog.variables}
            />
            <details className={styles.sampleData}>
              <summary>Dữ liệu xem thử</summary>
              <div className={styles.sampleGrid}>
                {EMAIL_VARIABLES.map((variable) => (
                  <label key={variable.key}>
                    {variable.description}
                    <input
                      value={sampleData[variable.key] || ''}
                      onChange={(event) =>
                        setSampleData((current) => ({
                          ...current,
                          [variable.key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
            <div className={styles.actionDock}>
              <div className={styles.saveState} aria-live="polite">
                {dirty ? (
                  <>
                    <CircleAlert className={styles.statePending} /> Chưa lưu thay đổi
                  </>
                ) : (
                  <>
                    <Check className={styles.stateSaved} /> Đã lưu lúc {timeLabel}
                  </>
                )}
              </div>
              {unsupportedCount > 0 && (
                <p className={styles.saveWarning}>
                  Có {unsupportedCount} biến trong tiêu đề không dùng cho mẫu này.
                </p>
              )}
              <div className={styles.actionButtons}>
                <button
                  type="submit"
                  className={styles.primaryAction}
                  disabled={!dirty || unsupportedCount > 0 || saveMutation.isPending}
                >
                  <Save /> {saveMutation.isPending ? 'Đang lưu…' : 'Lưu mẫu'}
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreOpen(true)}
                  disabled={restoreMutation.isPending}
                >
                  Khôi phục mặc định
                </button>
                {restoreUndo && (
                  <button
                    type="button"
                    onClick={() => undoMutation.mutate(restoreUndo)}
                    disabled={undoMutation.isPending}
                  >
                    <Undo2 /> Hoàn tác
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => sendTemplateTest.mutate(draft)}
                  disabled={unsupportedCount > 0 || sendTemplateTest.isPending}
                >
                  {sendTemplateTest.isPending ? 'Đang gửi…' : 'Gửi thử tới email tài khoản'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside
          className={`${styles.previewPane} ${mobileView === 'edit' ? styles.mobilePreviewHidden : ''}`}
        >
          <div className={styles.previewHeading}>
            <div>
              <p className={styles.eyebrow}>PREVIEW TRỰC TIẾP</p>
              <h2>Xem trước thư</h2>
            </div>
            <span className={styles.previewLive}>● Trực tiếp</span>
          </div>
          <div className={styles.previewControls}>
            <div role="group" aria-label="Kích thước xem trước">
              <button
                type="button"
                aria-pressed={previewWidth === 600}
                onClick={() => setPreviewWidth(600)}
                title="Desktop 600px"
              >
                <Monitor /> Desktop
              </button>
              <button
                type="button"
                aria-pressed={previewWidth === 375}
                onClick={() => setPreviewWidth(375)}
                title="Mobile 375px"
              >
                <Smartphone /> Mobile
              </button>
            </div>
            <button
              type="button"
              className={styles.themeToggle}
              aria-label={previewDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
              aria-pressed={previewDark}
              onClick={() => setPreviewDark((current) => !current)}
            >
              <Moon /> {previewDark ? 'Tối' : 'Sáng'}
            </button>
          </div>
          <div className={styles.previewViewport}>
            <iframe
              title="Preview nội dung email"
              sandbox=""
              srcDoc={srcDoc}
              style={{ width: previewWidth }}
            />
          </div>
          <p className={styles.previewFootnote}>
            Biến mẫu hiển thị dữ liệu minh họa. Preview tự cập nhật sau khi bạn dừng nhập.
          </p>
        </aside>
      </div>
      <ConfirmDialog
        isOpen={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onConfirm={() => restoreMutation.mutate()}
        isPending={restoreMutation.isPending}
        destructive
        title="Khôi phục mẫu mặc định?"
        confirmLabel="Khôi phục"
      >
        <p>
          Tiêu đề và nội dung của mẫu này sẽ được thay bằng bản mặc định. Thao tác có thể hoàn tác
          ngay sau đó.
        </p>
      </ConfirmDialog>
    </section>
  );
}
