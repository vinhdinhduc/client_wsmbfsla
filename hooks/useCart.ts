import { useCartContext } from '@/contexts/CartContext';

/** Wrapper mong quanh CartContext - noi tap trung de cac component Public import. */
export function useCart() {
  return useCartContext();
}
