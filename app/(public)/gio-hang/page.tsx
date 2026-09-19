'use client';

import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  Smartphone,
  ShieldCheck,
  Clock3,
  LockKeyhole,
  Plus,
  Wifi,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField } from '@/components/ui/FormField';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { formatPrice, toPriceNumber } from '@/lib/format';
import { submitRegistrationAction, RegistrationActionState } from '@/actions/registration';
import { serializeCartItemsForSubmit } from '@/actions/cart';
import { CartItemRow } from './_components/CartItemRow';
import { SonLaAddressFields } from './_components/SonLaAddressFields';
import { storesApi } from '@/lib/api/stores';
import { useQuery } from '@tanstack/react-query';
import styles from './page.module.scss';

const INITIAL_STATE: RegistrationActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className={styles.submitWidth} isLoading={pending}>
      Gửi đăng ký
    </Button>
  );
}

function OrderSummary({
  simCount,
  simTotal,
  packageTotal,
  totalPrice,
}: {
  simCount: number;
  simTotal: number;
  packageTotal: number;
  totalPrice: number;
}) {
  return (
    <aside className={styles.orderSummary}>
      <div className={styles.summaryHeading}>
        <h2 className={styles.sectionTitle}>Tóm tắt đơn hàng</h2>
        <CreditCard className={styles.summaryHeadingIcon} />
      </div>
      <div className={styles.orderLine}>
        <span>
          <Smartphone /> Phí hòa mạng ({simCount} SIM)
        </span>
        <strong>{formatPrice(simTotal)}</strong>
      </div>
      <div className={styles.orderLine}>
        <span>
          <Wifi /> Giá gói cước
        </span>
        <strong>{formatPrice(packageTotal)}</strong>
      </div>
      <div className={styles.orderLine}>
        <span>Phí vận chuyển</span>
        <strong className={styles.freePrice}>Miễn phí</strong>
      </div>
      <div className={styles.orderTotal}>
        <span>TỔNG TIỀN</span>
        <strong>{formatPrice(totalPrice)}</strong>
      </div>
    </aside>
  );
}

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem, clearCart } = useCart();
  const { getToken } = useRecaptcha();
  const { showToast } = useToast();
  const [state, formAction] = useFormState(submitRegistrationAction, INITIAL_STATE);
  const tokenInputRef = useRef<HTMLInputElement>(null);
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
  const cartLines = simItems.map((item, index) => ({
    sim: item,
    packageItem: getPackageForSim(item.reference_id, index),
  }));
  const simTotal = cartLines.reduce((sum, line) => sum + toPriceNumber(line.sim.price), 0);
  const packageTotal = cartLines.reduce(
    (sum, line) => sum + toPriceNumber(line.packageItem?.price),
    0,
  );
  const displayedTotal = simTotal + packageTotal;
  const requestedStep = searchParams.get('step');
  const step = requestedStep === 'customer' ? 'customer' : 'product';
  const activeStep = step === 'product' ? 2 : 3;

  useEffect(() => {
    if (!items.length || !hasSim) return;
    if (!hasPackage) {
      router.replace('/goi-cuoc');
    } else if (requestedStep !== 'product' && requestedStep !== 'customer') {
      router.replace('/gio-hang?step=product');
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
      formAction(formData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xác thực reCAPTCHA', 'error');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.stepper} aria-label="Tiến trình đăng ký">
        <span
          className={styles.progressBar}
          style={{ '--progress-width': `${((activeStep - 1) / 3) * 100}%` } as CSSProperties}
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
        <span className={styles.stepPending}>
          <b>
            <CreditCard />
          </b>{' '}
          Xác nhận đặt hàng
        </span>
      </div>
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
      <h1 className={styles.title}>
        <ShoppingBag className={styles.titleIcon} />
        Giỏ hàng của bạn ({simItems.length})
      </h1>

      {state.status === 'success' ? (
        <div className={styles.successState}>
          <p className={styles.successMessage}>{state.message}</p>
          <Link href="/" className={styles.link}>
            Quay về trang chủ
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Giỏ hàng của bạn đang trống</p>
          <Link href="/goi-cuoc" className={styles.link}>
            Xem gói cước ngay
          </Link>
        </div>
      ) : (
        <div className={step === 'product' ? styles.productStep : styles.grid}>
          <div className={styles.cartBox}>
            <h2 className={styles.sectionTitle}>
              {step === 'product' ? `Giỏ hàng (${simItems.length} sản phẩm)` : 'Sản phẩm đã chọn'}
            </h2>
            {step === 'product' && (
              <div className={styles.cartHeader} aria-hidden="true">
                <span>Sản phẩm</span>
                <span>Thuê bao</span>
                <span>Phí hòa mạng</span>
                <span>Giá gói cước</span>
                <span>Thành tiền</span>
              </div>
            )}
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
            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span className={styles.summaryPrice}>{formatPrice(displayedTotal)}</span>
            </div>
            {step === 'product' && (
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
                  onClick={() => router.push('/gio-hang?step=customer')}
                >
                  Tiếp tục
                </Button>
              </div>
            )}
            {step === 'product' && (
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
            )}
          </div>

          {step === 'product' && (
            <OrderSummary
              simCount={simItems.length}
              simTotal={simTotal}
              packageTotal={packageTotal}
              totalPrice={displayedTotal}
            />
          )}

          {step === 'customer' && (
            <>
              <form action={handleAction} className={styles.formBox}>
                <h2 className={styles.sectionTitle}>Thông tin đăng ký</h2>
                <div className={styles.form}>
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
                    required
                    error={state.fieldErrors?.email}
                  />
                  <fieldset className={styles.choiceGroup}>
                    <legend>Hình thức nhận hàng</legend>
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
                        label="Địa chỉ nhận hàng"
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
                          {storesLoading ? 'Đang tải cửa hàng...' : 'Chọn cửa hàng MobiFone Sơn La'}
                        </option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.name}>
                            {store.name} - {store.address}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
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
                  <TextareaField name="note" label="Ghi chú" placeholder="Ghi chú thêm (nếu có)" />
                  <input ref={tokenInputRef} type="hidden" name="recaptcha_token" />
                  <p className={styles.notice}>
                    Trang này được bảo vệ bởi reCAPTCHA và tuân theo Chính sách bảo mật và Điều
                    khoản dịch vụ của Google.
                  </p>
                  <SubmitButton />
                </div>
              </form>
              <OrderSummary
                simCount={simItems.length}
                simTotal={simTotal}
                packageTotal={packageTotal}
                totalPrice={displayedTotal}
              />
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
