import { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { packagesApi } from '@/lib/api/packages';
import { solutionsApi } from '@/lib/api/solutions';
import { newsApi } from '@/lib/api/news';
import { jobsApi } from '@/lib/api/jobs';
import { utilitiesApi } from '@/lib/api/utilities';

const STATIC_ROUTES = [
  '',
  '/sim-so-dep',
  '/goi-cuoc',
  '/giai-phap-so',
  '/cua-hang',
  '/tin-tuc',
  '/gioi-thieu',
  '/tuyen-dung',
  '/lien-he',
  '/tien-ich',
  '/chinh-sach-bao-mat',
  '/dieu-khoan-su-dung',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  // Goi API lay slug dang active/published - neu backend tam thoi khong san sang
  // luc build thi van tra ve sitemap voi cac route tinh, khong lam sap ca build.
  const [packages, solutions, news, jobs, utilities] = await Promise.allSettled([
    packagesApi.listPublic(undefined, { cache: 'no-store' }),
    solutionsApi.listPublic(undefined, { cache: 'no-store' }),
    newsApi.listPublic({ page_size: 200 }, { cache: 'no-store' }),
    jobsApi.listPublic({ include_expired: false }),
    utilitiesApi.list(),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [];

  if (packages.status === 'fulfilled') {
    packages.value.forEach((p) => dynamicEntries.push({ url: `${base}/goi-cuoc/${p.slug}`, changeFrequency: 'weekly', priority: 0.8 }));
  }
  if (solutions.status === 'fulfilled') {
    solutions.value.forEach((s) => dynamicEntries.push({ url: `${base}/giai-phap-so/${s.slug}`, changeFrequency: 'weekly', priority: 0.8 }));
  }
  if (news.status === 'fulfilled') {
    news.value.items.forEach((n) =>
      dynamicEntries.push({ url: `${base}/tin-tuc/${n.slug}`, changeFrequency: 'daily', priority: 0.6 }),
    );
  }
  if (jobs.status === 'fulfilled') jobs.value.forEach((item) => dynamicEntries.push({ url: `${base}/tuyen-dung/${item.slug}`, changeFrequency: 'weekly', priority: 0.7 }));
  if (utilities.status === 'fulfilled') utilities.value.forEach((item) => dynamicEntries.push({ url: `${base}/tien-ich/${item.slug}`, changeFrequency: 'monthly', priority: 0.6 }));

  return [...staticEntries, ...dynamicEntries];
}
