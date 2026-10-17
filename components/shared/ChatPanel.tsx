'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  Ellipsis,
  MessageSquarePlus,
  Phone,
  Send,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { chatbotApi } from '@/lib/api/chatbot';
import type { PublicSettings } from '@/lib/api/settings';
import { assetUrl } from '@/lib/assets';
import { cn } from '@/lib/cn';
import {
  AI_NOTICE,
  CHAT_HISTORY_KEY,
  CHAT_SESSION_KEY,
  MAX_CHAT_LENGTH,
  UNCONFIRMED_REPLY,
  configuredSuggestions,
  createSessionId,
  hasKnowledgePlaceholder,
  needsHumanSupport,
  restoreHistory,
  safeChatHref,
  safeSources,
  staffAvailability,
  welcomeMessage,
  type ChatMessage,
} from '@/lib/chat-widget';
import { ChatMarkdown } from './ChatMarkdown';
import { ChatRichCards } from './ChatRichCards';
import styles from './ChatWidget.module.scss';

const ChatContactForm = dynamic(() => import('./ChatContactForm'), {
  ssr: false,
  loading: () => <p role="status">Đang mở biểu mẫu…</p>,
});

function Feedback({
  message,
  sessionId,
  onSaved,
}: {
  message: ChatMessage;
  sessionId: string;
  onSaved: (vote: 'up' | 'down', feedback?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(message.feedback || '');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const sendingRef = useRef(false);
  async function save(vote: 'up' | 'down') {
    if (!message.answerId || sendingRef.current) return;
    sendingRef.current = true;
    setPending(true);
    setNotice('');
    try {
      await chatbotApi.feedback(
        sessionId,
        message.answerId,
        vote === 'up',
        vote === 'down' ? comment.trim() : undefined,
      );
      onSaved(vote, vote === 'down' ? comment.trim() : undefined);
      setExpanded(false);
      setNotice('Cảm ơn bạn đã góp ý.');
    } catch {
      setNotice('Chưa gửi được đánh giá. Vui lòng thử lại.');
    } finally {
      sendingRef.current = false;
      setPending(false);
    }
  }
  return (
    <div className={styles.feedback}>
      <div className={styles.feedbackButtons}>
        <button
          type="button"
          aria-label="Câu trả lời hữu ích"
          title="Câu trả lời hữu ích"
          aria-pressed={message.vote === 'up'}
          disabled={pending || !message.answerId}
          onClick={() => void save('up')}
        >
          <ThumbsUp size={15} />
        </button>
        <button
          type="button"
          aria-label="Câu trả lời chưa hữu ích"
          title="Câu trả lời chưa hữu ích"
          aria-pressed={message.vote === 'down'}
          aria-expanded={expanded}
          disabled={pending || !message.answerId}
          onClick={() => setExpanded((value) => !value)}
        >
          <ThumbsDown size={15} />
        </button>
      </div>
      {expanded && (
        <form
          className={styles.feedbackForm}
          onSubmit={(event) => {
            event.preventDefault();
            void save('down');
          }}
        >
          <label>
            Câu trả lời chưa đúng ở đâu? <span>(tùy chọn)</span>
            <textarea
              value={comment}
              maxLength={500}
              rows={2}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Vui lòng không nhập thông tin cá nhân."
              disabled={pending}
            />
          </label>
          <button type="submit" disabled={pending} className={styles.secondaryButton}>
            {pending ? 'Đang gửi…' : 'Gửi đánh giá'}
          </button>
        </form>
      )}
      {notice && (
        <p className={styles.smallText} role="status">
          {notice}
        </p>
      )}
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUnread: (value: boolean) => void;
  settings?: PublicSettings;
  hotline: string;
  zaloUrl?: string;
}

export default function ChatPanel({
  isOpen,
  onClose,
  onUnread,
  settings,
  hotline,
  zaloUrl,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactNeed, setContactNeed] = useState('');
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobile, setMobile] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [logoFailed, setLogoFailed] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const cancelNewRef = useRef<HTMLButtonElement>(null);
  const supportHeadingRef = useRef<HTMLHeadingElement>(null);
  const sessionRef = useRef('');
  const requestRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout>>();
  const openRef = useRef(isOpen);
  const pinnedRef = useRef(true);
  const previousCount = useRef(0);
  const suggestions = configuredSuggestions(settings?.ai_chatbot_quick_replies);
  const hours = settings?.working_hours || settings?.footer_working_hours;
  const availability = staffAvailability(hours, now);
  const hotlineHref = safeChatHref(`tel:${hotline.replace(/[^\d+]/g, '')}`);
  const logo = logoFailed
    ? '/logo_ngan_cropped.png'
    : assetUrl(settings?.site_logo) || '/logo_ngan_cropped.png';
  const hasConversation = messages.some((message) => message.role === 'user');
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.id !== 'welcome');

  useEffect(() => {
    sessionRef.current = createSessionId();
    try {
      const session = sessionStorage.getItem(CHAT_SESSION_KEY);
      if (session && session.length <= 100) {
        sessionRef.current = session;
        const restored = restoreHistory(
          JSON.parse(sessionStorage.getItem(CHAT_HISTORY_KEY) || 'null'),
        );
        if (restored.length) setMessages(restored);
      }
      sessionStorage.setItem(CHAT_SESSION_KEY, sessionRef.current);
    } catch {
      /* Chat still works without browser storage. */
    }
    setHydrated(true);
    return () => {
      requestRef.current?.abort();
      clearTimeout(cooldownTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      /* Optional storage. */
    }
  }, [messages, hydrated]);

  useEffect(() => {
    openRef.current = isOpen;
    if (!isOpen) return;
    onUnread(false);
    const frame = requestAnimationFrame(() => {
      if (supportOpen && !contactOpen) supportHeadingRef.current?.focus();
      if (!supportOpen && !confirmNew) inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, onUnread, supportOpen, confirmNew, contactOpen]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 479px)');
    const update = () => {
      setMobile(media.matches);
      const viewport = window.visualViewport;
      panelRef.current?.style.setProperty(
        '--chat-viewport-height',
        `${viewport?.height || window.innerHeight}px`,
      );
      panelRef.current?.style.setProperty('--chat-viewport-top', `${viewport?.offsetTop || 0}px`);
    };
    update();
    media.addEventListener('change', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      media.removeEventListener('change', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !mobile) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen, mobile]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 104)}px`;
  }, [input, isOpen, supportOpen]);

  function scrollToLatest(smooth = false) {
    const body = scrollRef.current;
    if (!body) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    body.scrollTo({
      top: body.scrollHeight,
      behavior: smooth && !reducedMotion ? 'smooth' : 'auto',
    });
    pinnedRef.current = true;
    setHasNewMessage(false);
  }

  useEffect(() => {
    if (messages.length > previousCount.current && !pinnedRef.current) setHasNewMessage(true);
    previousCount.current = messages.length;
    if (isOpen && pinnedRef.current) requestAnimationFrame(() => scrollToLatest());
  }, [messages, pending, isOpen, supportOpen]);

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToLatest();
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [isOpen, supportOpen]);

  useEffect(() => {
    if (confirmNew) cancelNewRef.current?.focus();
    else if (menuOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [confirmNew, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !menuButtonRef.current?.contains(event.target as Node)
      )
        setMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [menuOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmNew) {
          setConfirmNew(false);
          return;
        }
        if (menuOpen) {
          setMenuOpen(false);
          menuButtonRef.current?.focus();
          return;
        }
        onClose();
      }
      if (event.key !== 'Tab' || (!mobile && !confirmNew)) return;
      const root = confirmNew
        ? panelRef.current?.querySelector('[role="alertdialog"]')
        : panelRef.current;
      const focusable = root?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled):not([tabindex="-1"]), textarea:not(:disabled), [tabindex="0"]',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!root?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, mobile, confirmNew, menuOpen, onClose]);

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !hydrated || requestRef.current || Date.now() - lastSentRef.current < 1200)
      return;
    if (trimmed.length < 2) {
      setNotice('Vui lòng nhập câu hỏi từ 2 ký tự.');
      return;
    }
    if (trimmed.length > MAX_CHAT_LENGTH) {
      setNotice('Câu hỏi tối đa 500 ký tự.');
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    lastSentRef.current = Date.now();
    setCooldown(true);
    clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => setCooldown(false), 1200);
    setPending(true);
    setNotice('');
    setInput('');
    setSuggestionsDismissed(true);
    setMessages((previous) => [
      ...previous,
      {
        id: `u-${createSessionId()}`,
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const result = await chatbotApi.sendMessage(sessionRef.current, trimmed, controller.signal);
      if (requestRef.current !== controller || controller.signal.aborted) return;
      const reply =
        typeof result.reply === 'string' && result.reply.trim() ? result.reply : UNCONFIRMED_REPLY;
      const placeholder = hasKnowledgePlaceholder(reply);
      const failed = result.status === 'unavailable';
      setMessages((previous) => [
        ...previous,
        {
          id: `a-${createSessionId()}`,
          role: 'assistant',
          text: placeholder ? UNCONFIRMED_REPLY : reply,
          createdAt: new Date().toISOString(),
          sources: placeholder ? [] : safeSources(result.sources),
          needsHuman:
            failed || result.status === 'limited' || placeholder || needsHumanSupport(reply),
          failedQuestion: failed ? trimmed : undefined,
          answerId:
            Number.isSafeInteger(result.answer_id) && result.answer_id! > 0
              ? result.answer_id
              : undefined,
        },
      ]);
      if (!openRef.current) onUnread(true);
    } catch (error) {
      if (controller.signal.aborted || requestRef.current !== controller) return;
      setMessages((previous) => [
        ...previous,
        {
          id: `e-${createSessionId()}`,
          role: 'assistant',
          text:
            error instanceof Error
              ? error.message
              : 'Chưa thể kết nối. Vui lòng thử lại hoặc gặp nhân viên tư vấn.',
          createdAt: new Date().toISOString(),
          failedQuestion: trimmed,
          needsHuman: true,
        },
      ]);
      if (!openRef.current) onUnread(true);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setPending(false);
      }
    }
  }

  function stopAnswer() {
    requestRef.current?.abort();
    requestRef.current = null;
    setPending(false);
    setNotice('Đã dừng chờ câu trả lời. Bạn có thể gửi câu hỏi tiếp theo.');
  }

  function requestNewConversation() {
    setMenuOpen(false);
    if (hasConversation) setConfirmNew(true);
    else newConversation();
  }

  function newConversation() {
    requestRef.current?.abort();
    requestRef.current = null;
    setPending(false);
    sessionRef.current = createSessionId();
    try {
      sessionStorage.setItem(CHAT_SESSION_KEY, sessionRef.current);
      sessionStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      /* Optional storage. */
    }
    setMessages([welcomeMessage()]);
    setInput('');
    setNotice('');
    setConfirmNew(false);
    lastSentRef.current = 0;
    clearTimeout(cooldownTimer.current);
    setCooldown(false);
    setSuggestionsDismissed(false);
    setSupportOpen(false);
    setContactOpen(false);
    onUnread(false);
    pinnedRef.current = true;
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function openSupport() {
    setContactNeed('');
    setSupportOpen(true);
    setContactOpen(false);
    setMenuOpen(false);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void submitQuestion(input);
  }
  function inputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submitQuestion(input);
    }
  }
  const showSuggestions = !hasConversation && !suggestionsDismissed && !input;

  return (
    <section
      id="mobifone-chat-panel"
      ref={panelRef}
      hidden={!isOpen}
      className={styles.panel}
      role="dialog"
      aria-label="Trợ lý AI MobiFone Sơn La"
      aria-modal={mobile ? true : undefined}
    >
      <header className={styles.panelHeader}>
        <div className={styles.brandAvatar}>
          <Image
            src={logo}
            alt="MobiFone"
            width={42}
            height={42}
            unoptimized
            onError={() => setLogoFailed(true)}
          />
          <span className={styles.onlineDot} />
        </div>
        <div className={styles.headerText}>
          <h2>Trợ lý MobiFone Sơn La</h2>
          <p>Phản hồi ngay · Trợ lý AI</p>
          <span className={styles.onlineStatus}>
            <i />
            Trực tuyến
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={requestNewConversation}
            className={styles.iconButton}
            title="Cuộc trò chuyện mới"
            aria-label="Cuộc trò chuyện mới"
          >
            <MessageSquarePlus size={19} />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className={styles.iconButton}
            title="Tùy chọn hội thoại"
            aria-label="Tùy chọn hội thoại"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Ellipsis size={20} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className={styles.iconButton}
            title="Đóng chat"
            aria-label="Đóng chat"
          >
            <X size={20} />
          </button>
        </div>
        {menuOpen && (
          <div
            ref={menuRef}
            className={styles.menu}
            role="menu"
            aria-label="Tùy chọn hội thoại"
            onKeyDown={(event) => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
              );
              const current = items.indexOf(document.activeElement as HTMLElement);
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
                      items.length;
              items[next]?.focus();
            }}
          >
            {hotlineHref && (
              <a role="menuitem" href={hotlineHref} onClick={() => setMenuOpen(false)}>
                <Phone size={16} />
                Gọi hotline
              </a>
            )}
            {zaloUrl && (
              <a
                role="menuitem"
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
              >
                Nhắn Zalo
              </a>
            )}
            <button role="menuitem" type="button" onClick={requestNewConversation}>
              <Trash2 size={16} />
              Xóa lịch sử
            </button>
            <Link
              role="menuitem"
              href="/chinh-sach-bao-mat"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              Chính sách bảo mật
            </Link>
          </div>
        )}
      </header>

      {supportOpen ? (
        <div className={styles.supportBody}>
          <div className={styles.supportIntro}>
            <span className={styles.cardLabel}>MobiFone Sơn La</span>
            <h3 ref={supportHeadingRef} tabIndex={-1}>
              Gặp nhân viên tư vấn
            </h3>
            <p>
              {hours
                ? `Giờ làm việc: ${hours}`
                : 'Giờ làm việc chưa được cập nhật. Vui lòng gọi hotline để xác nhận.'}
            </p>
            {availability !== 'open' && <p>Nhân viên sẽ phản hồi trong giờ làm việc.</p>}
            <div className={styles.supportChannels}>
              {hotlineHref && (
                <a href={hotlineHref}>
                  <Phone size={17} />
                  Gọi {hotline}
                </a>
              )}
              {zaloUrl && (
                <a href={zaloUrl} target="_blank" rel="noopener noreferrer">
                  Nhắn Zalo
                </a>
              )}
            </div>
          </div>
          {contactOpen ? (
            <ChatContactForm
              initialNeed={contactNeed}
              onBack={() => {
                setSupportOpen(false);
                setContactOpen(false);
              }}
            />
          ) : (
            <div className={styles.supportChoices}>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => setContactOpen(true)}
              >
                Để lại thông tin tư vấn
              </button>
              <Link href="/lien-he" className={styles.supportLink}>
                Liên hệ nhân viên hỗ trợ →
              </Link>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setSupportOpen(false)}
              >
                Quay lại hội thoại
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.conversation}>
            <div
              ref={scrollRef}
              className={styles.panelBody}
              role="log"
              aria-label="Hội thoại"
              aria-live="polite"
              aria-relevant="additions text"
              onScroll={() => {
                const body = scrollRef.current;
                if (!body) return;
                pinnedRef.current = body.scrollHeight - body.scrollTop - body.clientHeight < 72;
                if (pinnedRef.current) setHasNewMessage(false);
              }}
            >
              <div ref={contentRef}>
                {messages.map((message, index) => {
                  const grouped = index > 0 && messages[index - 1].role === message.role;
                  return (
                    <div
                      key={message.id}
                      className={cn(styles.messageGroup, grouped && styles.grouped)}
                      data-message-role={message.role}
                    >
                      <div
                        className={cn(
                          styles.messageRow,
                          message.role === 'user' && styles.messageRowUser,
                        )}
                      >
                        <span
                          className={cn(styles.avatar, grouped && styles.avatarHidden)}
                          aria-hidden="true"
                        >
                          {message.role === 'user' ? (
                            <UserRound size={14} />
                          ) : (
                            <span className={styles.brandMark}>
                              m<span>f</span>
                            </span>
                          )}
                        </span>
                        <div className={styles.messageContent}>
                          <div
                            className={cn(
                              styles.bubble,
                              message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                            )}
                          >
                            {message.role === 'assistant' ? (
                              <ChatMarkdown text={message.text} />
                            ) : (
                              message.text
                            )}
                            {message.sources?.length ? (
                              <nav className={styles.sources} aria-label="Thông tin tham khảo">
                                <span>Thông tin tham khảo</span>
                                {message.sources.map((source) => (
                                  <Link
                                    key={source.href}
                                    href={source.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {source.title} →
                                  </Link>
                                ))}
                              </nav>
                            ) : null}
                            {message.needsHuman && (
                              <>
                                <button
                                  className={styles.handoffInline}
                                  type="button"
                                  onClick={openSupport}
                                >
                                  Gặp nhân viên tư vấn
                                </button>
                                <Link href="/lien-he" className={styles.supportLink}>
                                  Liên hệ nhân viên hỗ trợ →
                                </Link>
                              </>
                            )}
                            {message.failedQuestion && (
                              <button
                                type="button"
                                disabled={pending || cooldown}
                                className={styles.retry}
                                onClick={() => void submitQuestion(message.failedQuestion!)}
                              >
                                Thử gửi lại
                              </button>
                            )}
                          </div>
                          {message.createdAt && (
                            <time className={styles.timestamp} dateTime={message.createdAt}>
                              {new Intl.DateTimeFormat('vi-VN', {
                                timeZone: 'Asia/Ho_Chi_Minh',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(message.createdAt))}
                            </time>
                          )}
                          {message.role === 'assistant' && message.id !== 'welcome' && (
                            <>
                              {!!message.sources?.length && !message.needsHuman && (
                                <ChatRichCards
                                  sources={message.sources}
                                  text={message.text}
                                  onRegister={(code) => {
                                    setContactNeed(`Tôi muốn đăng ký gói ${code}.`);
                                    setSupportOpen(true);
                                    setContactOpen(true);
                                  }}
                                />
                              )}
                              <Feedback
                                message={message}
                                sessionId={sessionRef.current}
                                onSaved={(vote, feedback) =>
                                  setMessages((previous) =>
                                    previous.map((item) =>
                                      item.id === message.id ? { ...item, vote, feedback } : item,
                                    ),
                                  )
                                }
                              />
                            </>
                          )}
                        </div>
                      </div>
                      {message.id === 'welcome' && showSuggestions && (
                        <div className={styles.quickReplies} aria-label="Câu hỏi gợi ý">
                          {suggestions.map((question) => (
                            <button
                              type="button"
                              key={question}
                              disabled={pending || cooldown || !hydrated}
                              onClick={() => void submitQuestion(question)}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {pending && (
                  <div className={styles.typing} role="status" aria-label="Trợ lý đang soạn tin">
                    <span />
                    <span />
                    <span />
                    <span className={styles.srOnly}>Trợ lý đang soạn tin</span>
                  </div>
                )}
                {lastAssistant && !pending && (
                  <div className={styles.answerActions} aria-label="Hành động tiếp theo">
                    <button
                      type="button"
                      disabled={cooldown}
                      onClick={() => void submitQuestion('Xem gói khác')}
                    >
                      Xem gói khác
                    </button>
                    <button
                      type="button"
                      disabled={cooldown}
                      onClick={() => void submitQuestion('Cửa hàng gần tôi')}
                    >
                      Cửa hàng gần tôi
                    </button>
                    <button type="button" onClick={openSupport}>
                      Gặp nhân viên
                    </button>
                  </div>
                )}
              </div>
            </div>
            {hasNewMessage && (
              <button
                className={styles.newMessages}
                type="button"
                onClick={() => scrollToLatest(true)}
              >
                Tin mới <ArrowDown size={15} />
              </button>
            )}
          </div>
          <div className={styles.composer}>
            <p className={styles.aiNotice}>{AI_NOTICE}</p>
            <form className={styles.form} onSubmit={submit}>
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                maxLength={MAX_CHAT_LENGTH}
                aria-label="Câu hỏi cho trợ lý AI"
                aria-describedby="chat-input-hint"
                placeholder="Nhập câu hỏi của bạn…"
                className={styles.input}
                onKeyDown={inputKey}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (event.target.value) setSuggestionsDismissed(true);
                }}
              />
              {pending ? (
                <button
                  type="button"
                  className={styles.stopButton}
                  onClick={stopAnswer}
                  aria-label="Dừng trả lời"
                  title="Dừng"
                >
                  <Square size={14} fill="currentColor" />
                  <span>Dừng</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || input.trim().length < 2 || !hydrated || cooldown}
                  aria-label="Gửi"
                  className={styles.sendButton}
                >
                  <Send size={19} />
                </button>
              )}
            </form>
            <div className={styles.inputMeta}>
              <span id="chat-input-hint">Enter gửi · Shift+Enter xuống dòng</span>
              {input.length >= 400 && <span aria-live="polite">{input.length}/500</span>}
            </div>
            {notice && (
              <p className={styles.smallText} role="status">
                {notice}
              </p>
            )}
          </div>
          <footer className={styles.panelFooter}>
            <button type="button" onClick={openSupport}>
              <UserRound size={16} />
              Gặp nhân viên tư vấn
            </button>
            <span>
              {hours ? `Giờ làm việc: ${hours}` : 'Liên hệ để xác nhận giờ làm việc'}
              {availability === 'closed' && (
                <>
                  <br />
                  Nhân viên sẽ phản hồi trong giờ làm việc.
                </>
              )}
            </span>
          </footer>
        </>
      )}

      {confirmNew && (
        <div className={styles.confirmOverlay}>
          <div
            className={styles.confirmBox}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="chat-new-title"
            aria-describedby="chat-new-description"
          >
            <h3 id="chat-new-title">Bắt đầu cuộc trò chuyện mới?</h3>
            <p id="chat-new-description">
              Lịch sử trong phiên này sẽ được xóa khỏi thiết bị của bạn.
            </p>
            <button
              ref={cancelNewRef}
              className={styles.secondaryButton}
              type="button"
              onClick={() => setConfirmNew(false)}
            >
              Giữ hội thoại
            </button>
            <button className={styles.primaryButton} type="button" onClick={newConversation}>
              Xóa và bắt đầu mới
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
