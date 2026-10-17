'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { MessageCircle, Phone, X } from 'lucide-react';
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
  const [unread, setUnread] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const phone = dutyStaff?.phone || settings?.hotline || settings?.footer_phone || '';
  const hotline = settings?.hotline || settings?.footer_phone || phone;
  const phoneHref = safeChatHref(`tel:${phone.replace(/[^\d+]/g, '')}`);
  const zaloUrl =
    safeChatHref(settings?.footer_zalo_url || '') ||
    (phone ? `https://zalo.me/${phone.replace(/\D/g, '')}` : undefined);
  const chatbotEnabled = !['false', '0'].includes(settings?.ai_chatbot_enabled ?? 'true');
  const contactsEnabled = settings?.contact_widget_enabled !== 'false';
  const staffInitial = dutyStaff?.name?.trim().charAt(0).toUpperCase() || 'M';

  useEffect(() => {
    try {
      setShowIntro(!sessionStorage.getItem(CHAT_INTRO_KEY));
    } catch {
      setShowIntro(true);
    }
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen || !hasOpened) return;
    const frame = requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
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
      data-chat-open={isOpen && chatbotEnabled ? 'true' : 'false'}
    >
      {chatbotEnabled && (
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
            {showIntro && !isOpen && <span className={styles.launcherLabel}>Hỏi trợ lý</span>}
            <button
              ref={launcherRef}
              type="button"
              onClick={isOpen ? closeChat : openChat}
              aria-label={isOpen ? 'Đóng khung chat' : 'Chat với AI'}
              aria-expanded={isOpen}
              aria-controls={hasOpened ? 'mobifone-chat-panel' : undefined}
              className={styles.launcher}
            >
              {isOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <MessageCircle size={24} aria-hidden="true" />
              )}
              {unread && (
                <span className={styles.unreadDot}>
                  <span className={styles.srOnly}>Có tin nhắn mới</span>
                </span>
              )}
            </button>
          </div>
        </>
      )}
      {(phoneHref || zaloUrl) && contactsEnabled && (
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
            {zaloUrl && (
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Nhắn tin qua Zalo"
                title="Nhắn tin qua Zalo"
                className={`${styles.contactButton} ${styles.zaloButton}`}
              >
                <span aria-hidden="true">Zalo</span>
              </a>
            )}
            {phoneHref && (
              <a
                href={phoneHref}
                aria-label={`Gọi điện ${phone}`}
                title={`Gọi ${phone}`}
                className={`${styles.contactButton} ${styles.phoneButton}`}
              >
                <Phone size={24} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
