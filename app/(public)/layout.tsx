import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { ChatWidget } from '@/components/shared/ChatWidget';
import { ThemeColorInjector } from '@/components/shared/ThemeColorInjector';
import styles from './PublicLayout.module.scss';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <ThemeColorInjector />
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
