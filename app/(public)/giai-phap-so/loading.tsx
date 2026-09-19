import styles from './page.module.scss';

export default function SolutionsLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Đang tải danh sách giải pháp">
      <div className={styles.title}>Giải pháp số</div>
      <div className={styles.skeletonTabs} />
      <div className={styles.skeletonGrid}>
        {[1, 2, 3].map((item) => (
          <div className={styles.skeletonCard} key={item} />
        ))}
      </div>
    </div>
  );
}
