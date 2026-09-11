import { Solution } from '@/types/product';
import styles from './SolutionContent.module.scss';

export function SolutionContent({ solution }: { solution: Solution }) {
  return <div className={styles.content} dangerouslySetInnerHTML={{ __html: solution.content }} />;
}
