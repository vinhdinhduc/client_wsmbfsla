'use client';

import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/types/order';

export function AddToCartButton({
  item,
  className,
  disabled,
}: {
  item: CartItem;
  className?: string;
  disabled?: boolean;
}) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(item.key);

  return (
    <Button
      size="lg"
      variant={inCart ? 'outline' : 'primary'}
      className={className}
      disabled={inCart || disabled}
      onClick={() => addItem(item)}
    >
      {inCart ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
      {disabled ? 'Hết hàng' : inCart ? 'Đã có trong giỏ hàng' : 'Đăng ký mua'}
    </Button>
  );
}
