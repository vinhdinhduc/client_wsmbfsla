import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { packagesApi } from '@/lib/api/packages';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AddToCartButton } from '@/components/shared/AddToCartButton';
import { formatPrice } from '@/lib/format';
import { buildMetadata } from '@/lib/metadata';
import { PackageBadges } from '@/components/shared/PackageFacts';
import { QuickSmsRegistration } from '@/components/shared/QuickSmsRegistration';
import { packageDuration, packageGroupLabel } from '@/lib/package-display';
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const pkg = await packagesApi.getPublicBySlug(slug);
    return buildMetadata({
      title: pkg.name,
      description: pkg.headline_desc,
      path: `/goi-cuoc/${pkg.slug}`,
    });
  } catch {
    return buildMetadata({ title: 'Gói cước', path: `/goi-cuoc/${slug}` });
  }
}

export default async function PackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let pkg;
  try {
    pkg = await packagesApi.getPublicBySlug(slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Gói cước', href: '/goi-cuoc' }, { label: pkg.name }]} />

      <div className={styles.detailLayout}>
        <div className={styles.mainColumn}>
          <div className={styles.headerRow}>
            <PackageBadges pkg={pkg} />
            <Badge tone="primary">{packageGroupLabel(pkg)}</Badge>
          </div>
          <h1 className={styles.title}>{pkg.name}</h1>
          {pkg.headline_desc && <p className={styles.summary}>{pkg.headline_desc}</p>}
          <PackageDetailTabs pkg={pkg} />
        </div>

        <aside className={styles.aside}>
          <p className={styles.price}>
            {formatPrice(pkg.price)}
            <span className={styles.priceSuffix}>/{packageDuration(pkg)}</span>
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
          {pkg.sms_syntax?.trim() && <QuickSmsRegistration syntax={pkg.sms_syntax} />}
        </aside>
      </div>
    </div>
  );
}
