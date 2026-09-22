'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Phone, Mail, MapPin, Clock3, MessageCircle } from 'lucide-react';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { newsletterApi } from '@/lib/api/newsletter';
import { settingsApi } from '@/lib/api/settings';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import styles from './Footer.module.scss';

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
    <footer className={styles.footer}>
      <div className={styles.footer__inner}>
        <div className={styles.footer__column}>
          <Image
            src="/logo.png"
            alt="Logo MobiFone"
            width={700}
            height={120}
            className={styles.footer__logo}
          />
          <h3 className={styles.footer__title}>
            {settings?.footer_about_title ?? settings?.site_name ?? 'MobiFone Sơn La'}
          </h3>
          <p className={styles.footer__description}>
            {settings?.footer_about_content ??
              settings?.footer_description ??
              'Thông tin liên hệ chính thức của MobiFone Sơn La'}
          </p>
          <div className={styles.footer__details}>
            <p className={styles.footer__detail}>
              <MapPin className={styles.footer__detailIcon} />
              {settings?.contact_address ?? settings?.footer_address ?? 'Tổ 3, Phường Chiềng Lề, tỉnh Sơn La'}
            </p>
            <p className={styles.footer__detail}>
              <MapPin className={styles.footer__detailIcon} />
              {settings?.footer_branch_name ?? 'Chi nhánh MobiFone tỉnh Sơn La'}
            </p>
            <p className={styles.footer__detail}>
              <Mail className={styles.footer__detailIcon} />
              {settings?.contact_email ?? settings?.footer_email ?? 'sonla@mobifone.vn'}
            </p>
            <p className={styles.footer__detail}>
              <Clock3 className={styles.footer__detailIcon} />
              {settings?.working_hours ?? settings?.footer_working_hours ?? 'Thứ Hai – Thứ Bảy: 07:30 – 17:30'}
            </p>
          </div>
        </div>

        <div className={styles.footer__column}>
          <h3 className={styles.footer__title}>Liên hệ nhanh</h3>
          <p className={styles.footer__hotline}>
            <Phone className={styles.footer__hotlineIcon} />
            <a
              href={`tel:${settings?.hotline ?? settings?.footer_phone ?? dutyStaff?.phone ?? ''}`}
            >
              {settings?.hotline ?? settings?.footer_phone ?? dutyStaff?.phone ?? '18001090'}
            </a>
          </p>
          <p className={styles.footer__description}>
            {dutyStaff?.name ?? 'Tổng đài chăm sóc khách hàng'}
          </p>
          <ul className={styles.footer__links}>
            <li>
              <Link href="/lien-he">Liên hệ</Link>
            </li>
            <li>
              <Link href="/tuyen-dung">Tuyển dụng</Link>
            </li>
            <li>
              <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
            </li>
            <li>
              <Link href="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>
            </li>
            <li>
              <Link href="/admin/login">Quản trị</Link>
            </li>
          </ul>
        </div>

        <div className={styles.footer__column}>
          <h3 className={styles.footer__title}>Đăng ký nhận ưu đãi</h3>
          <p className={styles.footer__description}>
            Nhận thông tin khuyến mãi mới nhất qua email.
          </p>
          <form onSubmit={handleSubmit} className={styles.footer__form}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email của bạn"
              className={styles.footer__input}
            />
            <Button type="submit" size="sm" isLoading={subscribe.isPending}>
              Đăng ký
            </Button>
          </form>
        </div>

        <div className={styles.footer__column}>
          <h3 className={styles.footer__title}>Mạng xã hội</h3>
          <div className={styles.footer__socials}>
            <a
              href={settings?.footer_facebook_url ?? 'https://facebook.com/mobifonesonla'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook MobiFone Sơn La"
              className={styles.footer__socialLink}
            >
              <svg className={styles.footer__socialIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2z" /></svg>
            </a>
            {settings?.footer_zalo_url && (
              <a
                href={settings.footer_zalo_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zalo MobiFone Sơn La"
                className={styles.footer__socialLink}
              >
                <MessageCircle className={styles.footer__socialIcon} />
              </a>
            )}
            {settings?.footer_youtube_url && (
              <a
                href={settings.footer_youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube MobiFone Sơn La"
                className={styles.footer__socialLink}
              >
                <svg className={styles.footer__socialIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3V9z" fill="currentColor" stroke="none" /></svg>
              </a>
            )}
          </div>
        </div>
      </div>
      <div className={styles.footer__copyright}>
        {settings?.footer_copyright ??
          `© ${new Date().getFullYear()} MobiFone Chi nhánh Sơn La. Bảo lưu mọi quyền.`}
      </div>
    </footer>
  );
}
