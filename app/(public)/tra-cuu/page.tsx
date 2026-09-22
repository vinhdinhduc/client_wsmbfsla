'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import styles from './page.module.scss';

interface LookupResult { code: string; customer_name: string; phone: string; status: string; created_at: string; total_amount: number }
const labels: Record<string, string> = { moi: 'Mới', dang_xu_ly: 'Đang xử lý', hoan_thanh: 'Hoàn thành', huy: 'Đã hủy' };
function LookupForm() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try { setResult(await apiFetch<LookupResult>('/public/registrations/lookup', { method: 'POST', body: { code: code.trim(), phone: phone.trim() } })); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  const download = async () => {
    try {
      const blob = await apiFetch<Blob>('/public/registrations/receipt', { method: 'POST', body: { code: code.trim(), phone: phone.trim() } });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `phieu-${code}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError((cause as Error).message); }
  };
  return <main className={styles.page}>
    <h1>Tra cứu đăng ký</h1><p>Nhập mã đăng ký và số điện thoại đã dùng khi gửi yêu cầu.</p>
    <form onSubmit={submit} className={styles.form}>
      <label>Mã đăng ký<input required value={code} onChange={(event) => setCode(event.target.value)} placeholder="DK-260922-0001" /></label>
      <label>Số điện thoại<input required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <button disabled={busy} type="submit">{busy ? 'Đang tra cứu…' : 'Tra cứu'}</button>
    </form>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {result && <section className={styles.result}><h2>{result.code}</h2><p>{result.customer_name} · {result.phone}</p><p>Trạng thái: <strong>{labels[result.status] || result.status}</strong></p><p>Tổng tiền: {Number(result.total_amount).toLocaleString('vi-VN')} ₫</p><button type="button" onClick={download}>Tải phiếu PDF</button></section>}
  </main>;
}
export default function LookupPage() { return <Suspense fallback={<main className={styles.page}>Đang tải…</main>}><LookupForm /></Suspense>; }
