import styles from '@/styles/service-pages.module.scss';
import { notFound } from 'next/navigation';
import { utilitiesApi } from '@/lib/api/utilities';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import UtilityCta from './UtilityCta';
export default async function UtilityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let item;
  try {
    item = await utilitiesApi.detail(slug);
  } catch {
    notFound();
  }
  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ label: 'Tiện ích', href: '/tien-ich' }, { label: item.name }]} />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Tiện ích MobiFone</p>
        <h1>{item.name}</h1>
        <p>{item.summary}</p>
      </header>
      {item.hero_image && <img src={item.hero_image} alt="" style={{ maxWidth: '100%' }} />}
      {Boolean(item.features?.length) && (
        <section>
          <h2>Tính năng chính</h2>
          <ul>{item.features?.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        </section>
      )}
      <article
        className={`${styles.panel} ${styles.prose}`}
        dangerouslySetInnerHTML={{ __html: item.content || '' }}
      />
      <UtilityCta item={item} />
    </main>
  );
}
