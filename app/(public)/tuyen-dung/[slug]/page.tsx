import styles from '@/styles/service-pages.module.scss';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { jobsApi } from '@/lib/api/jobs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { JobApplyForm } from './JobApplyForm';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const job = await jobsApi.detail(slug);
    return { title: job.title, description: `Tuyển ${job.title} tại ${job.location}` };
  } catch {
    return { title: 'Tuyển dụng' };
  }
}
export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let job;
  try {
    job = await jobsApi.detail(slug);
  } catch {
    notFound();
  }
  const expired = new Date(`${job.deadline}T23:59:59`) < new Date();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: `${job.deadline}T23:59:59+07:00`,
    employmentType: job.employment_type,
    hiringOrganization: { '@type': 'Organization', name: 'MobiFone Sơn La' },
    jobLocation: { '@type': 'Place', address: job.location },
  };
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Breadcrumb items={[{ label: 'Tuyển dụng', href: '/tuyen-dung' }, { label: job.title }]} />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>MobiFone Sơn La · Tuyển dụng</p>
        <h1>{job.title}</h1>
        <p>
          {job.location} · Hạn {new Date(job.deadline).toLocaleDateString('vi-VN')}
        </p>
      </header>
      <section>
        <h2>Mô tả công việc</h2>
        <div className={styles.prose} dangerouslySetInnerHTML={{ __html: job.description }} />
      </section>
      {job.requirements && (
        <section>
          <h2>Yêu cầu</h2>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: job.requirements }} />
        </section>
      )}
      {job.benefits && (
        <section>
          <h2>Quyền lợi</h2>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: job.benefits }} />
        </section>
      )}
      {expired ? <p>Vị trí đã hết hạn nhận hồ sơ.</p> : <JobApplyForm jobId={job.id} />}
      <section>
        <h2>Quy trình tuyển dụng</h2>
        <ol>
          <li>Tiếp nhận hồ sơ</li>
          <li>Sơ loại</li>
          <li>Phỏng vấn</li>
          <li>Thông báo kết quả</li>
        </ol>
      </section>
    </main>
  );
}
