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
  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-sm transition-shadow duration-150 ease hover:shadow-md',
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:border-2 before:border-transparent before:content-[''] before:transition-colors group-hover:before:border-primary/30",
        className,
      )}
    >
      {children}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function CardThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-500">
          <Smartphone className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}

export function PackageCard({ pkg }: { pkg: Package }) {
  const { addItem, isInCart } = useCart();
  const key = `goi_cuoc-${pkg.id}`;
  const inCart = isInCart(key);

  return (
    <Card>
      <Link href={`/goi-cuoc/${pkg.slug}`} className="block">
        <CardThumbnail src={null} alt={pkg.name} />
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            {pkg.group_type === 'hot' && <Badge tone="accent">HOT</Badge>}
            <Badge tone="primary">{CATEGORY_LABEL[pkg.group_type] ?? pkg.group_type}</Badge>
          </div>
          <h3 className="font-heading text-lg font-semibold text-neutral-900">{pkg.name}</h3>
          {pkg.headline_desc && <p className="text-sm text-neutral-500">{pkg.headline_desc}</p>}
          <p className="font-body text-xl font-bold text-accent">
            {formatPrice(pkg.price)}
            <span className="text-sm font-normal text-neutral-500">
              /{pkg.duration_value} {pkg.duration_unit}
            </span>
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <Button
          size="sm"
          variant={inCart ? 'outline' : 'primary'}
          className="w-full"
          disabled={inCart}
          onClick={(e) => {
            e.preventDefault();
            addItem({ key, type: 'goi_cuoc', reference_id: pkg.id, name: pkg.name, price: pkg.price, image: null });
          }}
        >
          <ShoppingCart className="h-4 w-4" />
          {inCart ? 'Đã có trong giỏ' : 'Thêm vào giỏ'}
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
      <Link href={`/sim-so-dep/${sim.id}`} className="block p-4">
        <div className="flex items-center justify-between">
          <Badge tone="primary">{SIM_TYPE_LABEL[sim.sim_type] ?? sim.sim_type}</Badge>
          <Badge tone={soldOut ? 'danger' : 'success'}>{soldOut ? 'Hết hàng' : 'Còn hàng'}</Badge>
        </div>
        <p className="mt-3 font-heading text-2xl font-bold tracking-wide text-neutral-900">
          {sim.phone_number}
        </p>
        {sim.bundle_note && <p className="mt-1 text-sm text-neutral-500">{sim.bundle_note}</p>}
        <p className="mt-2 font-body text-xl font-bold text-accent">{formatPrice(sim.price)}</p>
      </Link>
      <div className="px-4 pb-4">
        <Button
          size="sm"
          variant={inCart ? 'outline' : 'primary'}
          className="w-full"
          disabled={inCart || soldOut}
          onClick={(e) => {
            e.preventDefault();
            addItem({ key, type: 'sim', reference_id: sim.id, name: sim.phone_number, price: sim.price, image: null });
          }}
        >
          <ShoppingCart className="h-4 w-4" />
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
      <div className="space-y-2 p-4">
        <Badge tone="accent">{CATEGORY_LABEL[news.category] ?? news.category}</Badge>
        <h3 className="line-clamp-2 font-heading text-lg font-semibold text-neutral-900">
          {news.title}
        </h3>
        {news.summary && <p className="line-clamp-2 text-sm text-neutral-500">{news.summary}</p>}
        {news.published_at && <p className="text-sm text-neutral-500">{formatDate(news.published_at)}</p>}
      </div>
    </Card>
  );
}

export function SolutionCard({ solution }: { solution: Solution }) {
  return (
    <Card href={`/giai-phap-so/${solution.slug}`}>
      <CardThumbnail src={solution.thumbnail} alt={solution.name} />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          {solution.is_hot && <Badge tone="accent">HOT</Badge>}
          <Badge tone="primary">{CATEGORY_LABEL[solution.category] ?? solution.category}</Badge>
        </div>
        <h3 className="line-clamp-2 font-heading text-lg font-semibold text-neutral-900">
          {solution.name}
        </h3>
        {solution.summary && <p className="line-clamp-2 text-sm text-neutral-500">{solution.summary}</p>}
      </div>
    </Card>
  );
}

export function StoreCard({ store }: { store: { name: string; address: string; district: string; phone: string; opening_hours: string | null } }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-4 shadow-sm">
      <h3 className="font-heading text-lg font-semibold text-neutral-900">{store.name}</h3>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        {store.address}, {store.district}
      </p>
      <p className="mt-1 text-sm text-neutral-500">Hotline: {store.phone}</p>
      {store.opening_hours && <p className="mt-1 text-sm text-neutral-500">Giờ mở cửa: {store.opening_hours}</p>}
    </div>
  );
}
