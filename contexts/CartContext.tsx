'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CartItem } from '@/types/order';

const CART_STORAGE_KEY = 'mfsl_cart_items';

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalPrice: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  isInCart: (key: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage hong/khong hop le - bat dau tu gio hang rong
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  // Muc 16: gio hang KHONG goi API khi them/xoa - chi cap nhat Context + localStorage.
  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => (prev.some((p) => p.key === item.key) ? prev : [...prev, item]));
    setIsDrawerOpen(true);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback((key: string) => items.some((p) => p.key === key), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      totalPrice: items.reduce((sum, item) => sum + (item.price ?? 0), 0),
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      addItem,
      removeItem,
      clearCart,
      isInCart,
    }),
    [items, isDrawerOpen, addItem, removeItem, clearCart, isInCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext phai duoc dung ben trong <CartProvider>');
  return ctx;
}
