'use client';

import type { Package } from '@/types/product';
import { PackageShowcaseCard } from '@/app/(public)/goi-cuoc/_components/PackageFilterBar';

/** Uses the public card's layout, facts, badges, and styles without registration actions. */
export function PackagePreview({ pkg }: { pkg: Package }) {
  return (
    <section aria-label="Xem trước thẻ gói cước">
      <h3>Xem trước thẻ gói cước</h3>
      <PackageShowcaseCard pkg={pkg} preview />
    </section>
  );
}
