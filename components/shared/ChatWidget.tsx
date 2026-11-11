'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { MessageCircle, Phone, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { assetUrl } from '@/lib/assets';
import { CHAT_INTRO_KEY, safeChatHref } from '@/lib/chat-widget';
import styles from './ChatWidget.module.scss';

// Only the launcher/contact controls are part of the initial page bundle.
const ChatPanel = dynamic(() => import('./ChatPanel'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingPanel} role="status">
      Đang mở trợ lý…
    </div>
  ),
});

const CHAT_INTRO_MESSAGES = [
  'Hỏi trợ lý chatbot AI MobiFone Sơn La',
  'Tìm gói cước phù hợp với bạn',
  'Cần tư vấn SIM? Hỏi trợ lý ngay',
  'Khám phá giải pháp số cho doanh nghiệp',
  'Tìm cửa hàng MobiFone gần bạn',
];

export function ChatWidget() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const { data: dutyStaff } = useCurrentDutyStaff();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introMessageIndex, setIntroMessageIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [unread, setUnread] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const mobileSpeedDialToggleRef = useRef<HTMLButtonElement>(null);
  const phone = settings?.hotline || settings?.footer_phone || '';
  const hotline = phone;
  const phoneHref = phone ? safeChatHref(`tel:${phone.replace(/[^\d+]/g, '')}`) : undefined;
  const zaloUrl = safeChatHref(settings?.footer_zalo_url || '');
  const chatbotEnabled = !['false', '0'].includes(settings?.ai_chatbot_enabled ?? 'true');
  const chatButtonEnabled =
    chatbotEnabled && !['false', '0'].includes(settings?.contact_widget_chat_enabled ?? 'true');
  const contactsEnabled = settings?.contact_widget_enabled !== 'false';
  const zaloButtonEnabled =
    contactsEnabled && !['false', '0'].includes(settings?.contact_widget_zalo_enabled ?? 'true');
  const phoneButtonEnabled =
    contactsEnabled && !['false', '0'].includes(settings?.contact_widget_phone_enabled ?? 'true');
  const staffInitial = dutyStaff?.name?.trim().charAt(0).toUpperCase() || 'M';

  useEffect(() => {
    try {
      setShowIntro(!sessionStorage.getItem(CHAT_INTRO_KEY));
    } catch {
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduceMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!showIntro || isOpen || reduceMotion) return;
    const timer = window.setInterval(() => {
      setIntroMessageIndex((index) => (index + 1) % CHAT_INTRO_MESSAGES.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [showIntro, isOpen, reduceMotion]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen || !hasOpened) return;
    const frame = requestAnimationFrame(() => {
      const target = window.matchMedia('(max-width: 767px)').matches
        ? mobileSpeedDialToggleRef.current
        : launcherRef.current;
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, hasOpened]);

  function openChat() {
    setHasOpened(true);
    setIsOpen(true);
    setShowIntro(false);
    setUnread(false);
    try {
      sessionStorage.setItem(CHAT_INTRO_KEY, 'true');
    } catch {
      /* Storage is optional. */
    }
  }

  return (
    <div
      className={styles.wrapper}
      data-contact-widget
      data-chat-open={isOpen && chatButtonEnabled ? 'true' : 'false'}
    >
      {chatButtonEnabled && (
        <>
          {hasOpened && (
            <ChatPanel
              isOpen={isOpen}
              onClose={closeChat}
              onUnread={setUnread}
              settings={settings}
              hotline={hotline}
              zaloUrl={zaloUrl}
            />
          )}
          <div className={styles.chatLauncherArea}>
            {showIntro && !isOpen && (
              <span className={styles.launcherLabel} aria-hidden="true">
                <span key={introMessageIndex} className={styles.launcherMessage}>
                  {CHAT_INTRO_MESSAGES[introMessageIndex]}
                </span>
              </span>
            )}
            <button
              ref={launcherRef}
              type="button"
              onClick={isOpen ? closeChat : openChat}
              aria-label={isOpen ? 'Đóng khung chat' : 'Chat với trợ lý'}
              aria-expanded={isOpen}
              aria-controls={hasOpened ? 'mobifone-chat-panel' : undefined}
              className={styles.launcher}
            >
              {isOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <MessageCircle size={24} aria-hidden="true" />
              )}
              <span className={styles.buttonTooltip} aria-hidden="true">
                Chat với trợ lý
              </span>
              {unread && (
                <span className={styles.unreadDot}>
                  <span className={styles.srOnly}>Có tin nhắn mới</span>
                </span>
              )}
            </button>
          </div>
        </>
      )}
      {((phoneHref && phoneButtonEnabled) || (zaloUrl && zaloButtonEnabled)) && (
        <div className={styles.contactActions} data-contact-actions>
          {!isOpen && (
            <div className={styles.dutyStaff} data-contact-summary>
              {dutyStaff?.avatar_url ? (
                <Image
                  src={assetUrl(dutyStaff.avatar_url)!}
                  alt={dutyStaff.name}
                  width={40}
                  height={40}
                  unoptimized
                  className={styles.dutyAvatar}
                />
              ) : (
                <span className={styles.dutyAvatarFallback} aria-hidden="true">
                  {staffInitial}
                </span>
              )}
              <div className={styles.dutyStaffContent}>
                <span className={styles.dutyStatus}>
                  <i className={styles.statusDot} />
                  {dutyStaff ? 'Giao dịch viên đang trực' : 'Tổng đài hỗ trợ'}
                </span>
                <strong className={styles.dutyStaffName}>
                  {dutyStaff?.name || 'MobiFone Sơn La'}
                </strong>
                <p className={styles.contactMessage}>
                  {settings?.contact_widget_message || 'Cần hỗ trợ? Nhắn Zalo hoặc gọi ngay'}
                </p>
              </div>
            </div>
          )}
          <div className={styles.contactButtons} data-contact-buttons>
            {zaloUrl && zaloButtonEnabled && (
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat Zalo"
                className={`${styles.contactButton} ${styles.zaloButton}`}
              >
                <span aria-hidden="true">Zalo</span>
                <span className={styles.buttonTooltip} aria-hidden="true">
                  Chat Zalo
                </span>
              </a>
            )}
            {phoneHref && phoneButtonEnabled && (
              <a
                href={phoneHref}
                aria-label="Gọi hotline"
                className={`${styles.contactButton} ${styles.phoneButton}`}
              >
                <Phone size={24} aria-hidden="true" />
                <span className={styles.buttonTooltip} aria-hidden="true">
                  Gọi hotline
                </span>
              </a>
            )}
          </div>
        </div>
      )}
      {(chatButtonEnabled ||
        (zaloUrl && zaloButtonEnabled) ||
        (phoneHref && phoneButtonEnabled)) && (
        <div className={styles.mobileSpeedDial}>
          {mobileActionsOpen && (
            <div className={styles.mobileSpeedDialActions} aria-label="Kênh hỗ trợ">
              {chatButtonEnabled && (
                <button
                  type="button"
                  className={styles.mobileChatButton}
                  aria-label="Chat với trợ lý"
                  onClick={() => {
                    openChat();
                    setMobileActionsOpen(false);
                  }}
                >
                  <MessageCircle size={20} aria-hidden="true" />
                  <span>Trợ lý</span>
                </button>
              )}
              {zaloButtonEnabled && zaloUrl && (
                <a
                  className={styles.mobileZaloButton}
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat Zalo"
                >
                  <span aria-hidden="true">Z</span>
                  <span>Zalo</span>
                </a>
              )}
              {phoneButtonEnabled && phoneHref && (
                <a className={styles.mobilePhoneButton} href={phoneHref} aria-label="Gọi hotline">
                  <Phone size={20} aria-hidden="true" />
                  <span>Gọi</span>
                </a>
              )}
            </div>
          )}
          <button
            type="button"
            ref={mobileSpeedDialToggleRef}
            className={styles.mobileSpeedDialToggle}
            aria-label={mobileActionsOpen ? 'Đóng kênh hỗ trợ' : 'Mở kênh hỗ trợ'}
            aria-expanded={mobileActionsOpen}
            onClick={() => setMobileActionsOpen((open) => !open)}
          >
            {mobileActionsOpen ? <X size={22} /> : <Plus size={22} />}
          </button>
        </div>
      )}
    </div>
  );
}
