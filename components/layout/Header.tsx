'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, ShoppingCart, Phone, Menu, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { useCart } from '@/hooks/useCart';
import { searchApi } from '@/lib/api/search';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

const NAV_LINKS = [
  { href: '/sim-so-dep', label: 'Sim số đẹp' },
  { href: '/goi-cuoc', label: 'Gói cước' },
  { href: '/giai-phap-so', label: 'Giải pháp số' },
  { href: '/cua-hang', label: 'Cửa hàng' },
  { href: '/tin-tuc', label: 'Tin tức' },
  { href: '/gioi-thieu', label: 'Giới thiệu' },
];

export function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const router = useRouter();
  const { count, openDrawer } = useCart();
  const { data: dutyStaff } = useCurrentDutyStaff();
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { data: suggestions } = useQuery({
    queryKey: ['header-search', debouncedQuery],
    queryFn: () => searchApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearchOpen(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(query.trim())}`);
  }

  const hasSuggestions =
    suggestions && (suggestions.news.length > 0 || suggestions.packages.length > 0 || suggestions.sims.length > 0);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-container items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/logo-mobifone.svg" alt="MobiFone Sơn La" width={40} height={40} priority />
          <span className="hidden font-heading text-lg font-bold text-primary sm:inline">MobiFone Sơn La</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-neutral-900 hover:text-primary">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div ref={searchBoxRef} className="relative hidden sm:block">
            <form onSubmit={handleSearchSubmit}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Tìm sim, gói cước, tin tức..."
                className="h-10 w-56 rounded-lg border border-neutral-100 pl-9 pr-3 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:w-72"
              />
            </form>

            <AnimatePresence>
              {isSearchOpen && debouncedQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-neutral-100 bg-white p-2 shadow-md"
                >
                  {hasSuggestions ? (
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {suggestions!.sims.length > 0 && (
                        <SuggestionGroup title="Sim số đẹp">
                          {suggestions!.sims.map((s) => (
                            <Link key={s.id} href={`/sim-so-dep/${s.id}`} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-neutral-100">
                              <span>{s.phone_number}</span>
                              <span className="text-accent">{formatPrice(s.price)}</span>
                            </Link>
                          ))}
                        </SuggestionGroup>
                      )}
                      {suggestions!.packages.length > 0 && (
                        <SuggestionGroup title="Gói cước">
                          {suggestions!.packages.map((p) => (
                            <Link key={p.id} href={`/goi-cuoc/${p.slug}`} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-neutral-100">
                              <span>{p.name}</span>
                              <span className="text-accent">{formatPrice(p.price)}</span>
                            </Link>
                          ))}
                        </SuggestionGroup>
                      )}
                      {suggestions!.news.length > 0 && (
                        <SuggestionGroup title="Tin tức">
                          {suggestions!.news.map((n) => (
                            <Link key={n.id} href={`/tin-tuc/${n.slug}`} className="block rounded px-2 py-1.5 text-sm hover:bg-neutral-100">
                              {n.title}
                            </Link>
                          ))}
                        </SuggestionGroup>
                      )}
                    </div>
                  ) : (
                    <p className="px-2 py-3 text-center text-sm text-neutral-500">Không tìm thấy kết quả phù hợp</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a
            href={`tel:${dutyStaff?.phone ?? ''}`}
            className="hidden items-center gap-1.5 text-sm font-medium text-primary md:flex"
            title={dutyStaff?.name}
          >
            <Phone className="h-4 w-4" />
            {dutyStaff?.phone ?? '1800 xxxx'}
          </a>

          <button
            type="button"
            onClick={openDrawer}
            aria-label="Xem giỏ hàng"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-neutral-900 before:absolute before:-inset-2 before:content-[''] hover:bg-neutral-100"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen((o) => !o)}
            aria-label={isMobileNavOpen ? 'Đóng menu' : 'Mở menu'}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-neutral-900 before:absolute before:-inset-2 before:content-[''] hover:bg-neutral-100 lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMobileNavOpen ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              >
                {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-neutral-100 lg:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={cn('rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100')}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/tuyen-dung" onClick={() => setIsMobileNavOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100">
                Tuyển dụng
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function SuggestionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 py-1 text-xs font-semibold uppercase text-neutral-500">{title}</p>
      {children}
    </div>
  );
}
