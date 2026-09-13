'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { ShoppingCart, MapPin, Smartphone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate, formatPrice } from '@/lib/format';
import { Badge } from './Badge';
import { Button } from './Button';
import { useCart } from '@/hooks/useCart';
import type { News, Package, SimNumber, Solution } from '@/types/product';
import styles from './Card.module.scss';

const CATEGORY_LABEL: Record<string, string> = {
  khuyen_mai: 'Khuyến mãi',
  su_kien: 'Sự kiện',
  thong_bao: 'Thông báo',
  sme: 'Doanh nghiệp',
  ubnd: 'UBND',
  ho_kinh_doanh: 'Hộ kinh doanh',
  cuc_nganh: 'Cục / Ngành',
  hot: 'Hot',
  tra_truoc: 'Trả trước',
  tra_sau: 'Trả sau',
  wifi_5g: 'Wifi 5G',
};

export function Card({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const content = <div className={cn(styles.card, className)}>{children}</div>;
  if (href) {
    return (
      <Link href={href} className={styles.blockLink}>
        {content}
      </Link>
    );
  }
  return content;
}

function CardThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className={styles.thumbnail}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
          className={styles.thumbnailImage}
        />
      ) : (
        <div className={styles.thumbnailEmpty}>
          <Smartphone className={styles.thumbnailIcon} />
        </div>
      )}
    </div>
  );
}

export function PackageCard({ pkg, onSelect }: { pkg: Package; onSelect?: () => void }) {
  const { addItem, isInCart } = useCart();
  const key = `goi_cuoc-${pkg.id}`;
  const inCart = isInCart(key);

  return (
    <Card>
      <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.blockLink}>
        <CardThumbnail src={null} alt={pkg.name} />
        <div className={styles.content}>
          <div className={styles.badges}>
            {pkg.group_type === 'hot' && <Badge tone="accent">HOT</Badge>}
            <Badge tone="primary">{CATEGORY_LABEL[pkg.group_type] ?? pkg.group_type}</Badge>
          </div>
          <h3 className={styles.cardTitle}>{pkg.name}</h3>
          {pkg.headline_desc && <p className={styles.muted}>{pkg.headline_desc}</p>}
          <p className={styles.price}>
            {formatPrice(pkg.price)}
            <span className={styles.priceUnit}>
              /{pkg.duration_value} {pkg.duration_unit}
            </span>
          </p>
        </div>
      </Link>
      <div className={styles.action}>
        <Button
          size="sm"
          variant={inCart ? 'outline' : 'primary'}
          className={styles.fullWidth}
          disabled={inCart}
          onClick={(e) => {
            e.preventDefault();
            if (onSelect) {
              onSelect();
              return;
            }
            addItem({
              key,
              type: 'goi_cuoc',
              reference_id: pkg.id,
              name: pkg.name,
              price: pkg.price,
              image: null,
            });
          }}
        >
          <ShoppingCart className={styles.actionIcon} />
          {onSelect ? 'Chọn gói cước' : inCart ? 'Đã có trong giỏ' : 'Thêm vào giỏ'}
        </Button>
      </div>
    </Card>
  );
}

const SIM_TYPE_LABEL: Record<string, string> = {
  tam_hoa: 'Tam hoa',
  tu_quy: 'Tứ quý',
  phat_loc: 'Phát lộc',
  than_tai: 'Thần tài',
  thuong: 'Thường',
};

export function SimCard({ sim }: { sim: SimNumber }) {
  const { addItem, isInCart } = useCart();
  const key = `sim-${sim.id}`;
  const inCart = isInCart(key);
  const soldOut = sim.status !== 'available';

  return (
    <Card>
      <Link href={`/sim-so-dep/${sim.id}`} className={styles.content}>
        <div className={styles.spaceBetween}>
          <Badge tone="primary">{SIM_TYPE_LABEL[sim.sim_type] ?? sim.sim_type}</Badge>
          <Badge tone={soldOut ? 'danger' : 'success'}>{soldOut ? 'Hết hàng' : 'Còn hàng'}</Badge>
        </div>
        <p className={styles.phoneNumber}>{sim.phone_number}</p>
        {sim.bundle_note && <p className={styles.muted}>{sim.bundle_note}</p>}
        <p className={styles.price}>{formatPrice(sim.price)}</p>
      </Link>
      <div className={styles.action}>
        <Button
          size="sm"
          variant={inCart ? 'outline' : 'primary'}
          className={styles.fullWidth}
          disabled={inCart || soldOut}
          onClick={(e) => {
            e.preventDefault();
            addItem({
              key,
              type: 'sim',
              reference_id: sim.id,
              name: sim.phone_number,
              price: sim.price,
              image: null,
            });
          }}
        >
          <ShoppingCart className={styles.actionIcon} />
          {soldOut ? 'Hết hàng' : inCart ? 'Đã có trong giỏ' : 'Thêm vào giỏ'}
        </Button>
      </div>
    </Card>
  );
}

export function NewsCard({ news }: { news: News }) {
  return (
    <Card href={`/tin-tuc/${news.slug}`}>
      <CardThumbnail src={news.thumbnail} alt={news.title} />
      <div className={styles.content}>
        <Badge tone="accent">{CATEGORY_LABEL[news.category] ?? news.category}</Badge>
        <h3 className={styles.cardTitleClamp}>{news.title}</h3>
        {news.summary && <p className={styles.mutedClamp}>{news.summary}</p>}
        {news.published_at && <p className={styles.muted}>{formatDate(news.published_at)}</p>}
      </div>
    </Card>
  );
}

export function SolutionCard({ solution }: { solution: Solution }) {
  return (
    <Card href={`/giai-phap-so/${solution.slug}`}>
      <CardThumbnail src={solution.thumbnail} alt={solution.name} />
      <div className={styles.content}>
        <div className={styles.badges}>
          {solution.is_hot && <Badge tone="accent">HOT</Badge>}
          <Badge tone="primary">{CATEGORY_LABEL[solution.category] ?? solution.category}</Badge>
        </div>
        <h3 className={styles.cardTitleClamp}>{solution.name}</h3>
        {solution.summary && <p className={styles.mutedClamp}>{solution.summary}</p>}
      </div>
    </Card>
  );
}

export function StoreCard({
  store,
}: {
  store: {
    name: string;
    address: string;
    district: string;
    phone: string;
    opening_hours: string | null;
  };
}) {
  return (
    <div className={styles.storeCard}>
      <h3 className={styles.cardTitle}>{store.name}</h3>
      <p className={styles.storeAddress}>
        <MapPin className={styles.storeIcon} />
        {store.address}, {store.district}
      </p>
      <p className={styles.muted}>Hotline: {store.phone}</p>
      {store.opening_hours && <p className={styles.muted}>Giờ mở cửa: {store.opening_hours}</p>}
    </div>
  );
}
