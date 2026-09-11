import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { ChatWidget } from '@/components/shared/ChatWidget';
import { ThemeColorInjector } from '@/components/shared/ThemeColorInjector';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <ThemeColorInjector />
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
