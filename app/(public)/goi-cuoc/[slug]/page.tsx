import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { packagesApi } from '@/lib/api/packages';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AddToCartButton } from '@/components/shared/AddToCartButton';
import { formatPrice } from '@/lib/format';
import { buildMetadata } from '@/lib/metadata';
import { Badge } from '@/components/ui/Badge';
import { PackageDetailTabs } from './_components/PackageDetailTabs';
import styles from './page.module.scss';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const packages = await packagesApi.listPublic();
    return packages.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const pkg = await packagesApi.getPublicBySlug(params.slug);
    return buildMetadata({
      title: pkg.name,
      description: pkg.headline_desc,
      path: `/goi-cuoc/${pkg.slug}`,
    });
  } catch {
    return buildMetadata({ title: 'Gói cước', path: `/goi-cuoc/${params.slug}` });
  }
}

export default async function PackageDetailPage({ params }: { params: { slug: string } }) {
  let pkg;
  try {
    pkg = await packagesApi.getPublicBySlug(params.slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Gói cước', href: '/goi-cuoc' }, { label: pkg.name }]} />

      <div className={styles.detailLayout}>
        <div className={styles.mainColumn}>
          <div className={styles.headerRow}>
            {pkg.group_type === 'hot' && <Badge tone="accent">HOT</Badge>}
            <Badge tone="primary">{pkg.group_type.replace('_', ' ')}</Badge>
          </div>
          <h1 className={styles.title}>{pkg.name}</h1>
          {pkg.headline_desc && <p className={styles.summary}>{pkg.headline_desc}</p>}
          <PackageDetailTabs pkg={pkg} />
        </div>

        <aside className={styles.aside}>
          <p className={styles.price}>
            {formatPrice(pkg.price)}
            <span className={styles.priceSuffix}>
              /{pkg.duration_value} {pkg.duration_unit}
            </span>
          </p>
          <AddToCartButton
            className={styles.addButton}
            item={{
              key: `goi_cuoc-${pkg.id}`,
              type: 'goi_cuoc',
              reference_id: pkg.id,
              name: pkg.name,
              price: pkg.price,
              image: null,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
