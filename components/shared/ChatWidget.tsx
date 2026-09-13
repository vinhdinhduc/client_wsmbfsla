'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MessageCircle, Send, X, Bot, User, Phone } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { chatbotApi } from '@/lib/api/chatbot';
import { settingsApi } from '@/lib/api/settings';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { cn } from '@/lib/cn';
import styles from './ChatWidget.module.scss';

const SESSION_STORAGE_KEY = 'mfsl_chat_session_id';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
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
  const [showContactHint, setShowContactHint] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào! Tôi là trợ lý ảo MobiFone Sơn La, tôi có thể giúp gì cho bạn?',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { data: dutyStaff } = useCurrentDutyStaff();
  const phone = dutyStaff?.phone ?? settings?.hotline ?? '';
  const isChatbotEnabled = settings?.ai_chatbot_enabled !== 'false';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!phone) return;

    const showHint = () => {
      setShowContactHint(true);
      window.setTimeout(() => setShowContactHint(false), 4500);
    };
    const initialTimer = window.setTimeout(showHint, 3000);
    const interval = window.setInterval(showHint, 9000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [phone]);

  const sendMessage = useMutation({
    mutationFn: (message: string) => chatbotApi.sendMessage(getOrCreateSessionId(), message),
    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: result.reply },
      ]);
    },
    onError: (err: Error) => {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', text: err.message },
      ]);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sendMessage.isPending) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setInput('');
    sendMessage.mutate(trimmed);
  }

  return (
    <div className={styles.wrapper}>
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
              >
                <div className={styles.panelHeader}>
                  <p className={styles.panelTitle}>Trợ lý ảo MobiFone</p>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Đóng chat"
                    className={styles.panelClose}
                  >
                    <X className={styles.launcherIcon} />
                  </button>
                </div>

                <div ref={scrollRef} className={styles.panelBody}>
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
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập câu hỏi của bạn..."
                    className={styles.input}
                  />
                  <button
                    type="submit"
                    disabled={sendMessage.isPending}
                    aria-label="Gửi"
                    className={styles.sendButton}
                  >
                    <Send className={styles.sendIcon} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? 'Đóng khung chat' : 'Mở khung chat tư vấn'}
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
        </>
      )}

      {phone && (
        <>
          <AnimatePresence>
            {showContactHint && !isOpen && (
              <motion.div
                initial={{ opacity: 0, x: 12, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.92 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
                className={styles.contactHint}
              >
                Cần hỗ trợ? Nhắn Zalo hoặc gọi ngay
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.contactActions}>
            <a
              href={`https://zalo.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Nhắn tin qua Zalo"
              className={`${styles.contactButton} ${styles.zaloButton}`}
            >
              <span aria-hidden="true">Zalo</span>
            </a>
            <a
              href={`tel:${phone}`}
              aria-label={`Gọi điện ${phone}`}
              className={`${styles.contactButton} ${styles.phoneButton}`}
            >
              <Phone className={styles.contactIcon} />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
