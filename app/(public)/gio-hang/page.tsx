'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
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

const INITIAL_STATE: RegistrationActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" isLoading={pending}>
      Gửi đăng ký
    </Button>
  );
}

export default function CartPage() {
  const { items, removeItem, totalPrice, clearCart } = useCart();
  const { getToken } = useRecaptcha();
  const { showToast } = useToast();
  const [state, formAction] = useFormState(submitRegistrationAction, INITIAL_STATE);
  const tokenInputRef = useRef<HTMLInputElement>(null);

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
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />
      <h1 className="mb-6 mt-3 flex items-center gap-2 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
        <ShoppingBag className="h-6 w-6" />
        Giỏ hàng của bạn ({items.length})
      </h1>

      {state.status === 'success' ? (
        <div className="rounded-lg border border-success/30 bg-success/5 py-16 text-center">
          <p className="font-heading text-lg font-semibold text-success">{state.message}</p>
          <Link href="/" className="mt-4 inline-block text-primary hover:underline">
            Quay về trang chủ
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-neutral-100 bg-white py-16 text-center">
          <p className="text-neutral-500">Giỏ hàng của bạn đang trống</p>
          <Link href="/goi-cuoc" className="mt-4 inline-block text-primary hover:underline">
            Xem gói cước ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="rounded-lg border border-neutral-100 bg-white p-5 lg:col-span-3">
            <h2 className="font-heading text-lg font-semibold text-neutral-900">Sản phẩm đã chọn</h2>
            <div className="mt-2">
              {items.map((item) => (
                <CartItemRow key={item.key} item={item} onRemove={removeItem} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 font-semibold text-neutral-900">
              <span>Tạm tính</span>
              <span className="text-lg text-accent">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <form action={handleAction} className="space-y-4 rounded-lg border border-neutral-100 bg-white p-5 lg:col-span-2">
            <h2 className="font-heading text-lg font-semibold text-neutral-900">Thông tin đăng ký</h2>
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
            <TextareaField name="note" label="Ghi chú" placeholder="Ghi chú thêm (nếu có)" />
            <input ref={tokenInputRef} type="hidden" name="recaptcha_token" />
            <p className="text-xs text-neutral-500">
              Trang này được bảo vệ bởi reCAPTCHA và tuân theo Chính sách bảo mật và Điều khoản dịch vụ của Google.
            </p>
            <SubmitButton />
          </form>
        </div>
      )}
    </div>
  );
}
