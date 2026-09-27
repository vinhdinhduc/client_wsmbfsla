'use client';
import { TermsConsent } from '@/components/shared/TermsConsent';
import styles from '@/styles/service-pages.module.scss';
import { Button } from '@/components/ui/Button';
import { FormEvent, useState } from 'react';
import { jobsApi } from '@/lib/api/jobs';
import { useRecaptcha } from '@/hooks/useRecaptcha';
export function JobApplyForm({ jobId }: { jobId?: number }) {
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState('');
  const [pending, setPending] = useState(false);
  const { getToken } = useRecaptcha();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const element = e.currentTarget;
    setPending(true);
    setState('Đang gửi…');
    try {
      const form = new FormData(element);
      if (jobId) form.set('job_id', String(jobId));
      form.set('recaptcha_token', await getToken('job_application'));
      const result = await jobsApi.apply(form);
      setState(`Đã nhận hồ sơ. Mã: ${result.code}`);
      element.reset();
      setConsent(false);
    } catch (error) {
      setState((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form} aria-busy={pending}>
      <div>
        <h2>Hồ sơ ứng tuyển</h2>
        <p>Chia sẻ thông tin để MobiFone Sơn La có thể liên hệ với bạn.</p>
      </div>
      <label>
        Họ tên
        <input
          name="full_name"
          autoComplete="name"
          placeholder="Nhập họ và tên của bạn"
          required
          maxLength={100}
        />
      </label>
      <label>
        Số điện thoại
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="Nhập số điện thoại"
          required
          pattern="(0|\+84)[0-9]{9}"
        />
      </label>
      <label>
        Email
        <input
          name="email"
          autoComplete="email"
          placeholder="ban@example.com"
          required
          type="email"
        />
      </label>
      <label>
        Giới thiệu
        <textarea name="introduction" maxLength={2000} />
      </label>
      <label>
        CV PDF/DOCX tối đa 5MB
        <input name="cv" type="file" accept=".pdf,.docx" required />
      </label>

      <input
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: -10000 }}
      />
      <TermsConsent checked={consent} onChange={setConsent} value="true" />
      <Button type="submit" isLoading={pending} disabled={!consent}>
        Gửi hồ sơ ứng tuyển
      </Button>
      {state && (
        <p className={styles.notice} role="status">
          {state}
        </p>
      )}
    </form>
  );
}
