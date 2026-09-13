'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField } from '@/components/ui/FormField';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { formatPrice } from '@/lib/format';
import { submitRegistrationAction, RegistrationActionState } from '@/actions/registration';
import { serializeCartItemsForSubmit } from '@/actions/cart';
import { CartItemRow } from './_components/CartItemRow';
import { SonLaAddressFields } from './_components/SonLaAddressFields';
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

export default function CartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem, totalPrice, clearCart } = useCart();
  const { getToken } = useRecaptcha();
  const { showToast } = useToast();
  const [state, formAction] = useFormState(submitRegistrationAction, INITIAL_STATE);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const step = searchParams.get('step') === 'product' ? 'product' : 'customer';

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
        <span className={styles.stepDone}>
          <b>1</b> Chọn gói cước
        </span>
        <span className={styles.stepDone}>
          <b>2</b> Thông tin sản phẩm
        </span>
        <span className={styles.stepDone}>
          <b>3</b> Thông tin khách hàng
        </span>
        <span className={styles.stepCurrent}>
          <b>4</b> Đặt hàng
        </span>
      </div>
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
      <h1 className={styles.title}>
        <ShoppingBag className={styles.titleIcon} />
        Giỏ hàng của bạn ({items.length})
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
              {step === 'product' ? `Thông tin sản phẩm (${items.length})` : 'Sản phẩm đã chọn'}
            </h2>
            <div className={styles.items}>
              {items.map((item) => (
                <CartItemRow key={item.key} item={item} onRemove={removeItem} />
              ))}
            </div>
            <div className={styles.summaryRow}>
              <span>Tạm tính</span>
              <span className={styles.summaryPrice}>{formatPrice(totalPrice)}</span>
            </div>
            {step === 'product' && (
              <Button
                type="button"
                size="lg"
                className={styles.submitWidth}
                onClick={() => router.push('/gio-hang?step=customer')}
              >
                Tiếp tục nhập thông tin khách hàng
              </Button>
            )}
          </div>

          {step === 'customer' && (
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
                <SonLaAddressFields />
                <TextField
                  name="delivery_address"
                  label="Địa chỉ nhận hàng"
                  placeholder="Số nhà, đường, bản/tổ"
                  required
                  error={state.fieldErrors?.delivery_address}
                />
                <TextareaField name="note" label="Ghi chú" placeholder="Ghi chú thêm (nếu có)" />
                <input ref={tokenInputRef} type="hidden" name="recaptcha_token" />
                <p className={styles.notice}>
                  Trang này được bảo vệ bởi reCAPTCHA và tuân theo Chính sách bảo mật và Điều khoản
                  dịch vụ của Google.
                </p>
                <SubmitButton />
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
