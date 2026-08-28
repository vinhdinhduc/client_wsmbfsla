'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = { sim: 'Sim số', goi_cuoc: 'Gói cước', giai_phap: 'Giải pháp' };

export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, totalPrice } = useCart();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-50 bg-neutral-900/50"
            onClick={closeDrawer}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }
            }
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-md"
            aria-label="Giỏ hàng"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
                <ShoppingBag className="h-5 w-5" />
                Giỏ hàng ({items.length})
              </h2>
              <button type="button" onClick={closeDrawer} aria-label="Đóng giỏ hàng" className="relative before:absolute before:-inset-2 before:content-['']">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <p className="py-10 text-center text-neutral-500">Giỏ hàng của bạn đang trống</p>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.li
                        key={item.key}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        className="flex items-center justify-between gap-2 rounded-lg border border-neutral-100 p-3"
                      >
                        <div>
                          <p className="text-xs text-neutral-500">{TYPE_LABEL[item.type]}</p>
                          <p className="font-medium text-neutral-900">{item.name}</p>
                          <p className="text-sm font-semibold text-accent">{formatPrice(item.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                          className="relative text-neutral-500 hover:text-danger before:absolute before:-inset-2 before:content-['']"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-3 border-t border-neutral-100 p-4">
                <div className="flex items-center justify-between font-semibold text-neutral-900">
                  <span>Tạm tính</span>
                  <span className="text-accent">{formatPrice(totalPrice)}</span>
                </div>
                <Link
                  href="/gio-hang"
                  onClick={closeDrawer}
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-primary font-medium text-white transition-colors duration-150 hover:bg-primary-dark"
                >
                  Tiến hành đăng ký
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
