import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  Users,
  CalendarDays,
  BriefcaseBusiness,
  Layers,
  CircleAlert,
  ArrowRight,
} from 'lucide-react';
import { jobsApi } from '@/lib/api/jobs';
import { settingsApi } from '@/lib/api/settings';
import { env } from '@/lib/env';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { JobContent } from '@/components/jobs/JobContent';
import { JobProcess } from '@/components/jobs/JobProcess';
import { JobActions, ApplyLink } from '@/components/jobs/JobActions';
import { JobDeadlineBadge } from '@/components/jobs/JobDeadlineBadge';
import { JOB_EMPLOYMENT_LABELS, jobDeadline, jobPostingSchema } from '@/lib/jobs-presentation';
import { JobApplyForm } from './JobApplyForm';
import styles from '@/components/jobs/JobDetail.module.scss';

const getJob = cache((slug: string) => jobsApi.detail(slug));
const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const job = await getJob(slug);
    const info = jobDeadline(job.deadline, job.status, Date.now(), job.updated_at);
    const description = `${job.title} tại ${job.location}. ${info.closed ? 'Vị trí đã ngừng nhận hồ sơ.' : `Tuyển ${job.quantity} người, hạn nộp ${info.label}.`}`;
    const canonical = `${site}/tuyen-dung/${encodeURIComponent(job.slug)}`;
    return {
      title: job.title,
      description,
      alternates: { canonical },
      ...(info.closedLongAgo ? { robots: { index: false, follow: true } } : {}),
      openGraph: {
        type: 'website',
        title: job.title,
        description,
        url: canonical,
        siteName: 'MobiFone Sơn La',
        images: [
          {
            url: '/tuyen-dung/opengraph-image',
            width: 1200,
            height: 630,
            alt: 'Tuyển dụng MobiFone Sơn La',
          },
        ],
      },
    };
  } catch {
    return { title: 'Tuyển dụng', robots: { index: false } };
  }
}
export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJob(slug).catch(() => null);
  if (!job) notFound();
  const now = Date.now();
  const info = jobDeadline(job.deadline, job.status, now);
  const [allJobs, settings] = await Promise.all([
    jobsApi.listPublic().catch(() => []),
    settingsApi.listPublic().catch(() => ({ hotline: '18001090' })),
  ]);
  const related = allJobs
    .filter((item) => item.id !== job.id && !jobDeadline(item.deadline, item.status, now).closed)
    .sort((a, b) => Number(b.category === job.category) - Number(a.category === job.category))
    .slice(0, 3);
  const employment = JOB_EMPLOYMENT_LABELS[job.employment_type] || job.employment_type;
  const structured = [
    ...(!info.closed ? [jobPostingSchema(job, site)] : []),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: site },
        { '@type': 'ListItem', position: 2, name: 'Tuyển dụng', item: `${site}/tuyen-dung` },
        {
          '@type': 'ListItem',
          position: 3,
          name: job.title,
          item: `${site}/tuyen-dung/${encodeURIComponent(job.slug)}`,
        },
      ],
    },
  ];
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
      />
      <Breadcrumb items={[{ label: 'Tuyển dụng', href: '/tuyen-dung' }, { label: job.title }]} />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>MobiFone Sơn La · Tuyển dụng</p>
        {(job.is_hot || job.is_urgent) && (
          <div className={styles.badges}>
            {job.is_hot && <span className={styles.badge + ' ' + styles.hot}>Hot</span>}
            {job.is_urgent && (
              <span className={styles.badge + ' ' + styles.urgentBadge}>Tuyển gấp</span>
            )}
          </div>
        )}
        <h1>{job.title}</h1>
        <div className={styles.chips}>
          <span className={styles.chip}>
            <MapPin aria-hidden="true" />
            {job.location}
          </span>
          <span className={styles.chip}>
            <Users aria-hidden="true" />
            {job.quantity} người
          </span>
          <span className={styles.chip}>
            <Layers aria-hidden="true" />
            {job.category}
          </span>
          {employment && (
            <span className={styles.chip}>
              <BriefcaseBusiness aria-hidden="true" />
              {employment}
            </span>
          )}
        </div>
        <div className={styles.deadlineLine}>
          <span className={styles.chip}>
            <CalendarDays aria-hidden="true" />
            Hạn nộp: {info.label}
          </span>
          <JobDeadlineBadge deadline={job.deadline} status={job.status} now={now} />
        </div>
        <JobActions key={job.id} open={!info.closed} title={job.title} />
      </header>
      {info.closed && (
        <section className={styles.closedBanner} role="status">
          <CircleAlert size={24} aria-hidden="true" />
          <div>
            <h2>Vị trí đã ngừng nhận hồ sơ</h2>
            <p>
              Cảm ơn bạn đã quan tâm. Hãy xem <Link href="/tuyen-dung">các vị trí đang tuyển</Link>{' '}
              để tìm cơ hội phù hợp.
            </p>
          </div>
        </section>
      )}
      <JobProcess />
      <div className={styles.layout}>
        <div className={styles.content}>
          <JobContent
            description={job.description}
            requirements={job.requirements}
            benefits={job.benefits}
          />
          {!info.closed && (
            <JobApplyForm
              key={job.id}
              jobId={job.id}
              jobTitle={job.title}
              hotline={settings.hotline || '18001090'}
            />
          )}
        </div>
        <aside className={styles.summary + ' ' + styles.card} aria-label="Tóm tắt vị trí">
          <h2>Thông tin tuyển dụng</h2>
          <dl>
            <div>
              <dt>Địa điểm</dt>
              <dd>{job.location}</dd>
            </div>
            <div>
              <dt>Số lượng</dt>
              <dd>{job.quantity} người</dd>
            </div>
            <div>
              <dt>Nhóm ngành</dt>
              <dd>{job.category}</dd>
            </div>
            {employment && (
              <div>
                <dt>Hình thức</dt>
                <dd>{employment}</dd>
              </div>
            )}
            {job.level && (
              <div>
                <dt>Cấp bậc</dt>
                <dd>{job.level}</dd>
              </div>
            )}
            <div>
              <dt>Hạn nộp</dt>
              <dd>{info.label}</dd>
            </div>
          </dl>
          {!info.closed ? (
            <>
              <ApplyLink key={job.id} />
              <p className={styles.summaryNote}>Chuẩn bị CV PDF/DOCX, tối đa 5MB.</p>
            </>
          ) : (
            <p className={styles.summaryNote}>Đã ngừng nhận hồ sơ.</p>
          )}
        </aside>
      </div>
      <section className={styles.related} aria-labelledby="related-jobs">
        <h2 id="related-jobs">Vị trí khác đang tuyển</h2>
        {related.length ? (
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <article className={styles.card} key={item.id}>
                <h3>{item.title}</h3>
                <p>{item.location}</p>
                <p>
                  {item.quantity} người · Hạn {jobDeadline(item.deadline).label}
                </p>
                <Link href={`/tuyen-dung/${item.slug}`}>
                  Xem vị trí
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p>
            Hiện chưa có vị trí khác. <Link href="/tuyen-dung">Xem trang tuyển dụng</Link> để cập
            nhật cơ hội mới.
          </p>
        )}
      </section>
    </main>
  );
}
