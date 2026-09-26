'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MessageCircle, Send, X, Bot, User, Phone } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { chatbotApi, type ChatSource } from '@/lib/api/chatbot';
import { settingsApi } from '@/lib/api/settings';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { cn } from '@/lib/cn';
import { assetUrl } from '@/lib/assets';
import styles from './ChatWidget.module.scss';

const SESSION_STORAGE_KEY = 'mfsl_chat_session_id';
const CHAT_INTRO_DISMISSED_KEY = 'mfsl_chat_intro_dismissed';
const HISTORY_KEY = 'mfsl_chat_history';
const QUICK_REPLIES = ['Gói cước nào rẻ?', 'Cửa hàng gần tôi', 'Tư vấn giải pháp doanh nghiệp'];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  failedQuestion?: string;
  unavailable?: boolean;
  sources?: ChatSource[];
}

function safeSources(sources: unknown): ChatSource[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter(
      (source) =>
        source &&
        typeof source.title === 'string' &&
        typeof source.href === 'string' &&
        /^\/(?:goi-cuoc|sim-so-dep|giai-phap-so|tin-tuc)\/[a-zA-Z0-9_-]+$|^\/cua-hang$/.test(
          source.href,
        ),
    )
    .slice(0, 6);
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback cho HTTP / non-secure context (vd: truy cập qua IP nội bộ)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Widget gan o PublicLayout, hien thi tren MOI trang public - tru khi Admin da
 * tat trong Cai dat (ai_chatbot_enabled, muc 3.1/8.3.AI Chatbot dau bai). */
export function ChatWidget() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [showChatIntro, setShowChatIntro] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào! Tôi là trợ lý ảo MobiFone Sơn La, tôi có thể giúp gì cho bạn?',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef('');
  const sendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    sessionRef.current = createSessionId();
    try {
      const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) sessionRef.current = storedSession;
      const saved = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || 'null');
      if (
        storedSession &&
        Array.isArray(saved) &&
        saved.length &&
        saved.every(
          (m) =>
            typeof m.id === 'string' &&
            typeof m.text === 'string' &&
            ['user', 'assistant'].includes(m.role),
        )
      ) {
        setMessages(saved.slice(-50).map((m) => ({ ...m, sources: safeSources(m.sources) })));
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionRef.current);
    } catch {
      /* Chat remains available when browser storage is blocked. */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      /* Storage is optional. */
    }
  }, [messages, hydrated]);
  const prefersReducedMotion = useReducedMotion();
  const { data: dutyStaff } = useCurrentDutyStaff();
  const phone = dutyStaff?.phone ?? settings?.hotline ?? '';
  const isChatbotEnabled = !['false', '0'].includes(settings?.ai_chatbot_enabled ?? 'true');
  const isContactWidgetEnabled = settings?.contact_widget_enabled !== 'false';
  const contactMessage = settings?.contact_widget_message ?? 'Cần hỗ trợ? Nhắn Zalo hoặc gọi ngay';
  const staffInitial = dutyStaff?.name?.trim().charAt(0).toUpperCase() ?? 'M';

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAT_INTRO_DISMISSED_KEY)) return;
    } catch {
      /* Storage is optional. */
    }

    const showTimer = window.setTimeout(() => setShowChatIntro(true), 1500);
    const hideTimer = window.setTimeout(() => {
      setShowChatIntro(false);
      try {
        sessionStorage.setItem(CHAT_INTRO_DISMISSED_KEY, 'true');
      } catch {
        /* Storage is optional. */
      }
    }, 7500);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = useMutation({
    mutationFn: (message: string) => chatbotApi.sendMessage(sessionRef.current, message),
    onSuccess: (result, question) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
          sources: safeSources(result.sources),
          unavailable: result.status === 'unavailable',
          failedQuestion: result.status === 'unavailable' ? question : undefined,
        },
      ]);
    },
    onError: (err: Error, question: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', text: err.message, failedQuestion: question },
      ]);
    },
    onSettled: () => {
      sendingRef.current = false;
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > 2000 || sendingRef.current || !hydrated) return;
    sendingRef.current = true;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setInput('');
    sendMessage.mutate(trimmed);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitQuestion(input);
  }

  return (
    <div className={styles.wrapper} data-contact-widget>
      {isChatbotEnabled && (
        <>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.95 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                className={styles.panel}
                role="dialog"
                aria-label="Trợ lý AI MobiFone Sơn La"
              >
                <div className={styles.panelHeader}>
                  <p className={styles.panelTitle}>
                    <Bot size={22} aria-hidden="true" /> Trợ lý MobiFone Sơn La
                  </p>
                  <button
                    type="button"
                    disabled={sendMessage.isPending}
                    onClick={() => {
                      sessionRef.current = createSessionId();
                      try {
                        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionRef.current);
                      } catch {
                        /* Storage is optional. */
                      }
                      setInput('');
                      sendMessage.reset();
                      setMessages([
                        {
                          id: 'welcome',
                          role: 'assistant',
                          text: 'Xin chào! Tôi có thể giúp gì cho bạn?',
                        },
                      ]);
                    }}
                    aria-label="Xóa hội thoại"
                    className={styles.panelClose}
                  >
                    Mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Đóng chat"
                    className={styles.panelClose}
                  >
                    <X className={styles.launcherIcon} />
                  </button>
                </div>

                <div
                  ref={scrollRef}
                  className={styles.panelBody}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions text"
                >
                  {messages.length === 1 && (
                    <div className={styles.quickReplies}>
                      {QUICK_REPLIES.map((question) => (
                        <button
                          type="button"
                          key={question}
                          disabled={sendMessage.isPending || !hydrated}
                          onClick={() => submitQuestion(question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(styles.messageRow, m.role === 'user' && styles.messageRowUser)}
                    >
                      <div
                        className={cn(
                          styles.avatar,
                          m.role === 'user' ? styles.avatarUser : styles.avatarAssistant,
                        )}
                      >
                        {m.role === 'user' ? (
                          <User className={styles.avatarIcon} />
                        ) : (
                          <Bot className={styles.avatarIcon} />
                        )}
                      </div>
                      <div
                        className={cn(
                          styles.bubble,
                          m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                        )}
                      >
                        {m.text}
                        {m.sources && m.sources.length > 0 && (
                          <nav className={styles.sources} aria-label="Thông tin tham khảo">
                            <span>Thông tin tham khảo</span>
                            {m.sources.map((source) => (
                              <Link key={source.href} href={source.href}>
                                {source.title} →
                              </Link>
                            ))}
                          </nav>
                        )}
                        {m.unavailable && (
                          <Link href="/lien-he" className={styles.supportLink}>
                            Liên hệ nhân viên hỗ trợ →
                          </Link>
                        )}
                        {m.failedQuestion && (
                          <button
                            type="button"
                            className={styles.retry}
                            disabled={sendMessage.isPending}
                            onClick={() => submitQuestion(m.failedQuestion!)}
                          >
                            Thử gửi lại
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {sendMessage.isPending && (
                    <div className={styles.messageRow}>
                      <div className={cn(styles.avatar, styles.avatarAssistant)}>
                        <Bot className={styles.avatarIcon} />
                      </div>
                      <div className={styles.typing}>Đang trả lời...</div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <input
                    ref={inputRef}
                    aria-label="Câu hỏi cho trợ lý AI"
                    maxLength={2000}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập câu hỏi của bạn..."
                    className={styles.input}
                  />
                  <button
                    type="submit"
                    disabled={sendMessage.isPending || !input.trim() || !hydrated}
                    aria-label="Gửi"
                    className={styles.sendButton}
                  >
                    <Send className={styles.sendIcon} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.chatLauncherArea}>
            <div className={styles.chatHintAnchor}>
              <AnimatePresence>
                {showChatIntro && !isOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 10, y: 4 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 10, y: 4 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
                    className={styles.chatHint}
                    aria-hidden="true"
                  >
                    👋 Xin chào! Bạn cần hỗ trợ gì? Hãy chat với AI nhé!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowChatIntro(false);
                try {
                  sessionStorage.setItem(CHAT_INTRO_DISMISSED_KEY, 'true');
                } catch {
                  /* Storage is optional. */
                }
                setIsOpen((o) => !o);
              }}
              aria-label={isOpen ? 'Đóng khung chat' : 'Chat với AI'}
              className={styles.launcher}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                >
                  {isOpen ? (
                    <X className={styles.launcherIcon} />
                  ) : (
                    <MessageCircle className={styles.launcherIcon} />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </>
      )}

      {phone && isContactWidgetEnabled && (
        <div className={styles.contactActions} data-contact-actions>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 12, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
              className={styles.dutyStaff}
              data-contact-summary
            >
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
                  {dutyStaff?.name ?? 'MobiFone Sơn La'}
                </strong>
                <p className={styles.contactMessage}>{contactMessage}</p>
              </div>
            </motion.div>
          )}
          <div className={styles.contactButtons} data-contact-buttons>
            <a
              href={`https://zalo.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Nhắn tin qua Zalo"
              title="Nhắn tin qua Zalo"
              className={`${styles.contactButton} ${styles.zaloButton}`}
            >
              <span aria-hidden="true">Zalo</span>
            </a>
            <a
              href={`tel:${phone}`}
              aria-label={`Gọi điện ${phone}`}
              title={`Gọi ${phone}`}
              className={`${styles.contactButton} ${styles.phoneButton}`}
            >
              <Phone className={styles.contactIcon} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
