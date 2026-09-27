'use client';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { AUTH_TOKEN_STORAGE_KEY } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import styles from './page.module.scss';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [challenge, setChallenge] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [token, setToken] = useState('');
  const [expires, setExpires] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [failures, setFailures] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  const seconds = Math.max(0, Math.ceil((expires - now) / 1000));
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const strong =
    password.length >= 8 &&
    new TextEncoder().encode(password).length <= 72 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    heading.current?.focus();
    if (step === 2) inputs.current[0]?.focus();
  }, [step]);
  useEffect(() => {
    if (step !== 4) return;
    const timer = setTimeout(() => router.replace('/admin/login'), 2500);
    return () => clearTimeout(timer);
  }, [step, router]);
  async function run(action: () => Promise<void>) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function requestCode() {
    await run(async () => {
      const result = await authApi.requestReset(identifier.trim());
      setChallenge(result.challenge);
      setToken('');
      setDigits(Array(6).fill(''));
      setFailures(0);
      const start = Date.now();
      setNow(start);
      setExpires(start + result.expires_in * 1000);
      setResendAt(start + result.resend_after * 1000);
      setMessage(result.message);
      setStep(2);
      inputs.current[0]?.focus();
    });
  }
  function fill(index: number, value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 6 - index);
    setDigits((old) => {
      const next = [...old];
      if (!numbers) next[index] = '';
      else
        numbers.split('').forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      return next;
    });
    if (numbers) inputs.current[Math.min(5, index + numbers.length)]?.focus();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      void requestCode();
      return;
    }
    if (step === 2) {
      void run(async () => {
        try {
          const result = await authApi.verifyReset(challenge, digits.join(''));
          setToken(result.reset_token);
          setStep(3);
          setMessage('Mã OTP đã được xác nhận.');
        } catch (err) {
          setFailures((value) => value + 1);
          setDigits(Array(6).fill(''));
          inputs.current[0]?.focus();
          throw err;
        }
      });
      return;
    }
    if (!strong || password !== confirm) {
      setError('Mật khẩu chưa đủ mạnh hoặc xác nhận không khớp.');
      return;
    }
    void run(async () => {
      await authApi.resetPassword(challenge, token, password, confirm);
      try {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      } catch {
        /* Storage can be disabled. */
      }
      document.cookie = 'mfsl_token=; Max-Age=0; path=/';
      setPassword('');
      setConfirm('');
      setToken('');
      setStep(4);
      setMessage('Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập…');
    });
  }
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Image src="/logo.png" alt="MobiFone" width={210} height={36} priority />
        </div>
        <h1 ref={heading} tabIndex={-1}>
          Quên mật khẩu
        </h1>
        <ol className={styles.steps} aria-label="Các bước đặt lại mật khẩu">
          {['Tài khoản', 'Xác thực OTP', 'Mật khẩu mới'].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? 'step' : undefined}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        {message && (
          <p role="status" className={styles.message}>
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {step < 4 && (
          <form onSubmit={submit} className={styles.form} aria-busy={busy}>
            {step === 1 && (
              <label>
                Email hoặc tên đăng nhập
                <input
                  autoFocus
                  required
                  maxLength={100}
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </label>
            )}
            {step === 2 && (
              <>
                <fieldset disabled={busy || seconds === 0 || failures >= 5}>
                  <legend>Nhập mã OTP gồm 6 chữ số</legend>
                  <div className={styles.otp}>
                    {digits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(node) => {
                          inputs.current[index] = node;
                        }}
                        aria-label={`Chữ số OTP ${index + 1}`}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        value={digit}
                        onFocus={(event) => event.target.select()}
                        onChange={(event) => fill(index, event.target.value)}
                        onPaste={(event) => {
                          event.preventDefault();
                          fill(index, event.clipboardData.getData('text'));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Backspace' && !digit && index > 0) {
                            event.preventDefault();
                            inputs.current[index - 1]?.focus();
                            setDigits((old) => old.map((v, i) => (i === index - 1 ? '' : v)));
                          }
                          if (event.key === 'ArrowLeft')
                            inputs.current[Math.max(0, index - 1)]?.focus();
                          if (event.key === 'ArrowRight')
                            inputs.current[Math.min(5, index + 1)]?.focus();
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
                <p>
                  Hết hạn sau: {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                  {String(seconds % 60).padStart(2, '0')}
                </p>
                {failures >= 5 && (
                  <p role="alert">Đã nhập sai 5 lần. Vui lòng bắt đầu lại từ bước 1.</p>
                )}
                <button
                  className={styles.linkButton}
                  type="button"
                  disabled={busy || cooldown > 0 || failures >= 5}
                  onClick={() => void requestCode()}
                >
                  Gửi lại mã{cooldown > 0 ? ` (${cooldown}s)` : ''}
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <p id="password-hint">
                  Tối thiểu 8 ký tự, có chữ hoa, chữ thường và số; tối đa 72 byte.
                </p>
                <label>
                  Mật khẩu mới
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    aria-describedby="password-hint"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <label>
                  Xác nhận mật khẩu
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                  />
                </label>
              </>
            )}
            {step > 1 && seconds === 0 && (
              <p role="alert">Mã đã hết hạn. Vui lòng gửi lại mã hoặc bắt đầu lại.</p>
            )}
            <Button
              type="submit"
              isLoading={busy}
              disabled={
                step === 1
                  ? !identifier.trim()
                  : seconds === 0 ||
                    (step === 2
                      ? digits.some((v) => !v) || failures >= 5
                      : !strong || password !== confirm)
              }
            >
              {step === 1 ? 'Gửi mã OTP' : step === 2 ? 'Xác nhận OTP' : 'Đặt lại mật khẩu'}
            </Button>
            {step > 1 && (
              <button
                type="button"
                className={styles.linkButton}
                disabled={busy}
                onClick={() => {
                  setStep(1);
                  setToken('');
                  setError('');
                  setMessage('');
                }}
              >
                Bắt đầu lại từ bước 1
              </button>
            )}
          </form>
        )}
        <Link href="/admin/login" className={styles.back}>
          Quay về trang đăng nhập
        </Link>
      </div>
    </main>
  );
}
