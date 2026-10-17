'use client';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  UploadCloud,
  FileText,
  X,
  LoaderCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { jobsApi } from '@/lib/api/jobs';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { validateApplication, validateCv } from '@/lib/jobs-presentation';
import styles from '@/components/jobs/JobApplyForm.module.scss';

const initial = { full_name: '', phone: '', email: '', introduction: '' };
type Field = keyof typeof initial;
export function JobApplyForm({
  jobId,
  jobTitle,
  hotline = '18001090',
}: {
  jobId?: number;
  jobTitle?: string;
  hotline?: string;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const controller = useRef<AbortController>();
  const { getToken } = useRecaptcha();
  const dirty =
    !code && (Boolean(cv) || Object.values(values).some((value) => value.length > 0) || consent);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (code) successRef.current?.focus();
  }, [code]);
  useEffect(() => {
    if (!dirty) return;
    const warning = 'Bạn chưa gửi hồ sơ. Rời trang sẽ mất thông tin đang nhập. Tiếp tục rời trang?';
    let approvedNavigation = false;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (approvedNavigation) {
        approvedNavigation = false;
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    const leaveLink = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      const link = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        !/^https?:$/.test(link.protocol)
      )
        return;
      const current = new URL(window.location.href);
      if (
        link.origin === current.origin &&
        link.pathname === current.pathname &&
        link.search === current.search
      )
        return;
      approvedNavigation = window.confirm(warning);
      if (!approvedNavigation) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    // https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-navigate-event
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const leaveHistory = (event: Event) => {
      const history = event as Event & {
        navigationType?: string;
        hashChange?: boolean;
        destination?: { url: string };
      };
      if (
        history.navigationType !== 'traverse' ||
        !event.cancelable ||
        history.hashChange ||
        !history.destination
      )
        return;
      const target = new URL(history.destination.url);
      if (target.pathname === location.pathname && target.search === location.search) return;
      approvedNavigation = window.confirm(warning);
      if (!approvedNavigation) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    navigation?.addEventListener('navigate', leaveHistory);
    document.addEventListener('click', leaveLink, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      navigation?.removeEventListener('navigate', leaveHistory);
      document.removeEventListener('click', leaveLink, true);
    };
  }, [dirty]);

  function change(field: Field, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    if (touched[field])
      setErrors((previous) => ({ ...previous, [field]: validateApplication(next)[field] || '' }));
  }
  function blur(field: Field) {
    setTouched((previous) => ({ ...previous, [field]: true }));
    setErrors((previous) => ({ ...previous, [field]: validateApplication(values)[field] || '' }));
  }
  function selectFile(file?: File) {
    if (!file || pending) return;
    const error = validateCv(file);
    setErrors((previous) => ({ ...previous, cv: error || '' }));
    if (!error) setCv(file);
    if (fileInput.current) fileInput.current.value = '';
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const nextErrors = validateApplication(values);
    if (!cv) nextErrors.cv = 'Vui lòng chọn CV để gửi hồ sơ.';
    else {
      const error = validateCv(cv);
      if (error) nextErrors.cv = error;
    }
    if (!consent) nextErrors.agreed_terms = 'Bạn cần đồng ý xử lý dữ liệu để gửi hồ sơ.';
    setErrors(nextErrors);
    setTouched({ full_name: true, phone: true, email: true, introduction: true });
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        const field = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]:not([type="file"])',
        );
        (field || (nextErrors.cv ? document.getElementById('job-cv') : null))?.focus();
      });
      return;
    }
    inFlight.current = true;
    setPending(true);
    setProgress(0);
    setNotice('');
    controller.current = new AbortController();
    try {
      const form = new FormData(event.currentTarget);
      Object.entries(values).forEach(([key, value]) =>
        form.set(key, key === 'introduction' ? value : value.trim()),
      );
      if (jobId) form.set('job_id', String(jobId));
      form.set('cv', cv!);
      form.set('agreed_terms', 'true');
      form.set('recaptcha_token', await getToken('job_application'));
      const result = await jobsApi.apply(form, {
        onProgress: setProgress,
        signal: controller.current.signal,
      });
      setCode(result.code);
      setValues(initial);
      setCv(undefined);
      setConsent(false);
      window.dispatchEvent(new Event('job-application-submitted'));
    } catch (error) {
      if ((error as Error).name !== 'AbortError')
        setNotice((error as Error).message || 'Chưa thể gửi hồ sơ. Vui lòng thử lại.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  function fieldProps(field: Field) {
    return {
      id: `job-${field}`,
      name: field,
      value: values[field],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        change(field, event),
      onBlur: () => blur(field),
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': `job-${field}-hint${errors[field] ? ` job-${field}-error` : ''}`,
    };
  }
  function error(field: string) {
    return errors[field] ? (
      <p id={`job-${field}-error`} className={styles.error}>
        {errors[field]}
      </p>
    ) : null;
  }

  if (code)
    return (
      <div
        id="application"
        ref={successRef}
        className={styles.success}
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <CheckCircle2 size={44} aria-hidden="true" />
        <h2>Đã gửi hồ sơ thành công</h2>
        <p>
          Hồ sơ của bạn đã được tiếp nhận
          {jobTitle ? ` cho vị trí ${jobTitle}` : ' vào nguồn ứng viên'}.
        </p>
        <div className={styles.applicationCode}>
          Mã hồ sơ <strong>{code}</strong>
        </div>
        <p>
          Hãy giữ mã hồ sơ. Bộ phận tuyển dụng sẽ xem xét và liên hệ khi có bước tiếp theo phù hợp.
        </p>
        <a href={`tel:${hotline.replace(/[^\d+]/g, '')}`}>
          <Phone size={18} aria-hidden="true" />
          Hỗ trợ: {hotline}
        </a>
      </div>
    );
  return (
    <form
      id="application"
      ref={formRef}
      tabIndex={-1}
      onSubmit={submit}
      className={styles.form}
      aria-busy={pending}
      noValidate
    >
      <header>
        <p className={styles.eyebrow}>Bắt đầu hành trình của bạn</p>
        <h2>Hồ sơ ứng tuyển</h2>
        <p>
          Chia sẻ thông tin để MobiFone Sơn La có thể liên hệ với bạn. Các trường có dấu{' '}
          <span aria-hidden="true">*</span> là bắt buộc.
        </p>
      </header>
      <fieldset disabled={pending}>
        <div className={styles.field}>
          <label htmlFor="job-full_name">
            Họ và tên <span aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps('full_name')}
            autoComplete="name"
            required
            maxLength={100}
            placeholder="Nhập họ và tên của bạn"
          />
          <p id="job-full_name-hint" className={styles.hint}>
            Ít nhất 2 ký tự, theo tên trên hồ sơ của bạn.
          </p>
          {error('full_name')}
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="job-phone">
              Số điện thoại <span aria-hidden="true">*</span>
            </label>
            <input
              {...fieldProps('phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={24}
              placeholder="0912 345 678"
            />
            <p id="job-phone-hint" className={styles.hint}>
              VD: 0912 345 678 (chấp nhận +84).
            </p>
            {error('phone')}
          </div>
          <div className={styles.field}>
            <label htmlFor="job-email">
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              {...fieldProps('email')}
              type="email"
              autoComplete="email"
              required
              maxLength={150}
              placeholder="ban@example.com"
            />
            <p id="job-email-hint" className={styles.hint}>
              Địa chỉ email để nhận thông tin tuyển dụng.
            </p>
            {error('email')}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="job-introduction">Giới thiệu về bạn</label>
          <textarea
            {...fieldProps('introduction')}
            rows={4}
            maxLength={1000}
            placeholder="Kinh nghiệm, kỹ năng hoặc lý do bạn muốn ứng tuyển…"
          />
          <div id="job-introduction-hint" className={styles.hintRow}>
            <span>Tối đa 1.000 ký tự.</span>
            <span aria-label={`Đã nhập ${values.introduction.length} trên 1000 ký tự`}>
              {values.introduction.length}/1000
            </span>
          </div>
          {error('introduction')}
        </div>
        <div className={styles.field}>
          <label htmlFor="job-cv-file">
            CV ứng tuyển <span aria-hidden="true">*</span>
          </label>
          <div
            className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${errors.cv ? styles.invalidDropzone : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!pending) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              selectFile(event.dataTransfer.files[0]);
            }}
          >
            <UploadCloud size={28} aria-hidden="true" />
            <p>Kéo thả CV vào đây hoặc</p>
            <button
              id="job-cv"
              type="button"
              onClick={() => fileInput.current?.click()}
              aria-describedby={`job-cv-hint${errors.cv ? ' job-cv-error' : ''}`}
            >
              Chọn tệp
            </button>
            <input
            id="job-cv-file"
            required
              aria-invalid={Boolean(errors.cv)}
              aria-describedby={`job-cv-hint${errors.cv ? ' job-cv-error' : ''}`}
              ref={fileInput}
              type="file"
              tabIndex={-1}
              className={styles.fileInput}
              aria-label="Chọn CV PDF hoặc DOCX"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            <p id="job-cv-hint" className={styles.hint}>
              PDF/DOCX, tối đa 5MB
            </p>
          </div>
          {cv && (
            <div className={styles.selectedFile}>
              <FileText size={22} aria-hidden="true" />
              <div>
                <strong>{cv.name}</strong>
                <span>
                  {(cv.size / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} MB
                </span>
              </div>
              <button type="button" aria-label="Xóa tệp CV" onClick={() => setCv(undefined)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          )}
          {error('cv')}
          {pending && (
            <div className={styles.progress} aria-live="polite">
              <progress value={progress} max={100} aria-label="Tiến trình tải CV" />
              <span>
                {progress < 100 ? `Đang tải CV: ${progress}%` : 'Đã tải CV. Đang xác nhận hồ sơ…'}
              </span>
            </div>
          )}
        </div>
        <input
          name="website"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className={styles.honeypot}
        />
        <div className={styles.privacy}>
          <label htmlFor="job-consent">
            <input
              id="job-consent"
              name="agreed_terms"
              value="true"
              type="checkbox"
              checked={consent}
              required
              aria-invalid={Boolean(errors.agreed_terms)}
              aria-describedby={errors.agreed_terms ? 'job-agreed_terms-error' : 'job-privacy'}
              onChange={(event) => {
                setConsent(event.target.checked);
                setErrors((previous) => ({ ...previous, agreed_terms: '' }));
              }}
            />
            <span>
              Tôi đồng ý cho MobiFone Sơn La thu thập và xử lý dữ liệu cá nhân để phục vụ tuyển
              dụng, theo{' '}
              <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener noreferrer">
                Chính sách bảo mật
              </a>
              .
            </span>
          </label>
          {error('agreed_terms')}
          <p id="job-privacy">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>
              Thông tin chỉ phục vụ tuyển dụng. Theo chính sách bảo mật, hồ sơ được lưu tối đa 12
              tháng kể từ khi kết thúc đợt tuyển dụng, trừ khi bạn đồng ý lưu lâu hơn hoặc chuyển
              thành hồ sơ nhân sự.
            </span>
          </p>
        </div>
        <button type="submit" className={styles.submit} disabled={!consent || pending}>
          {pending && <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" />}
          {pending ? 'Đang gửi…' : 'Gửi hồ sơ ứng tuyển'}
        </button>
      </fieldset>
      {notice && (
        <div className={styles.notice} role="alert" aria-live="assertive">
          {notice}
          <p>Thông tin và CV đã chọn vẫn được giữ. Bạn có thể kiểm tra và thử gửi lại.</p>
        </div>
      )}
    </form>
  );
}
