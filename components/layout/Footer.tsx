'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Facebook, Phone, Mail, MapPin } from 'lucide-react';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { newsletterApi } from '@/lib/api/newsletter';
import { settingsApi } from '@/lib/api/settings';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export function Footer() {
  const [email, setEmail] = useState('');
  const { data: dutyStaff } = useCurrentDutyStaff();
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const { showToast } = useToast();

  const subscribe = useMutation({
    mutationFn: (value: string) => newsletterApi.subscribe(value),
    onSuccess: () => {
      showToast('Đăng ký nhận ưu đãi thành công!');
      setEmail('');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate(email.trim());
  }

  return (
    <footer className="mt-12 bg-neutral-900 text-neutral-100">
      <div className="mx-auto grid max-w-container grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-heading text-lg font-semibold text-white">{settings?.site_name ?? 'MobiFone Sơn La'}</h3>
          <p className="mt-3 text-sm text-neutral-100/70">
            Tổ 3, Phường Chiềng Lề, Thành phố Sơn La, tỉnh Sơn La
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-neutral-100/70">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> Chi nhánh MobiFone tỉnh Sơn La
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> sonla@mobifone.vn
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-heading text-lg font-semibold text-white">Liên hệ nhanh</h3>
          <p className="mt-3 flex items-center gap-2 text-lg font-bold text-accent">
            <Phone className="h-5 w-5" />
            <a href={`tel:${dutyStaff?.phone ?? settings?.hotline ?? ''}`}>{dutyStaff?.phone ?? settings?.hotline ?? '1800 xxxx'}</a>
          </p>
          <p className="mt-1 text-sm text-neutral-100/70">{dutyStaff?.name ?? 'Tổng đài chăm sóc khách hàng'}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-neutral-100/70">
            <li><Link href="/lien-he" className="hover:text-white">Liên hệ</Link></li>
            <li><Link href="/tuyen-dung" className="hover:text-white">Tuyển dụng</Link></li>
            <li><Link href="/chinh-sach-bao-mat" className="hover:text-white">Chính sách bảo mật</Link></li>
            <li><Link href="/dieu-khoan-su-dung" className="hover:text-white">Điều khoản sử dụng</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-lg font-semibold text-white">Đăng ký nhận ưu đãi</h3>
          <p className="mt-3 text-sm text-neutral-100/70">Nhận thông tin khuyến mãi mới nhất qua email.</p>
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email của bạn"
              className="h-10 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-neutral-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button type="submit" size="sm" isLoading={subscribe.isPending}>
              Đăng ký
            </Button>
          </form>
        </div>

        <div>
          <h3 className="font-heading text-lg font-semibold text-white">Mạng xã hội</h3>
          <div className="mt-3 flex gap-3">
            <a
              href="https://facebook.com/mobifonesonla"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook MobiFone Sơn La"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-neutral-100/50">
        © {new Date().getFullYear()} MobiFone Chi nhánh Sơn La. Bảo lưu mọi quyền.
      </div>
    </footer>
  );
}
