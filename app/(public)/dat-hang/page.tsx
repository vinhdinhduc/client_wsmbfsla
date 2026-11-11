'use client';
import { TermsConsent } from '@/components/shared/TermsConsent';

import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ClipboardList,
  Package,
  ShoppingBag,
  Smartphone,
  ShieldCheck,
  Clock3,
  LockKeyhole,
  Plus,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField } from '@/components/ui/FormField';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { submitRegistrationAction, RegistrationActionState } from '@/actions/registration';
import { serializeCartItemsForSubmit } from '@/actions/cart';
import { CartItemRow } from '../gio-hang/_components/CartItemRow';
import { SonLaAddressFields } from '../gio-hang/_components/SonLaAddressFields';
import { storesApi } from '@/lib/api/stores';
import { useQuery } from '@tanstack/react-query';
import styles from '../gio-hang/page.module.scss';

const INITIAL_STATE: RegistrationActionState = { status: 'idle' };

function SubmitButton({ consent }: { consent: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className={styles.submitWidth}
      isLoading={pending}
      disabled={!consent}
    >
      Tiếp tục
    </Button>
  );
}

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem, clearCart } = useCart();
  const { getToken } = useRecaptcha();
  const { showToast } = useToast();
  const [consent, setConsent] = useState(false);
  const [state, formAction] = useFormState(submitRegistrationAction, INITIAL_STATE);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'address' | 'store'>('address');
  const [simType, setSimType] = useState<'physical' | 'esim'>('physical');
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['public-stores-son-la'],
    queryFn: () => storesApi.listPublic(),
    enabled: deliveryMethod === 'store',
  });
  const hasSim = items.some((item) => item.type === 'sim');
  const hasPackage = items.some((item) => item.type === 'goi_cuoc');
  const simItems = items.filter((item) => item.type === 'sim');
  const packageItems = items.filter((item) => item.type === 'goi_cuoc');
  const getPackageForSim = (simReferenceId: number, index: number) =>
    packageItems.find((item) => item.sim_reference_id === simReferenceId) ??
    (simItems.length === 1 ? packageItems[0] : packageItems[index]);
  const requestedStep = searchParams.get('step');
  const step = requestedStep === 'customer' ? 'customer' : 'product';
  const activeStep = step === 'product' ? 2 : 3;

  useEffect(() => {
    if (!items.length || !hasSim) return;
    if (!hasPackage) {
      router.replace('/goi-cuoc');
    } else if (requestedStep !== 'product' && requestedStep !== 'customer') {
      router.replace('/dat-hang?step=product');
    }
  }, [hasPackage, hasSim, items.length, requestedStep, router]);

  useEffect(() => {
    if (state.status === 'success') {
      showToast(state.message ?? 'Đăng ký thành công', 'success');
      clearCart();
    } else if (state.status === 'error' && state.message && !state.fieldErrors) {
      showToast(state.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleAction(formData: FormData) {
    try {
      const token = await getToken('submit_registration');
      formData.set('recaptcha_token', token);
      formData.set('items', serializeCartItemsForSubmit(items));
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          globalThis.crypto?.randomUUID?.() ||
          (globalThis.crypto?.getRandomValues
            ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) =>
                byte.toString(16).padStart(2, '0'),
              ).join('')
            : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
      }
      formData.set('idempotency_key', idempotencyKeyRef.current);
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const value = searchParams.get(key);
        if (value) formData.set(key, value);
      }
      formAction(formData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xác thực reCAPTCHA', 'error');
    }
  }

  return (
    <div className={styles.page}>
      {state.status !== 'success' && (
        <>
          <div className={styles.stepper} aria-label="Tiến trình đăng ký">
            <span
              className={styles.progressBar}
              style={
                { '--progress-width': `${((activeStep - 1) / 2) * (200 / 3)}%` } as CSSProperties
              }
              aria-hidden="true"
            />
            <span className={activeStep > 1 ? styles.stepDone : styles.stepCurrent}>
              <b>
                <Check />
              </b>{' '}
              Chọn gói cước
            </span>
            <span className={activeStep > 2 ? styles.stepDone : styles.stepCurrent}>
              <b>
                <Package />
              </b>{' '}
              Thông tin sản phẩm
            </span>
            <span className={activeStep === 3 ? styles.stepCurrent : styles.stepPending}>
              <b>
                <ClipboardList />
              </b>{' '}
              Thông tin khách hàng
            </span>
          </div>
          <Breadcrumb items={[{ label: 'Thông tin tư vấn' }]} />
          <h1 className={styles.title}>
            <ShoppingBag className={styles.titleIcon} />
            Thông tin tư vấn của bạn ({simItems.length})
          </h1>
        </>
      )}

      {state.status === 'success' ? (
        <div className={styles.successState}>
          <h1 className={styles.successMessage}>{state.message}</h1>
          {state.registrationCode && (
            <p>
              Mã đăng ký: <strong>{state.registrationCode}</strong>. Vui lòng lưu mã để tra cứu.
            </p>
          )}
          <div className={styles.successActions}>
            {state.registrationCode && (
              <Link
                href={`/tra-cuu?code=${encodeURIComponent(state.registrationCode)}`}
                className={styles.link}
              >
                Tra cứu tình trạng và tải phiếu
              </Link>
            )}
            <Link href="/" className={styles.link}>
              Quay về trang chủ
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Chưa có thông tin tư vấn</p>
          <Link href="/goi-cuoc" className={styles.link}>
            Xem gói cước ngay
          </Link>
        </div>
      ) : (
        <div className={step === 'product' ? styles.productStep : styles.customerLayout}>
          {step === 'product' && (
            <div className={styles.cartBox}>
              <h2 className={styles.sectionTitle}>Thông tin tư vấn ({simItems.length} sản phẩm)</h2>
              <div className={styles.cartHeader} aria-hidden="true">
                <span>Sản phẩm</span>
                <span>Thuê bao</span>
              </div>
              <div className={styles.items}>
                {simItems.map((item, index) => (
                  <CartItemRow
                    key={item.key}
                    item={item}
                    packageItem={getPackageForSim(item.reference_id, index)}
                    onRemove={removeItem}
                  />
                ))}
              </div>
              <div className={styles.cartActions}>
                <Button
                  type="button"
                  size="lg"
                  className={styles.addNumberButton}
                  onClick={() => router.push('/sim-so-dep')}
                >
                  <Plus /> Thêm số khác
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className={styles.submitWidth}
                  onClick={() => router.push('/dat-hang?step=customer')}
                >
                  Tiếp tục
                </Button>
              </div>
              <div className={styles.benefits}>
                <div>
                  <ShieldCheck />
                  <span>
                    <b>SIM chính chủ</b>
                    <small>Đăng ký nhanh chóng</small>
                  </span>
                </div>
                <div>
                  <Clock3 />
                  <span>
                    <b>Giữ số 48 giờ</b>
                    <small>Hoàn tiền nếu không hài lòng</small>
                  </span>
                </div>
                <div>
                  <LockKeyhole />
                  <span>
                    <b>Bảo mật thông tin</b>
                    <small>Thông tin được bảo mật tuyệt đối</small>
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 'customer' && (
            <>
              <form action={handleAction} className={styles.formBox}>
                <h2 className={styles.sectionTitle}>Thông tin đăng ký</h2>
                <p className={styles.formIntro}>
                  Vui lòng điền thông tin để hoàn tất đăng ký. Các trường có dấu{' '}
                  <span className={styles.requiredMark}>*</span> là bắt buộc.
                </p>
                <div className={styles.form}>
                  <section className={styles.formSection} aria-labelledby="contact-heading">
                    <h3 id="contact-heading" className={styles.groupTitle}>
                      Thông tin liên hệ
                    </h3>
                    <div className={styles.contactGrid}>
                      <TextField
                        name="customer_name"
                        label="Họ tên"
                        placeholder="Nguyễn Văn A"
                        required
                        error={state.fieldErrors?.customer_name}
                      />
                      <TextField
                        name="phone"
                        label="Số điện thoại"
                        placeholder="09xxxxxxxx"
                        required
                        error={state.fieldErrors?.phone}
                      />
                      <TextField
                        name="email"
                        type="email"
                        label="Email"
                        placeholder="email@example.com"
                        error={state.fieldErrors?.email}
                      />
                      <label className={styles.addressField}>
                        <span>Loại khách hàng</span>
                        <select name="customer_type" defaultValue="individual">
                          <option value="individual">Cá nhân</option>
                          <option value="business">Doanh nghiệp</option>
                        </select>
                      </label>
                    </div>
                  </section>
                  <section className={styles.formSection} aria-labelledby="delivery-heading">
                    <h3 id="delivery-heading" className={styles.groupTitle}>
                      Địa chỉ nhận SIM
                    </h3>
                    <fieldset className={styles.choiceGroup}>
                      <legend>Hình thức nhận SIM</legend>
                      <label>
                        <input
                          type="radio"
                          name="delivery_method"
                          value="address"
                          checked={deliveryMethod === 'address'}
                          onChange={() => setDeliveryMethod('address')}
                        />
                        Nhận tại địa chỉ yêu cầu
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="delivery_method"
                          value="store"
                          checked={deliveryMethod === 'store'}
                          onChange={() => setDeliveryMethod('store')}
                        />
                        Nhận tại cửa hàng
                      </label>
                    </fieldset>
                    {deliveryMethod === 'address' ? (
                      <>
                        <SonLaAddressFields />
                        <TextField
                          name="delivery_address"
                          label="Địa chỉ nhận SIM"
                          placeholder="Số nhà, đường, bản/tổ"
                          required
                          error={state.fieldErrors?.delivery_address}
                        />
                      </>
                    ) : (
                      <label className={styles.addressField}>
                        <span>
                          Cửa hàng nhận SIM <b className={styles.requiredMark}>*</b>
                        </span>
                        <select name="delivery_store" required disabled={storesLoading}>
                          <option value="">
                            {storesLoading
                              ? 'Đang tải cửa hàng...'
                              : 'Chọn cửa hàng MobiFone Sơn La'}
                          </option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.name}>
                              {store.name} - {store.address}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </section>
                  <section className={styles.formSection} aria-labelledby="sim-heading">
                    <h3 id="sim-heading" className={styles.groupTitle}>
                      Tùy chọn SIM
                    </h3>
                    <fieldset className={styles.choiceGroup}>
                      <legend>Loại SIM</legend>
                      <label>
                        <input
                          type="radio"
                          name="sim_type"
                          value="physical"
                          checked={simType === 'physical'}
                          onChange={() => setSimType('physical')}
                        />
                        SIM vật lý
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="sim_type"
                          value="esim"
                          checked={simType === 'esim'}
                          onChange={() => setSimType('esim')}
                        />
                        eSIM
                      </label>
                    </fieldset>
                    <TextareaField
                      name="note"
                      label="Ghi chú"
                      placeholder="Ghi chú thêm (nếu có)"
                    />
                  </section>
                  <div className={styles.terms}>
                    <TermsConsent
                      checked={consent}
                      onChange={setConsent}
                      error={state.fieldErrors?.agreed_terms}
                    />
                  </div>
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    className={styles.honeypot}
                    aria-hidden="true"
                  />
                  <input ref={tokenInputRef} type="hidden" name="recaptcha_token" />
                  <p className={styles.notice}>
                    Trang này được bảo vệ bởi reCAPTCHA và tuân theo Chính sách bảo mật và Điều
                    khoản dịch vụ của Google.
                  </p>
                  <div className={styles.customerActions}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dat-hang?step=product')}
                    >
                      Quay lại
                    </Button>
                    <div className={styles.continueAction}>
                      <div className={styles.validSubmit}>
                        <SubmitButton consent={consent} />
                      </div>
                      <Button
                        type="button"
                        size="lg"
                        disabled
                        className={`${styles.submitWidth} ${styles.invalidSubmit}`}
                      >
                        Gửi yêu cầu liên hệ
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className={styles.page} aria-busy="true" />}>
      <CartPageContent />
    </Suspense>
  );
}
