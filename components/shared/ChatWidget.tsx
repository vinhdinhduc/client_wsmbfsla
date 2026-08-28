'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { chatbotApi } from '@/lib/api/chatbot';
import { settingsApi } from '@/lib/api/settings';
import { cn } from '@/lib/cn';

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
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Xin chào! Tôi là trợ lý ảo MobiFone Sơn La, tôi có thể giúp gì cho bạn?' },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = useMutation({
    mutationFn: (message: string) => chatbotApi.sendMessage(getOrCreateSessionId(), message),
    onSuccess: (result) => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: result.reply }]);
    },
    onError: (err: Error) => {
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: err.message }]);
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

  if (settings?.ai_chatbot_enabled === 'false') return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="mb-3 flex h-[28rem] w-[22rem] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-md"
          >
            <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
              <p className="font-heading font-semibold">Trợ lý ảo MobiFone</p>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng chat">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex items-start gap-2', m.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-900')}>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm', m.role === 'user' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-900')}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500">Đang trả lời...</div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-neutral-100 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="h-10 flex-1 rounded-lg border border-neutral-100 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="submit"
                disabled={sendMessage.isPending}
                aria-label="Gửi"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white transition-colors duration-150 hover:bg-primary-dark disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Đóng khung chat' : 'Mở khung chat tư vấn'}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-md transition-colors duration-150 hover:bg-primary-dark before:absolute before:-inset-2 before:content-['']"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
          >
            {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
