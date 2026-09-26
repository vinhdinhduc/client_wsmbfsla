import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { ChatWidget } from '@/components/shared/ChatWidget';
import { ThemeColorInjector } from '@/components/shared/ThemeColorInjector';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { PwaRegister } from '@/components/shared/PwaRegister';
import { CampaignNotices } from '@/components/shared/CampaignNotices';
import styles from './PublicLayout.module.scss';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#noi-dung-chinh">
        Bỏ qua điều hướng
      </a>
      <ThemeColorInjector />
      <PwaRegister />
      <CampaignNotices />
      <Header />
      <main id="noi-dung-chinh" className={styles.main} tabIndex={-1}>{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
      <CookieConsent />
    </div>
  );
}
