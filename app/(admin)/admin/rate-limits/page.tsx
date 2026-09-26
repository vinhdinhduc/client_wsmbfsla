'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rateLimitsApi, RatePolicy } from '@/lib/api/rateLimits';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

const labels: Record<string, string> = { login: 'Đăng nhập', contact: 'Liên hệ', registration_ip: 'Đăng ký / IP', registration_phone: 'Đăng ký / SĐT', appointment: 'Đặt lịch', newsletter: 'Newsletter', lookup: 'Tra cứu', sim_search: 'Tìm sim', public_general: 'API công khai', chat: 'Chatbot', upload: 'Upload' };
export default function RateLimitsPage() {
  const { showToast } = useToast(); const client = useQueryClient();
  const data = useQuery({ queryKey: ['rate-limits'], queryFn: rateLimitsApi.list });
  const stats = useQuery({ queryKey: ['rate-limits-stats'], queryFn: rateLimitsApi.stats });
  const [drafts, setDrafts] = useState<Record<string, Partial<RatePolicy>>>({});
  const [cidr, setCidr] = useState(''); const [kind, setKind] = useState<'allow' | 'block'>('allow'); const [reason, setReason] = useState('');
  const run = useMutation({ mutationFn: async (task: () => Promise<unknown>) => task(), onSuccess: () => { client.invalidateQueries({ queryKey: ['rate-limits'] }); client.invalidateQueries({ queryKey: ['rate-limits-stats'] }); showToast('Đã lưu cấu hình'); }, onError: (error: Error) => showToast(error.message, 'error') });
  const save = (policy: RatePolicy) => {
    const current = { ...policy, ...drafts[policy.key] };
    run.mutate(() => rateLimitsApi.save(policy.key, { ...current, enabled: Boolean(current.enabled) }));
  };
  const set = (key: string, value: Partial<RatePolicy>) => setDrafts((old) => ({ ...old, [key]: { ...old[key], ...value } }));
  const addRule = (event: FormEvent) => { event.preventDefault(); run.mutate(() => rateLimitsApi.addRule({ cidr, kind, reason })); setCidr(''); setReason(''); };
  return <main className={styles.page}><header><h1>Bảo mật & giới hạn tốc độ</h1><p>Chính sách cập nhật trên máy chủ trong tối đa 30 giây.</p><button type="button" onClick={() => run.mutate(rateLimitsApi.reset)}>Khôi phục mặc định</button></header>
    {data.isError && <p role="alert">{(data.error as Error).message}</p>}
    <section className={styles.grid}>{data.data?.policies.map((policy) => { const current = { ...policy, ...drafts[policy.key] }; const blocked = stats.data?.find((item) => item.policy_key === policy.key)?.blocked || 0; return <article className={styles.card} key={policy.key}><h2>{labels[policy.key] || policy.key}</h2><p>429 trong 24 giờ: {blocked}</p><label><input type="checkbox" checked={Boolean(current.enabled)} onChange={(event) => set(policy.key, { enabled: event.target.checked })} /> Bật chính sách</label><div className={styles.fields}><label>Số lần<input type="number" min="1" max="100000" value={current.max_requests} onChange={(event) => set(policy.key, { max_requests: Number(event.target.value) })} /></label><label>Cửa sổ (giây)<input type="number" min="1" max="86400" value={current.window_seconds} onChange={(event) => set(policy.key, { window_seconds: Number(event.target.value) })} /></label><label>Chặn (giây)<input type="number" min="1" max="86400" value={current.block_seconds} onChange={(event) => set(policy.key, { block_seconds: Number(event.target.value) })} /></label><label>Khóa theo<select value={current.key_by} onChange={(event) => set(policy.key, { key_by: event.target.value as RatePolicy['key_by'] })}><option value="ip">IP</option><option value="phone">SĐT</option><option value="ip_username">IP + tài khoản</option><option value="user">Người dùng</option></select></label></div><label>Thông báo<input value={current.message} onChange={(event) => set(policy.key, { message: event.target.value })} /></label>{policy.key === 'login' && current.max_requests > 20 && <p role="alert">Giới hạn đăng nhập trên 20 lần có thể giảm hiệu quả bảo vệ.</p>}<button type="button" disabled={run.isPending} onClick={() => save(policy)}>Lưu</button></article>; })}</section>
    <section className={styles.card}><h2>Allowlist / Blocklist</h2><form onSubmit={addRule} className={styles.fields}><select value={kind} onChange={(event) => setKind(event.target.value as 'allow' | 'block')}><option value="allow">Cho phép</option><option value="block">Chặn</option></select><input aria-label="IP hoặc CIDR" placeholder="192.168.1.0/24" required value={cidr} onChange={(event) => setCidr(event.target.value)} /><input aria-label="Lý do" placeholder="Lý do" value={reason} onChange={(event) => setReason(event.target.value)} /><button disabled={run.isPending}>Thêm</button></form>{data.data?.rules.map((rule) => <p key={rule.id}>{rule.kind === 'allow' ? 'Cho phép' : 'Chặn'} · {rule.cidr} · {rule.reason || '—'} <button type="button" onClick={() => run.mutate(() => rateLimitsApi.removeRule(rule.id))}>Xóa</button></p>)}</section>
    <section className={styles.card}><h2>IP đang bị chặn</h2>{data.data?.active_blocks.length ? data.data.active_blocks.map((block) => <p key={block.key}>{block.ip} · đến {new Date(block.until).toLocaleString('vi-VN')} <button type="button" onClick={() => run.mutate(() => rateLimitsApi.unblock(block.key))}>Gỡ chặn</button></p>) : <p>Không có IP bị chặn.</p>}</section>
  </main>;
}
