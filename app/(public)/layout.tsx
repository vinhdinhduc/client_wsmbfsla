import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { ChatWidget } from '@/components/shared/ChatWidget';
import { ThemeColorInjector } from '@/components/shared/ThemeColorInjector';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ThemeColorInjector />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
