'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Mail, Settings2, ShieldAlert, TableProperties } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { emailApi, EmailLog, SmtpConfig } from '@/lib/api/email';
import { PublicSettings, settingsApi } from '@/lib/api/settings';
import { useToast } from '@/components/ui/Toast';
import { EmailTemplateWorkspace } from './EmailTemplateWorkspace';
import styles from './page.module.scss';

const blank: SmtpConfig = {
  host: '',
  port: 587,
  security: 'starttls',
  username: '',
  from_name: 'MobiFone Sơn La',
  from_email: '',
  reply_to: null,
  bcc: null,
  send_limit_hour: 200,
  password_configured: false,
};
type EmailTab = 'smtp' | 'templates' | 'logs' | 'suppressions';

function logDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function maskRecipient(value: string) {
  const [name, domain] = value.split('@');
  return domain
    ? `${name.slice(0, 2)}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`
    : value;
}

function logStatusLabel(status: string) {
  const labels: Record<string, string> = {
    sent: 'Đã gửi',
    failed: 'Thất bại',
    queued: 'Đang chờ',
    processing: 'Đang gửi',
    suppressed: 'Đã chặn',
  };
  return labels[status] || status;
}

function logStatusTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'sent') return 'success';
  if (status === 'failed' || status === 'suppressed') return 'danger';
  return 'warning';
}

