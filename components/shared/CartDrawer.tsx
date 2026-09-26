'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { CartProductIcon } from './CartProductIcon';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/format';
import styles from './CartDrawer.module.scss';

const TYPE_LABEL: Record<string, string> = {
  sim: 'Sim số',
  goi_cuoc: 'Gói cước',
  giai_phap: 'Giải pháp',
  solution_plan: 'Gói giải pháp',
};

export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, totalPrice } = useCart();
  const prefersReducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(closeDrawer);
  closeRef.current = closeDrawer;
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const controls = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [isDrawerOpen]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={styles.overlay}
            onClick={closeDrawer}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 400, damping: 25 }
            }
            className={styles.aside}
            aria-label="Giỏ hàng"
          >
            <div className={styles.header}>
              <h2 className={styles.title}>
                <ShoppingBag className={styles.titleIcon} />
                Giỏ hàng ({items.length})
              </h2>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Đóng giỏ hàng"
                className={styles.closeButton}
              >
                <X className={styles.closeIcon} />
              </button>
            </div>

            <div className={styles.body}>
              {items.length === 0 ? (
                <div className={styles.empty}>
                  <ShoppingBag size={48} aria-hidden="true" />
                  <h3>Giỏ hàng đang trống</h3>
                  <p>Chọn SIM số đẹp hoặc gói cước phù hợp để bắt đầu.</p>
                  <Link href="/sim-so-dep" onClick={closeDrawer} className={styles.checkout}>
                    Khám phá SIM số <ArrowRight size={18} />
                  </Link>
                </div>
              ) : (
                <ul className={styles.list}>
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.li
                        key={item.key}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        className={styles.item}
                      >
                        <CartProductIcon type={item.type} />
                        <div className={styles.itemDetails}>
                          <p className={styles.itemType}>{TYPE_LABEL[item.type]}</p>
                          <p className={styles.itemName}>{item.name}</p>
                          <p className={styles.itemPrice}>
                            {item.price === null ? 'Liên hệ tư vấn' : formatPrice(item.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                          className={styles.removeButton}
                        >
                          <Trash2 className={styles.removeIcon} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className={styles.footer}>
                <div className={styles.summary}>
                  <span>Tạm tính</span>
                  <span className={styles.summaryPrice}>{formatPrice(totalPrice)}</span>
                </div>
                {items.some((item) => item.price === null) && (
                  <p className={styles.note}>Chưa bao gồm sản phẩm cần liên hệ báo giá.</p>
                )}
                <Link href="/gio-hang" onClick={closeDrawer} className={styles.checkout}>
                  Tiến hành đăng ký <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <p className={styles.note}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  Nhân viên sẽ liên hệ xác nhận đăng ký
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
