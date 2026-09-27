'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { packagesApi } from '@/lib/api/packages';
import { formatPrice } from '@/lib/format';
import type { Package, SimNumber } from '@/types/product';
import styles from './SimPurchaseButton.module.scss';

function subscriptionType(pkg: Package) {
  return (
    pkg.subscription_type ??
    (pkg.group_type === 'tra_truoc'
      ? 'prepaid'
      : pkg.group_type === 'tra_sau'
        ? 'postpaid'
        : 'none')
  );
}

export function SimPurchaseButton({
  sim,
  className,
  children,
  label,
}: {
  sim: SimNumber;
  className?: string;
  children?: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { addItem, isInCart, closeDrawer } = useCart();
  const selected = isInCart(`sim-${sim.id}`);
  const soldOut = sim.status !== 'available';
  const {
    data: packages = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sim-purchase-packages'],
    queryFn: () => packagesApi.listPublic(),
    enabled: open,
  });
  const typeLabel = sim.subscription_type === 'postpaid' ? 'trả sau' : 'trả trước';

  function proceed(pkg?: Package) {
    if (
      soldOut ||
      (pkg && (pkg.status !== 'active' || subscriptionType(pkg) !== sim.subscription_type))
    )
      return;
    addItem({
      key: `sim-${sim.id}`,
      type: 'sim',
      reference_id: sim.id,
      name: sim.phone_number,
      price: sim.activation_fee,
      image: null,
    });
    if (pkg)
      addItem({
        key: `goi_cuoc-${pkg.id}-sim-${sim.id}`,
        type: 'goi_cuoc',
        reference_id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        image: null,
        sim_reference_id: sim.id,
      });
    closeDrawer();
    setOpen(false);
    router.push('/gio-hang?step=customer');
  }

  return (
    <>
      <Button
        type="button"
        className={className}
        disabled={soldOut || selected}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        {soldOut ? 'Hết hàng' : selected ? 'Đã chọn' : (children ?? 'Chọn số')}
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Chọn gói cước" maxWidth="2xl">
        <p className={styles.summary}>
          Số <strong>{sim.phone_number}</strong> · SIM {typeLabel}
        </p>
        <p>Chọn gói cước {typeLabel} phù hợp hoặc bỏ qua để chỉ mua SIM.</p>
        {isLoading && <p role="status">Đang tải gói cước…</p>}
        {isError && (
          <p role="alert">
            Không tải được gói cước.{' '}
            <button type="button" onClick={() => refetch()}>
              Thử lại
            </button>
          </p>
        )}
        {!isLoading && !isError && packages.length === 0 && <p>Chưa có gói cước.</p>}
        <div className={styles.list}>
          {packages.map((pkg) => {
            const compatible =
              pkg.status === 'active' && subscriptionType(pkg) === sim.subscription_type;
            const type = subscriptionType(pkg);
            return (
              <article
                key={pkg.id}
                className={`${styles.package} ${compatible ? '' : styles.disabled}`}
              >
                <div>
                  <h3>{pkg.name}</h3>
                  <p>
                    {type === 'postpaid'
                      ? 'Trả sau'
                      : type === 'prepaid'
                        ? 'Trả trước'
                        : 'Không áp dụng cho SIM này'}
                  </p>
                  {pkg.data_desc && <p>{pkg.data_desc}</p>}
                  <strong>
                    {formatPrice(pkg.price)} / {pkg.duration_value}{' '}
                    {pkg.duration_unit === 'ngay' ? 'ngày' : 'tháng'}
                  </strong>
                </div>
                <button
                  type="button"
                  className={styles.choose}
                  disabled={!compatible}
                  onClick={() => proceed(pkg)}
                >
                  {compatible ? 'Chọn gói cước' : 'Không phù hợp'}
                </button>
              </article>
            );
          })}
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.skip} onClick={() => proceed()}>
            Bỏ qua — chỉ mua SIM
          </button>
        </div>
      </Modal>
    </>
  );
}
