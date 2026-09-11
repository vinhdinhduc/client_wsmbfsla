'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/format';
import styles from './CartDrawer.module.scss';

const TYPE_LABEL: Record<string, string> = {
  sim: 'Sim số',
  goi_cuoc: 'Gói cước',
  giai_phap: 'Giải pháp',
};

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
            className={styles.overlay}
            onClick={closeDrawer}
          />
          <motion.aside
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
                <p className={styles.empty}>Giỏ hàng của bạn đang trống</p>
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
                        <div>
                          <p className={styles.itemType}>{TYPE_LABEL[item.type]}</p>
                          <p className={styles.itemName}>{item.name}</p>
                          <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
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
                <Link href="/gio-hang" onClick={closeDrawer} className={styles.checkout}>
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
