import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { packagesApi } from '@/lib/api/packages';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AddToCartButton } from '@/components/shared/AddToCartButton';
import { formatPrice } from '@/lib/format';
import { buildMetadata } from '@/lib/metadata';
import { Badge } from '@/components/ui/Badge';
import { PackageDetailTabs } from './_components/PackageDetailTabs';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const packages = await packagesApi.listPublic();
    return packages.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
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
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Gói cước', href: '/goi-cuoc' }, { label: pkg.name }]} />

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            {pkg.group_type === 'hot' && <Badge tone="accent">HOT</Badge>}
            <Badge tone="primary">{pkg.group_type.replace('_', ' ')}</Badge>
          </div>
          <h1 className="mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">{pkg.name}</h1>
          {pkg.headline_desc && <p className="mt-2 text-neutral-500">{pkg.headline_desc}</p>}
          <PackageDetailTabs pkg={pkg} />
        </div>

        <aside className="h-fit rounded-lg border border-neutral-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <p className="font-body text-3xl font-bold text-accent">
            {formatPrice(pkg.price)}
            <span className="text-base font-normal text-neutral-500">
              /{pkg.duration_value} {pkg.duration_unit}
            </span>
          </p>
          <AddToCartButton
            className="mt-4 w-full"
            item={{ key: `goi_cuoc-${pkg.id}`, type: 'goi_cuoc', reference_id: pkg.id, name: pkg.name, price: pkg.price, image: null }}
          />
        </aside>
      </div>
    </div>
  );
}
