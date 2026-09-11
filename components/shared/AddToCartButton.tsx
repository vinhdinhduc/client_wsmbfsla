'use client';

import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/types/order';
import styles from './AddToCartButton.module.scss';

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
      {inCart ? <Check className={styles.icon} /> : <ShoppingCart className={styles.icon} />}
      {disabled ? 'Hết hàng' : inCart ? 'Đã có trong giỏ hàng' : 'Đăng ký mua'}
    </Button>
  );
}