export default function AdminEmailPage() {
  const client = useQueryClient();
  const { showToast } = useToast();
  const config = useQuery({ queryKey: ['email-config'], queryFn: emailApi.config });
  const templates = useQuery({ queryKey: ['email-templates'], queryFn: emailApi.templates });
  const logs = useQuery({ queryKey: ['email-logs'], queryFn: emailApi.logs });
  const suppression = useQuery({
    queryKey: ['email-suppressions'],
    queryFn: emailApi.suppressions,
  });
  const website = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const [activeTab, setActiveTab] = useState<EmailTab>('templates');
  const [smtp, setSmtp] = useState<SmtpConfig>(blank);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [suppressEmail, setSuppressEmail] = useState('');
  const [suppressReason, setSuppressReason] = useState('manual');
  const [logStatus, setLogStatus] = useState('all');
  const [logDateFilter, setLogDateFilter] = useState('');

  useEffect(() => {
    if (config.data) setSmtp(config.data);
  }, [config.data]);
  const run = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['email-config'] });
      client.invalidateQueries({ queryKey: ['email-templates'] });
      client.invalidateQueries({ queryKey: ['email-logs'] });
      client.invalidateQueries({ queryKey: ['email-suppressions'] });
      showToast('Thao tác thành công');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  function saveConfig(event: FormEvent) {
    event.preventDefault();
    const { password_configured: _passwordConfigured, ...fields } = smtp;
    run.mutate(() => emailApi.saveConfig({ ...fields, password: password || undefined }), {
      onSuccess: () => setPassword(''),
    });
  }

  const visibleLogs = useMemo(
    () =>
      (logs.data ?? []).filter(
        (row) =>
          (logStatus === 'all' || row.status === logStatus) &&
          (!logDateFilter || row.created_at.slice(0, 10) === logDateFilter),
      ),
    [logs.data, logStatus, logDateFilter],
  );

  const tabs: Array<{ key: EmailTab; label: string; icon: typeof Mail }> = [
    { key: 'smtp', label: 'Cấu hình SMTP', icon: Settings2 },
    { key: 'templates', label: 'Mẫu thư', icon: Mail },
    { key: 'logs', label: 'Nhật ký gửi', icon: TableProperties },
    { key: 'suppressions', label: 'Danh sách không gửi', icon: ShieldAlert },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>CÀI ĐẶT · EMAIL</p>
          <h1>Email &amp; thông báo</h1>
        </div>
        <span className={styles.headerNote}>MobiFone Sơn La</span>
      </header>
      <nav className={styles.tabs} role="tablist" aria-label="Cài đặt email">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'smtp' && (
        <section className={styles.card} role="tabpanel">
          <div className={styles.sectionHeading}>
            <div>
              <h2>Kết nối máy chủ thư</h2>
              <p>Cấu hình SMTP và gửi thư kiểm tra tới email tài khoản.</p>
            </div>
            <span
              className={
                config.data?.password_configured ? styles.connectionReady : styles.connectionMissing
              }
            >
              {config.data?.password_configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
            </span>
          </div>
          {config.isError && (
            <p className={styles.errorNotice} role="alert">
              Không tải được cấu hình SMTP: {config.error.message}
            </p>
          )}
          <form onSubmit={saveConfig} className={styles.smtpForm}>
            <label>
              Máy chủ SMTP
              <input
                required
                value={smtp.host}
                placeholder="smtp.example.com"
                onChange={(event) => setSmtp({ ...smtp, host: event.target.value })}
              />
              <small>Địa chỉ máy chủ email do nhà cung cấp gửi.</small>
            </label>
            <label>
              Cổng
              <input
                type="number"
                min="1"
                max="65535"
                required
                value={smtp.port}
                onChange={(event) => setSmtp({ ...smtp, port: Number(event.target.value) })}
              />
              <small>Thường dùng 587 cho STARTTLS hoặc 465 cho SSL.</small>
            </label>
            <label>
              Bảo mật
              <select
                value={smtp.security}
                onChange={(event) =>
                  setSmtp({ ...smtp, security: event.target.value as SmtpConfig['security'] })
                }
              >
                <option value="none">Không mã hóa</option>
                <option value="starttls">STARTTLS</option>
                <option value="ssl">SSL</option>
              </select>
            </label>
            <label>
              Tài khoản SMTP
              <input
                required
                autoComplete="username"
                value={smtp.username}
                onChange={(event) => setSmtp({ ...smtp, username: event.target.value })}
              />
            </label>
            <label className={styles.passwordField}>
              Mật khẩu SMTP
              {smtp.password_configured && (
                <small>Mật khẩu đã lưu được giữ nguyên nếu để trống.</small>
              )}
              <span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    smtp.password_configured ? 'Để trống để giữ mật khẩu cũ' : 'Nhập mật khẩu SMTP'
                  }
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>
            <label>
              Tên người gửi
              <input
                required
                value={smtp.from_name}
                onChange={(event) => setSmtp({ ...smtp, from_name: event.target.value })}
              />
            </label>
            <label>
              Email gửi
              <input
                type="email"
                required
                value={smtp.from_email}
                onChange={(event) => setSmtp({ ...smtp, from_email: event.target.value })}
              />
            </label>
            <label>
              Reply-To
              <input
                type="email"
                value={smtp.reply_to || ''}
                onChange={(event) => setSmtp({ ...smtp, reply_to: event.target.value || null })}
              />
              <small>Địa chỉ nhận phản hồi, có thể để trống.</small>
            </label>
            <label>
              BCC nội bộ
              <input
                type="email"
                value={smtp.bcc || ''}
                onChange={(event) => setSmtp({ ...smtp, bcc: event.target.value || null })}
              />
              <small>Bản sao ẩn cho email nội bộ.</small>
            </label>
            <label>
              Giới hạn gửi mỗi giờ
              <input
                type="number"
                min="1"
                max="10000"
                value={smtp.send_limit_hour}
                onChange={(event) =>
                  setSmtp({ ...smtp, send_limit_hour: Number(event.target.value) })
                }
              />
            </label>
            <div className={styles.smtpActions}>
              <button className={styles.primaryButton} disabled={run.isPending || config.isLoading}>
                {run.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
              </button>
              <button
                type="button"
                disabled={run.isPending || config.isLoading || config.isError}
                onClick={() => run.mutate(emailApi.verify)}
              >
                Kiểm tra kết nối
              </button>
              <button
                type="button"
                disabled={run.isPending || config.isLoading || config.isError}
                onClick={() => run.mutate(() => emailApi.test())}
              >
                Gửi thư kiểm tra
              </button>
            </div>
          </form>
        </section>
      )}

      <div hidden={activeTab !== 'templates'}>
        {templates.isLoading ? (
          <section className={styles.card}>
            <div className={styles.loadingLine} />
            <div className={styles.loadingLine} />
            <div className={styles.loadingLine} />
          </section>
        ) : templates.isError ? (
          <section className={styles.card}>
            <p className={styles.errorNotice} role="alert">
              Không tải được mẫu thư: {templates.error.message}
            </p>
          </section>
        ) : (
          <EmailTemplateWorkspace
            templates={templates.data ?? []}
            smtp={smtp}
            website={(website.data ?? {}) as PublicSettings}
            showToast={showToast}
          />
        )}
      </div>

      {activeTab === 'logs' && (
        <section className={styles.card} role="tabpanel">
          <div className={styles.sectionHeading}>
            <div>
              <h2>Nhật ký gửi</h2>
              <p>50 lần gửi gần nhất. Địa chỉ người nhận được che một phần.</p>
            </div>
          </div>
          <div className={styles.logFilters}>
            <label>
              Trạng thái
              <select value={logStatus} onChange={(event) => setLogStatus(event.target.value)}>
                <option value="all">Tất cả</option>
                <option value="sent">Đã gửi</option>
                <option value="failed">Thất bại</option>
                <option value="queued">Đang chờ</option>
                <option value="processing">Đang gửi</option>
                <option value="suppressed">Đã chặn</option>
              </select>
            </label>
            <label>
              Ngày gửi
              <input
                type="date"
                value={logDateFilter}
                onChange={(event) => setLogDateFilter(event.target.value)}
              />
            </label>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.logTable}>
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Người nhận</th>
                  <th>Mẫu thư</th>
                  <th>Lần gửi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((row: EmailLog) => (
                  <tr key={row.id}>
                    <td>
                      <Badge tone={logStatusTone(row.status)}>{logStatusLabel(row.status)}</Badge>
                      {row.last_error && (
                        <small className={styles.logError}>{row.last_error}</small>
                      )}
                    </td>
                    <td>{logDate(row.sent_at || row.created_at)}</td>
                    <td>{maskRecipient(row.recipient)}</td>
                    <td>
                      <code>{row.template_key}</code>
                    </td>
                    <td>{row.attempts}</td>
                    <td>
                      {row.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => run.mutate(() => emailApi.retry(row.id))}
                        >
                          Gửi lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      Chưa có email phù hợp bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'suppressions' && (
        <section className={styles.card} role="tabpanel">
          <div className={styles.sectionHeading}>
            <div>
              <h2>Danh sách không gửi</h2>
              <p>Email trong danh sách này sẽ không nhận thư tự động.</p>
            </div>
          </div>
          <form
            className={styles.suppressionForm}
            onSubmit={(event) => {
              event.preventDefault();
              run.mutate(() => emailApi.suppress(suppressEmail, suppressReason));
              setSuppressEmail('');
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                value={suppressEmail}
                onChange={(event) => setSuppressEmail(event.target.value)}
                placeholder="ten@domain.vn"
              />
            </label>
            <label>
              Lý do
              <input
                required
                value={suppressReason}
                onChange={(event) => setSuppressReason(event.target.value)}
              />
            </label>
            <button className={styles.primaryButton}>Thêm địa chỉ</button>
          </form>
          <div className={styles.suppressionList}>
            {suppression.data?.map((item) => (
              <div key={item.email}>
                <span>
                  <strong>{item.email}</strong>
                  <small>{item.reason}</small>
                </span>
                <button
                  type="button"
                  onClick={() => run.mutate(() => emailApi.unsuppress(item.email))}
                >
                  Bỏ khỏi danh sách
                </button>
              </div>
            ))}
            {suppression.data?.length === 0 && (
              <p className={styles.emptyState}>Danh sách đang trống.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
