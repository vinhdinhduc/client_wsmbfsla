import { Metadata } from 'next';
import { solutionsApi } from '@/lib/api/solutions';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SolutionFilterBar } from './_components/SolutionFilterBar';
import styles from './page.module.scss';
export const revalidate = 60;
export const metadata: Metadata = { title: 'Giải pháp số', description: 'Giải pháp số MobiFone Sơn La cho doanh nghiệp, tổ chức và cơ quan nhà nước.' };
export default async function SolutionsPage() {
  const solutions = await solutionsApi.listPublic(undefined, { next: { revalidate: 60 } });
  return <div className={styles.page}><Breadcrumb items={[{ label: 'Giải pháp số' }]} /><section className={styles.hero}><div className={styles.heroCopy}><p className={styles.eyebrow}>MOBIFONE DIGITAL</p><h1 className={styles.title}>Giải pháp số<br />cho hành trình bứt phá</h1><p className={styles.lead}>Kết nối công nghệ, vận hành thông minh và tăng trưởng bền vững cho tổ chức, doanh nghiệp tại Sơn La.</p><div className={styles.heroStats}><span><strong>{solutions.length}+</strong> giải pháp</span><span><strong>24/7</strong> đồng hành</span></div></div><div className={styles.heroVisual} aria-hidden="true"><span className={styles.orbitOne}/><span className={styles.orbitTwo}/><span className={styles.core}>M</span><span className={styles.dotOne}/><span className={styles.dotTwo}/></div></section><SolutionFilterBar solutions={solutions} /></div>;
}
