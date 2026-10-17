'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  aiApi,
  AiChatLog,
  AiLogConversation,
  AiLogFilters,
  AiLogPage,
  AiLogReviewStatus,
  AiLogSelection,
  AiLogTab,
} from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  formatLogDate,
  hasContactInfo,
  isUnansweredLog,
  logReviewStatus,
  maskContactInfo,
  normalizeLogQuestion,
  relativeLogTime,
  reviewStatusLabels,
} from '@/lib/ai-chat-log-presentation';
import styles from './page.module.scss';

type ViewState = AiLogFilters & { page: number; page_size: number; period: string };
type LogItem = AiChatLog | AiLogConversation;
type DeleteDialog = {
  selection: AiLogSelection;
  count: number | null;
  cleanup: boolean;
  condition: string;
  requiresConfirmation: boolean;
  confirmation: string;
};
const tabLabels: Record<AiLogTab, string> = {
  all: 'Tất cả',
  unanswered: 'Chưa trả lời được',
  needs_knowledge: 'Cần bổ sung',
  resolved: 'Đã xử lý',
  disliked: 'Bị đánh giá 👎',
};
const number = (value: number) => value.toLocaleString('vi-VN');
const defaultView: ViewState = {
  mode: 'conversations',
  page: 1,
  page_size: 20,
  search: '',
  status: '',
  feedback: '',
  sort: 'newest',
  tab: 'all',
  period: 'all',
};
const isMessage = (item: LogItem): item is AiChatLog => 'id' in item;
const itemKey = (item: LogItem) => (isMessage(item) ? String(item.id) : item.session_id);
const shortSessionId = (sessionId: string) =>
  /^private-[a-f0-9]{24}$/.test(sessionId) ? sessionId.slice(8, 16) : sessionId.slice(0, 8);
const vietnamDay = (offset = 0) =>
  new Date(Date.now() + 7 * 3600000 + offset * 86400000).toISOString().slice(0, 10);

function parseView(): ViewState {
  const params = new URLSearchParams(window.location.search);
  const size = Number(params.get('page_size'));
  const requestedPage = Number(params.get('page'));
  const dateParam = (key: string) => {
    const value = params.get(key) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
      ? value
      : undefined;
  };
  return {
    ...defaultView,
    mode: params.get('mode') === 'messages' ? 'messages' : 'conversations',
    page: Number.isFinite(requestedPage)
      ? Math.min(1000000, Math.max(1, Math.floor(requestedPage)))
      : 1,
    page_size: [10, 20, 50, 100].includes(size) ? size : 20,
    search: (params.get('search') || '').slice(0, 200),
    status: ['new', 'needs_knowledge', 'resolved', 'ignored'].includes(params.get('status') || '')
      ? (params.get('status') as AiLogReviewStatus)
      : '',
    feedback: ['positive', 'negative'].includes(params.get('feedback') || '')
      ? (params.get('feedback') as 'positive' | 'negative')
      : '',
    sort: ['oldest', 'frequent'].includes(params.get('sort') || '')
      ? (params.get('sort') as 'oldest' | 'frequent')
      : 'newest',
    tab: Object.hasOwn(tabLabels, params.get('tab') || '')
      ? (params.get('tab') as AiLogTab)
      : 'all',
    period: ['today', '7', '30', 'custom'].includes(params.get('period') || '')
      ? params.get('period')!
      : 'all',
    from: dateParam('from'),
    to: dateParam('to'),
    unanswered: params.get('unanswered') === 'true' || undefined,
  };
}

function filtersFor(view: ViewState): AiLogFilters {
  return {
    mode: view.mode,
    search: view.search,
    status: view.status,
    from: view.from,
    to: view.to,
    unanswered: view.unanswered,
    feedback: view.feedback,
    sort: view.sort,
    tab: view.tab,
  };
}

function isEntireHistoryFilter(filter: AiLogFilters): boolean {
  return !(
    filter.search?.trim() ||
    filter.status ||
    filter.from ||
    filter.to ||
    filter.unanswered ||
    filter.feedback ||
    (filter.tab && filter.tab !== 'all')
  );
}

function tabMatches(log: AiChatLog, tab: AiLogTab): boolean {
  if (tab === 'unanswered') return isUnansweredLog(log);
  if (tab === 'needs_knowledge' || tab === 'resolved') return logReviewStatus(log) === tab;
  return tab !== 'disliked' || log.was_helpful === false;
}

function legacyPage(rows: AiChatLog[], view: ViewState): AiLogPage {
  const safeRows = rows.map((row) => ({
    ...row,
    has_contact_info: hasContactInfo(
      `${row.user_message} ${row.ai_response} ${row.feedback_comment || ''}`,
    ),
    user_message: maskContactInfo(row.user_message),
    ai_response: maskContactInfo(row.ai_response),
    feedback_comment: maskContactInfo(row.feedback_comment || ''),
  }));
  const counts = Object.fromEntries(
    Object.keys(tabLabels).map((tab) => [
      tab,
      safeRows.filter((row) => tabMatches(row, tab as AiLogTab)).length,
    ]),
  ) as Record<AiLogTab, number>;
  const search = normalizeLogQuestion(view.search || '');
  const filtered = safeRows.filter((row) => {
    const day = formatLogDate(row.created_at).slice(0, 10).split('/').reverse().join('-');
    return (
      tabMatches(row, view.tab || 'all') &&
      (!search ||
        normalizeLogQuestion(`${row.user_message} ${row.ai_response}`).includes(search)) &&
      (!view.status || logReviewStatus(row) === view.status) &&
      (!view.from || day >= view.from) &&
      (!view.to || day <= view.to) &&
      (!view.unanswered || isUnansweredLog(row)) &&
      (!view.feedback || row.was_helpful === (view.feedback === 'positive'))
    );
  });
  let items: LogItem[] = filtered;
  if (view.mode === 'conversations') {
    items = Array.from(new Set(filtered.map((row) => row.session_id))).map((sessionId) => {
      const thread = safeRows
        .filter((row) => row.session_id === sessionId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      return {
        session_id: sessionId,
        started_at: thread[0].created_at,
        last_at: thread[thread.length - 1].created_at,
        message_count: thread.length,
        first_question: thread[0].user_message,
        has_unanswered: thread.some(isUnansweredLog),
        has_contact_info: thread.some((row) => row.has_contact_info),
      };
    });
  }
  const questionCounts = new Map<string, number>();
  filtered.forEach((row) => {
    const key = normalizeLogQuestion(row.user_message);
    questionCounts.set(key, (questionCounts.get(key) || 0) + 1);
  });
  items.sort((a, b) => {
    if (view.sort === 'frequent' && isMessage(a) && isMessage(b)) {
      const frequency =
        (questionCounts.get(normalizeLogQuestion(b.user_message)) || 0) -
        (questionCounts.get(normalizeLogQuestion(a.user_message)) || 0);
      if (frequency) return frequency;
    }
    const order = (isMessage(b) ? b.created_at : b.last_at).localeCompare(
      isMessage(a) ? a.created_at : a.last_at,
    );
    return view.sort === 'oldest' ? -order : order;
  });
  const page = Math.min(view.page, Math.max(1, Math.ceil(items.length / view.page_size)));
  return {
    items: items.slice((page - 1) * view.page_size, page * view.page_size),
    total: items.length,
    page,
    page_size: view.page_size,
    mode: view.mode || 'conversations',
    tab_counts: counts,
    snapshot_max_id: Math.max(0, ...rows.map((row) => row.id)),
    legacy: true,
  };
}

function knowledgeHref(question: string, id?: number, questionKey?: string): string {
  const params = new URLSearchParams({ title: maskContactInfo(question) });
  if (id) params.set('source_log_id', String(id));
  if (questionKey) params.set('source_question_key', questionKey);
  return `/admin/ai-knowledge?${params}`;
}

function MessageText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p className={styles.messageText}>
        {expanded || text.length <= 420 ? text : `${text.slice(0, 420)}…`}
      </p>
      {text.length > 420 && (
        <button
          type="button"
          className={styles.textButton}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}

function LogCard({
  log,
  advanced,
  onUpdate,
  onDelete,
}: {
  log: AiChatLog;
  advanced: boolean;
  onUpdate: (
    id: number,
    patch: {
      review_status?: AiLogReviewStatus;
      internal_note?: string;
      flagged_for_review?: boolean;
    },
  ) => Promise<void>;
  onDelete: (selection: AiLogSelection) => void;
}) {
  const { showToast } = useToast();
  const [revealed, setRevealed] = useState<AiChatLog | null>(null);
  const [note, setNote] = useState(maskContactInfo(log.internal_note || ''));
  const [busy, setBusy] = useState(false);
  useEffect(
    () =>
      setNote(revealed ? revealed.internal_note || '' : maskContactInfo(log.internal_note || '')),
    [log.internal_note, revealed],
  );
  const shown = revealed || log;
  const contactText = `${log.user_message} ${log.ai_response} ${log.feedback_comment || ''} ${log.internal_note || ''} ${log.diagnostics?.sources?.map((source) => source.title).join(' ') || ''}`;
  const contacts = log.has_contact_info || hasContactInfo(contactText);
  const privateNote =
    hasContactInfo(log.internal_note || '') ||
    /(?:\d{4}\s*\*{3}\s*\d{3}|\*{3}@)/.test(log.internal_note || '');
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
    } finally {
      setBusy(false);
    }
  };
  const reveal = async () => {
    if (!advanced) return;
    try {
      setRevealed(await aiApi.revealLog(log.id));
      showToast('Đã ghi Nhật ký truy cập thông tin liên hệ');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Không thể hiện thông tin liên hệ',
        'error',
      );
    }
  };
  const diagnostics = log.diagnostics;
  return (
    <article className={styles.threadItem} data-log-id={log.id}>
      <div className={styles.logMeta}>
        <time dateTime={log.created_at} title={formatLogDate(log.created_at, true)}>
          {relativeLogTime(log.created_at)}
        </time>
        <span className={`${styles.badge} ${styles[logReviewStatus(log)]}`}>
          {reviewStatusLabels[logReviewStatus(log)]}
        </span>
        {isUnansweredLog(log) && <span className={styles.warningBadge}>Chưa trả lời được</span>}
      </div>
      <div className={styles.bubbleRow}>
        <span className={styles.customerAvatar} aria-hidden>
          <UserRound size={17} />
        </span>
        <div className={`${styles.bubble} ${styles.customerBubble}`}>
          <strong>Khách</strong>
          <MessageText text={revealed ? shown.user_message : maskContactInfo(shown.user_message)} />
        </div>
      </div>
      <div className={styles.bubbleRow}>
        <span className={styles.botAvatar} aria-hidden>
          <Bot size={17} />
        </span>
        <div className={styles.bubble}>
          <strong>Trợ lý AI</strong>
          <MessageText text={revealed ? shown.ai_response : maskContactInfo(shown.ai_response)} />
        </div>
      </div>
      {log.was_helpful != null && (
        <p className={styles.feedback}>
          {log.was_helpful ? '👍 Hữu ích' : '👎 Chưa hữu ích'}
          {shown.feedback_comment
            ? ` · ${revealed ? shown.feedback_comment : maskContactInfo(shown.feedback_comment)}`
            : ''}
        </p>
      )}
      {contacts && (
        <div className={styles.contactLine}>
          <span className={styles.badge}>Có thông tin liên hệ</span>
          <button
            type="button"
            className={styles.textButton}
            disabled={!advanced || busy}
            onClick={() => {
              if (revealed) setRevealed(null);
              else void run(reveal);
            }}
          >
            {revealed ? 'Ẩn thông tin liên hệ' : 'Hiện thông tin liên hệ'}
          </button>
        </div>
      )}
      <div className={styles.cardActions}>
        {advanced ? (
          <select
            aria-label="Trạng thái xử lý"
            value={logReviewStatus(log)}
            disabled={busy}
            onChange={(event) =>
              void run(() =>
                onUpdate(log.id, { review_status: event.target.value as AiLogReviewStatus }),
              )
            }
          >
            {Object.entries(reviewStatusLabels).map(([status, label]) => (
              <option value={status} key={status}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || log.flagged_for_review}
            onClick={() => void run(() => onUpdate(log.id, { flagged_for_review: true }))}
          >
            {log.flagged_for_review ? 'Cần bổ sung tri thức' : 'Đánh dấu cần bổ sung'}
          </Button>
        )}
        <Link
          href={knowledgeHref(log.user_message, advanced ? log.id : undefined)}
          className={styles.knowledgeLink}
        >
          Thêm vào Dữ liệu tri thức
        </Link>
        {log.knowledge_entry_id && (
          <Link href={`/admin/ai-knowledge?knowledge_id=${log.knowledge_entry_id}`}>
            Tri thức #{log.knowledge_entry_id}
          </Link>
        )}
        <button
          type="button"
          className={styles.deleteIcon}
          aria-label={`Xóa tin nhắn ${log.id}`}
          disabled={!advanced || busy}
          onClick={() => onDelete({ ids: [log.id] })}
        >
          <Trash2 size={17} />
        </button>
      </div>
      {advanced && (
        <details className={styles.note}>
          <summary>Ghi chú nội bộ</summary>
          <textarea
            aria-label="Ghi chú nội bộ"
            value={note}
            maxLength={2000}
            rows={2}
            disabled={busy || (privateNote && !revealed)}
            onChange={(event) => setNote(event.target.value)}
          />
          {privateNote && !revealed && (
            <p>Hiện thông tin liên hệ trước khi sửa ghi chú có dữ liệu cá nhân.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={
              busy ||
              (privateNote && !revealed) ||
              note === (revealed ? revealed.internal_note || '' : log.internal_note || '')
            }
            onClick={() =>
              void run(async () => {
                await onUpdate(log.id, { internal_note: note });
                setRevealed(null);
              })
            }
          >
            Lưu ghi chú
          </Button>
        </details>
      )}
      <details className={styles.technical}>
        <summary>Chi tiết kỹ thuật</summary>
        {!diagnostics && <p>Log cũ chưa lưu chẩn đoán.</p>}
        <dl>
          <div>
            <dt>Nhà cung cấp / model</dt>
            <dd>
              {log.provider || 'Chưa lưu'} / {log.model || 'Chưa lưu'}
            </dd>
          </div>
          <div>
            <dt>Thời gian phản hồi</dt>
            <dd>{log.latency_ms == null ? 'Chưa lưu' : `${number(log.latency_ms)} ms`}</dd>
          </div>
          {diagnostics && (
            <>
              <div>
                <dt>Đoạn tri thức lấy được</dt>
                <dd>{diagnostics.retrieved_count ?? 'Chưa lưu'}</dd>
              </div>
              <div>
                <dt>Điểm tương đồng</dt>
                <dd>
                  {diagnostics.max_score == null
                    ? 'Không áp dụng (tìm từ khóa)'
                    : diagnostics.max_score}
                </dd>
              </div>
              <div>
                <dt>Lý do dự phòng</dt>
                <dd>{diagnostics.fallback_reason || 'Không có'}</dd>
              </div>
              <div>
                <dt>Nguồn</dt>
                <dd>
                  {diagnostics.sources?.length ? (
                    <ul>
                      {diagnostics.sources.map((source, index) => (
                        <li key={`${source.type}-${source.id}-${index}`}>
                          {maskContactInfo(source.title)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Chưa lưu nguồn'
                  )}
                </dd>
              </div>
            </>
          )}
        </dl>
      </details>
    </article>
  );
}

export default function AiChatLogsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewState>(defaultView);
  const [search, setSearch] = useState('');
  const [thread, setThread] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allSelection, setAllSelection] = useState<{
    filter: AiLogFilters;
    snapshot_max_id: number;
    count: number;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog | null>(null);
  const [undoBatch, setUndoBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [overrides, setOverrides] = useState<Record<number, AiChatLog>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const rowButtons = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    const initial = parseView();
    setView(initial);
    setSearch(initial.search || '');
    setReady(true);
    const pop = () => {
      const next = parseView();
      setView(next);
      setSearch(next.search || '');
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    Object.entries(view).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false && key !== 'period')
        params.set(key, String(value));
    });
    if (view.period !== 'all') params.set('period', view.period);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [ready, view]);
  useEffect(() => {
    if (!ready || search === view.search) return;
    const timer = setTimeout(() => setView((current) => ({ ...current, search, page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [search, view.search, ready]);
  const filters = useMemo(() => filtersFor(view), [view]);
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setSelected(new Set());
    setAllSelection(null);
    setActiveIndex(0);
  }, [filterKey]);
  const logsQuery = useQuery({
    queryKey: ['ai-chat-logs', view],
    queryFn: ({ signal }) =>
      aiApi.queryLogs({ ...filters, page: view.page, page_size: view.page_size }, signal),
    enabled: ready,
    retry: false,
  });
  const legacy = Array.isArray(logsQuery.data);
  const advanced = Boolean(
    logsQuery.data && !Array.isArray(logsQuery.data) && !logsQuery.data.legacy,
  );
  const pageData = useMemo(
    () =>
      Array.isArray(logsQuery.data)
        ? legacyPage(
            logsQuery.data.map((log) => overrides[log.id] || log),
            view,
          )
        : logsQuery.data,
    [logsQuery.data, overrides, view],
  );
  const summaryQuery = useQuery({
    queryKey: ['ai-chat-log-summary', filters],
    queryFn: ({ signal }) => aiApi.logSummary(filters, signal),
    enabled: advanced,
    retry: false,
  });
  const threadQuery = useInfiniteQuery({
    queryKey: ['ai-chat-log-thread', thread],
    queryFn: ({ pageParam, signal }) => aiApi.logSession(thread!, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.page_size < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: advanced && Boolean(thread),
    retry: false,
  });
  const threadRows = useMemo(() => {
    const rows =
      legacy && Array.isArray(logsQuery.data)
        ? logsQuery.data
            .filter((log) => log.session_id === thread)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
        : threadQuery.data?.pages.flatMap((page) => page.items) || [];
    return rows.map((log) => overrides[log.id] || log);
  }, [legacy, logsQuery.data, thread, threadQuery.data, overrides]);
  const summary = summaryQuery.data;
  const hasFilters = Boolean(
    search ||
      view.tab !== 'all' ||
      view.status ||
      view.from ||
      view.to ||
      view.feedback ||
      view.unanswered,
  );
  const totalPages = Math.max(1, Math.ceil((pageData?.total || 0) / view.page_size));
  const currentPage = pageData?.page || view.page;
  const selectedCount = allSelection?.count || selected.size;
  const allOnPage = Boolean(
    pageData?.items.length &&
      (allSelection || pageData.items.every((item) => selected.has(itemKey(item)))),
  );
  const change = useCallback(
    (patch: Partial<ViewState>) =>
      setView((current) => ({ ...current, ...patch, page: patch.page || 1 })),
    [],
  );
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ai-chat-logs'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-chat-log-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-chat-log-thread'] }),
    ]);
    setOverrides({});
  }, [queryClient]);
  const selection = (): AiLogSelection =>
    allSelection
      ? { filter: allSelection.filter, snapshot_max_id: allSelection.snapshot_max_id }
      : view.mode === 'messages'
        ? { ids: Array.from(selected).map(Number) }
        : { session_ids: Array.from(selected) };
  const perform = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Thao tác chưa thành công', 'error');
    } finally {
      setBusy(false);
    }
  };
  const update = async (
    id: number,
    patch: {
      review_status?: AiLogReviewStatus;
      internal_note?: string;
      flagged_for_review?: boolean;
    },
  ) => {
    try {
      const result = await aiApi.updateLog(id, patch);
      setOverrides((current) => ({ ...current, [id]: result }));
      await refresh();
      showToast(patch.internal_note !== undefined ? 'Đã lưu ghi chú' : 'Đã cập nhật trạng thái');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật', 'error');
    }
  };
  const openDelete = (chosen: AiLogSelection) => {
    if (advanced)
      setDeleteDialog({
        selection: chosen,
        count: null,
        cleanup: false,
        condition: '30',
        requiresConfirmation: Boolean(
          chosen.cleanup?.all ||
            (chosen.filter && isEntireHistoryFilter(chosen.filter)) ||
            (isEntireHistoryFilter(filters) &&
              pageData?.total &&
              (view.mode === 'messages'
                ? chosen.ids?.length === pageData.total
                : chosen.session_ids?.length === pageData.total)),
        ),
        confirmation: '',
      });
  };
  const previewDelete = async () => {
    if (!deleteDialog || !advanced) return;
    const result = await aiApi.bulkLogs({ ...deleteDialog.selection, action: 'preview_delete' });
    setDeleteDialog((current) =>
      current
        ? {
            ...current,
            count: result.count,
            requiresConfirmation: current.requiresConfirmation || Boolean(result.requires_confirmation),
          }
        : null,
    );
  };
  const submitDelete = async () => {
    if (
      !deleteDialog ||
      !deleteDialog.count ||
      !advanced ||
      (deleteDialog.requiresConfirmation && deleteDialog.confirmation !== 'XOA')
    )
      return;
    const result = await aiApi.bulkLogs({
      ...deleteDialog.selection,
      action: 'delete',
      expected_count: deleteDialog.count,
      ...(deleteDialog.requiresConfirmation ? { confirmation: deleteDialog.confirmation } : {}),
    });
    setUndoBatch(result.batch_id || null);
    setDeleteDialog(null);
    setThread(null);
    setSelected(new Set());
    setAllSelection(null);
    setOverrides({});
    await refresh();
    showToast(`Đã đưa ${number(result.affected ?? result.count)} tin vào thùng rác trong 7 ngày`);
  };
  const exportRows = async () => {
    if (!advanced) return;
    const chosen = selectedCount
      ? selection()
      : { filter: filters, snapshot_max_id: pageData?.snapshot_max_id };
    const blob = await aiApi.exportLogs(chosen, exportFormat);
    if (!(blob instanceof Blob)) throw new Error('Máy chủ chưa trả tệp xuất hợp lệ');
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `hoi-thoai-ai-${vietnamDay()}.${exportFormat}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    showToast('Đã xuất dữ liệu đã che thông tin liên hệ');
  };
  const copySession = async (sessionId: string) => {
    try {
      await navigator.clipboard.writeText(sessionId);
      showToast('Đã sao chép mã phiên');
    } catch {
      showToast('Không thể sao chép mã phiên', 'error');
    }
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        deleteDialog ||
        !(event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k')
      )
        return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const items = pageData?.items || [];
      if (!items.length) return;
      event.preventDefault();
      const index = Math.min(
        items.length - 1,
        Math.max(0, activeIndex + (event.key.toLowerCase() === 'j' ? 1 : -1)),
      );
      setActiveIndex(index);
      if (thread) setThread(items[index].session_id);
      else rowButtons.current[index]?.focus();
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [activeIndex, deleteDialog, pageData, thread]);
  const setPeriod = (period: string) =>
    change({
      period,
      from:
        period === 'today'
          ? vietnamDay()
          : period === '7'
            ? vietnamDay(-6)
            : period === '30'
              ? vietnamDay(-29)
              : undefined,
      to: ['today', '7', '30'].includes(period) ? vietnamDay() : undefined,
    });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Lịch sử hội thoại AI</h1>
          <p>Rà soát hội thoại, ưu tiên câu hỏi cần bổ sung tri thức.</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            disabled={!advanced || busy}
            onClick={() =>
              setDeleteDialog({
                selection: {
                  cleanup: { older_than_days: 30 },
                  snapshot_max_id: pageData?.snapshot_max_id,
                },
                count: null,
                cleanup: true,
                condition: '30',
                requiresConfirmation: false,
                confirmation: '',
              })
            }
          >
            <Trash2 size={16} aria-hidden />
            Dọn dẹp lịch sử
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={logsQuery.isFetching}
            onClick={() =>
              void perform(async () => {
                await refresh();
                showToast('Đã làm mới lịch sử');
              })
            }
          >
            <RefreshCw size={16} aria-hidden />
            Làm mới
          </Button>
        </div>
      </header>
      {legacy && (
        <p className={styles.notice}>
          API hiện chỉ trả 100 tin gần nhất. Bộ lọc, phân trang và nhóm hội thoại chỉ áp dụng trong
          các tin này. Một số tính năng quản lý chưa khả dụng.
        </p>
      )}
      {advanced && (
        <div className={styles.overview} aria-label="Thống kê hội thoại">
          {[
            ['Tổng hội thoại', summary?.conversations],
            ['Tỉ lệ trả lời được', summary ? `${summary.answered_rate.toFixed(1)}%` : undefined],
            ['Câu chưa trả lời', summary?.unanswered],
            ['Đánh giá 👎', summary?.dislikes],
          ].map(([label, value]) => (
            <article className={styles.stat} key={label}>
              <span>{label}</span>
              <strong>{typeof value === 'number' ? number(value) : (value ?? '—')}</strong>
            </article>
          ))}
          <article className={styles.stat}>
            <span>Xu hướng 7 ngày</span>
            {summary?.daily.length ? (
              <svg
                className={styles.sparkline}
                viewBox="0 0 150 34"
                role="img"
                aria-label={`Số câu chưa trả lời trong 7 ngày: ${summary.daily.map((day) => day.unanswered).join(', ')}`}
              >
                <polyline
                  points={summary.daily
                    .map(
                      (day, index) =>
                        `${(index * 150) / Math.max(1, summary.daily.length - 1)},${30 - (26 * day.unanswered) / Math.max(1, ...summary.daily.map((entry) => entry.unanswered))}`,
                    )
                    .join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
            ) : (
              <strong>—</strong>
            )}
          </article>
        </div>
      )}
      {advanced && (
        <p className={styles.retention}>
          {summary
            ? summary.retention_days > 0
              ? `Tự đưa log cũ hơn ${summary.retention_days} ngày vào thùng rác; có thể khôi phục trong 7 ngày.`
              : 'Chính sách lưu trữ tự động đang tắt. Log đã xóa có thể khôi phục trong 7 ngày.'
            : 'Đang tải chính sách lưu trữ…'}{' '}
          <Link href="/admin/ai-settings">Cài đặt AI Chatbot</Link>
        </p>
      )}
      {summaryQuery.isError && (
        <div className={styles.notice}>
          Không tải được thống kê.{' '}
          <button
            type="button"
            className={styles.textButton}
            onClick={() => void summaryQuery.refetch()}
          >
            Thử lại thống kê
          </button>
        </div>
      )}
      {advanced && Boolean(summary?.faq.length) && (
        <section className={styles.faq}>
          <h2>Câu hỏi thường gặp chưa trả lời được</h2>
          <div className={styles.faqList}>
            {summary!.faq.map((item) => (
              <div key={item.question_key}>
                <p>{maskContactInfo(item.question)}</p>
                <span>{number(item.count)} lần hỏi</span>
                <Link href={knowledgeHref(item.question, undefined, item.question_key)}>
                  Thêm vào tri thức
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className={styles.workspace} aria-label="Danh sách lịch sử">
        <div className={styles.tabs} role="tablist" aria-label="Lọc theo nhóm xử lý">
          {Object.entries(tabLabels).map(([tab, label]) => (
            <button
              type="button"
              key={tab}
              role="tab"
              aria-selected={view.tab === tab}
              onClick={() => change({ tab: tab as AiLogTab })}
            >
              {label}
              <span>{pageData ? number(pageData.tab_counts[tab as AiLogTab]) : '—'}</span>
            </button>
          ))}
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={17} aria-hidden />
            <input
              type="search"
              aria-label="Tìm hội thoại"
              placeholder="Tìm câu hỏi, câu trả lời…"
              maxLength={200}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Lọc trạng thái"
            value={view.status}
            onChange={(event) => change({ status: event.target.value as AiLogReviewStatus | '' })}
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(reviewStatusLabels)
              .filter(([status]) => advanced || ['new', 'needs_knowledge'].includes(status))
              .map(([status, label]) => (
                <option value={status} key={status}>
                  {label}
                </option>
              ))}
          </select>
          <select
            aria-label="Lọc thời gian"
            value={view.period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">Mọi thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="custom">Chọn khoảng</option>
          </select>
          <select
            aria-label="Lọc phản hồi"
            value={view.feedback}
            onChange={(event) =>
              change({ feedback: event.target.value as 'positive' | 'negative' | '' })
            }
          >
            <option value="">Mọi phản hồi</option>
            <option value="positive">👍 Hữu ích</option>
            <option value="negative">👎 Chưa hữu ích</option>
          </select>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={Boolean(view.unanswered)}
              onChange={(event) => change({ unanswered: event.target.checked || undefined })}
            />
            Chỉ câu chưa trả lời
          </label>
        </div>
        {view.period === 'custom' && (
          <div className={styles.dateRange}>
            <label>
              Từ ngày
              <input
                type="date"
                aria-label="Từ ngày"
                value={view.from || ''}
                max={view.to}
                onChange={(event) => change({ from: event.target.value || undefined })}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                aria-label="Đến ngày"
                value={view.to || ''}
                min={view.from}
                onChange={(event) => change({ to: event.target.value || undefined })}
              />
            </label>
          </div>
        )}
        <div className={styles.viewBar}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              aria-label="Chọn tất cả trên trang"
              disabled={!advanced || !pageData?.items.length}
              checked={allOnPage}
              onChange={(event) => {
                setAllSelection(null);
                setSelected(
                  event.target.checked ? new Set(pageData?.items.map(itemKey)) : new Set(),
                );
              }}
            />
            Chọn trang
          </label>
          <div>
            <select
              aria-label="Chế độ xem"
              value={view.mode}
              onChange={(event) =>
                change({ mode: event.target.value as 'messages' | 'conversations' })
              }
            >
              <option value="conversations">Theo cuộc hội thoại</option>
              <option value="messages">Theo từng tin nhắn</option>
            </select>
            <select
              aria-label="Sắp xếp"
              value={view.sort}
              onChange={(event) =>
                change({ sort: event.target.value as 'newest' | 'oldest' | 'frequent' })
              }
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="frequent">Hay bị hỏi nhất</option>
            </select>
          </div>
        </div>
        {!ready || logsQuery.isPending ? (
          <div className={styles.loading} role="status">
            <p>Đang tải lịch sử…</p>
            {[1, 2, 3, 4].map((key) => (
              <div className={styles.skeleton} aria-hidden key={key} />
            ))}
          </div>
        ) : logsQuery.isError ? (
          <div className={styles.empty} role="alert">
            <p>
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : 'Không tải được lịch sử'}
            </p>
            <Button variant="outline" onClick={() => void logsQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : !pageData?.items.length ? (
          <div className={styles.empty}>
            <MessageCircle size={38} aria-hidden />
            <h2>{hasFilters ? 'Không có kết quả phù hợp' : 'Chưa có hội thoại nào'}</h2>
            <p>
              {hasFilters
                ? 'Thử thay đổi bộ lọc hoặc tìm kiếm.'
                : 'Hội thoại sẽ xuất hiện ở đây khi khách trò chuyện với trợ lý AI.'}
            </p>
            {hasFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  change({ ...defaultView, mode: view.mode, page_size: view.page_size });
                }}
              >
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {pageData.items.map((item, index) => (
                <article className={styles.listRow} key={itemKey(item)}>
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${isMessage(item) ? `tin nhắn ${item.id}` : `hội thoại ${shortSessionId(item.session_id)}`}`}
                    disabled={!advanced}
                    checked={Boolean(allSelection) || selected.has(itemKey(item))}
                    onChange={(event) => {
                      setAllSelection(null);
                      setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(itemKey(item));
                        else next.delete(itemKey(item));
                        return next;
                      });
                    }}
                  />
                  <button
                    type="button"
                    className={styles.rowOpen}
                    ref={(element) => {
                      rowButtons.current[index] = element;
                    }}
                    aria-label={
                      isMessage(item)
                        ? `Mở tin nhắn ${item.id}`
                        : `Mở hội thoại ${shortSessionId(item.session_id)}`
                    }
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => {
                      setActiveIndex(index);
                      setThread(item.session_id);
                    }}
                  >
                    <div className={styles.rowMeta}>
                      <time
                        dateTime={isMessage(item) ? item.created_at : item.started_at}
                        title={formatLogDate(
                          isMessage(item) ? item.created_at : item.started_at,
                          true,
                        )}
                      >
                        {relativeLogTime(isMessage(item) ? item.created_at : item.started_at)}
                      </time>
                      {!isMessage(item) && <span>{number(item.message_count)} tin nhắn</span>}
                      <span className={styles.session}>{shortSessionId(item.session_id)}</span>
                    </div>
                    <p>
                      {maskContactInfo(isMessage(item) ? item.user_message : item.first_question)}
                    </p>
                    {isMessage(item) && (
                      <p className={styles.answerPreview}>
                        AI: {maskContactInfo(item.ai_response)}
                      </p>
                    )}
                    <div className={styles.rowBadges}>
                      {(isMessage(item) ? isUnansweredLog(item) : item.has_unanswered) && (
                        <span className={styles.warningBadge}>
                          {isMessage(item) ? 'Chưa trả lời được' : 'Có câu chưa trả lời'}
                        </span>
                      )}
                      {isMessage(item) && (
                        <span className={`${styles.badge} ${styles[logReviewStatus(item)]}`}>
                          {reviewStatusLabels[logReviewStatus(item)]}
                        </span>
                      )}
                      {item.has_contact_info && (
                        <span className={styles.badge}>Có thông tin liên hệ</span>
                      )}
                    </div>
                  </button>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      aria-label={`Sao chép mã phiên ${shortSessionId(item.session_id)}`}
                      onClick={() => void copySession(item.session_id)}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.deleteIcon}
                      aria-label={
                        isMessage(item)
                          ? `Xóa tin nhắn ${item.id}`
                          : `Xóa hội thoại ${shortSessionId(item.session_id)}`
                      }
                      disabled={!advanced || busy}
                      onClick={() =>
                        openDelete(
                          isMessage(item) ? { ids: [item.id] } : { session_ids: [item.session_id] },
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.pagination}>
              <p>
                Hiển thị {number((currentPage - 1) * view.page_size + 1)}–
                {number(Math.min(currentPage * view.page_size, pageData.total))} /{' '}
                {number(pageData.total)}
              </p>
              <label>
                <span>Số mục mỗi trang</span>
                <select
                  aria-label="Số mục mỗi trang"
                  value={view.page_size}
                  onChange={(event) => change({ page_size: Number(event.target.value) })}
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Trang trước"
                  disabled={currentPage <= 1 || logsQuery.isFetching}
                  onClick={() => change({ page: currentPage - 1 })}
                >
                  <ChevronLeft size={17} />
                </Button>
                <label>
                  <span>Trang</span>
                  <input
                    type="number"
                    aria-label="Nhảy đến trang"
                    key={`${currentPage}-${totalPages}`}
                    min={1}
                    max={totalPages}
                    defaultValue={currentPage}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter')
                        change({
                          page: Math.min(
                            totalPages,
                            Math.max(1, Math.floor(Number(event.currentTarget.value) || 1)),
                          ),
                        });
                    }}
                    onBlur={(event) => {
                      const targetPage = Math.min(
                        totalPages,
                        Math.max(1, Math.floor(Number(event.target.value) || 1)),
                      );
                      if (targetPage !== currentPage) change({ page: targetPage });
                    }}
                  />
                </label>
                <span>/ {number(totalPages)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Trang sau"
                  disabled={currentPage >= totalPages || logsQuery.isFetching}
                  onClick={() => change({ page: currentPage + 1 })}
                >
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      {advanced && (
        <div className={`${styles.bulkBar} ${selectedCount ? styles.bulkSticky : ''}`}>
          <div>
            <span>
              {selectedCount
                ? `Đã chọn ${number(selectedCount)} ${view.mode === 'messages' ? 'tin' : 'hội thoại'}`
                : 'Xuất theo bộ lọc hiện tại'}
            </span>
            {selected.size > 0 && !allSelection && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() =>
                  setAllSelection({
                    filter: { ...filters },
                    snapshot_max_id: pageData!.snapshot_max_id,
                    count: pageData!.total,
                  })
                }
              >
                Chọn tất cả {number(pageData?.total || 0)} kết quả đang lọc
              </button>
            )}
            {selectedCount > 0 && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setSelected(new Set());
                  setAllSelection(null);
                }}
              >
                Bỏ chọn
              </button>
            )}
          </div>
          <div>
            {selectedCount > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      const result = await aiApi.bulkLogs({ ...selection(), action: 'resolve' });
                      setSelected(new Set());
                      setAllSelection(null);
                      setOverrides({});
                      await refresh();
                      showToast(`Đã xử lý ${number(result.affected ?? result.count)} tin`);
                    })
                  }
                >
                  <Check size={16} aria-hidden />
                  Đã xử lý
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => openDelete(selection())}
                >
                  <Trash2 size={16} aria-hidden />
                  Xóa
                </Button>
              </>
            )}
            <select
              aria-label="Định dạng xuất"
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value as 'csv' | 'xlsx')}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void perform(exportRows)}
            >
              <Download size={16} aria-hidden />
              Xuất
            </Button>
          </div>
        </div>
      )}
      {undoBatch && (
        <div className={styles.undo} role="status">
          <span>Đã xóa mềm. Có thể hoàn tác trong 7 ngày.</span>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const result = await aiApi.restoreLogs(undoBatch);
                setUndoBatch(null);
                setOverrides({});
                await refresh();
                showToast(`Đã khôi phục ${number(result.affected)} tin`);
              })
            }
          >
            Hoàn tác
          </Button>
        </div>
      )}
      <p className={styles.keyboardHint}>J / K chuyển mục · Esc đóng hội thoại.</p>
      {thread && (
        <Modal
          isOpen
          onClose={() => setThread(null)}
          title={`Hội thoại ${shortSessionId(thread)}`}
          placement="right"
          maxWidth="xl"
        >
          <div className={styles.drawerMeta}>
            <span>
              {legacy
                ? `${number(threadRows.length)} tin trong 100 tin gần nhất`
                : `${number(threadQuery.data?.pages[0].total || 0)} tin nhắn`}
            </span>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => void copySession(thread)}
            >
              Sao chép mã phiên
            </button>
          </div>
          {advanced && threadQuery.isPending ? (
            <div className={styles.loading}>Đang tải hội thoại…</div>
          ) : advanced && threadQuery.isError ? (
            <div className={styles.empty}>
              <p>
                {threadQuery.error instanceof Error
                  ? threadQuery.error.message
                  : 'Không tải được hội thoại'}
              </p>
              <Button variant="outline" onClick={() => void threadQuery.refetch()}>
                Thử lại hội thoại
              </Button>
            </div>
          ) : (
            <div className={styles.thread}>
              {threadRows.map((log) => (
                <LogCard
                  log={log}
                  key={log.id}
                  advanced={advanced}
                  onUpdate={update}
                  onDelete={openDelete}
                />
              ))}
              {advanced && threadQuery.hasNextPage && (
                <Button
                  variant="outline"
                  isLoading={threadQuery.isFetchingNextPage}
                  onClick={() => void threadQuery.fetchNextPage()}
                >
                  Tải thêm tin nhắn
                </Button>
              )}
            </div>
          )}
        </Modal>
      )}
      {deleteDialog && (
        <Modal
          isOpen
          onClose={() => {
            if (!busy) setDeleteDialog(null);
          }}
          title={deleteDialog.cleanup ? 'Dọn dẹp lịch sử' : 'Xóa lịch sử'}
          maxWidth="md"
        >
          <div className={styles.deleteForm}>
            <p>
              Các tin được đưa vào thùng rác trong 7 ngày, sau đó bị xóa vĩnh viễn. Thao tác được
              ghi Nhật ký hệ thống.
            </p>
            {deleteDialog.cleanup && (
              <label>
                Điều kiện dọn dẹp
                <select
                  aria-label="Điều kiện dọn dẹp"
                  value={deleteDialog.condition}
                  disabled={busy}
                  onChange={(event) => {
                    const condition = event.target.value;
                    const cleanup: AiLogSelection['cleanup'] =
                      condition === 'all'
                        ? { all: true }
                        : condition === 'resolved'
                          ? { status: 'resolved' }
                          : condition === 'answered'
                            ? { answered: true }
                            : { older_than_days: Number(condition) as 30 | 60 | 90 };
                    setDeleteDialog({
                      ...deleteDialog,
                      condition,
                      count: null,
                      requiresConfirmation: condition === 'all',
                      confirmation: '',
                      selection: { cleanup, snapshot_max_id: pageData?.snapshot_max_id },
                    });
                  }}
                >
                  <option value="30">Cũ hơn 30 ngày</option>
                  <option value="60">Cũ hơn 60 ngày</option>
                  <option value="90">Cũ hơn 90 ngày</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="answered">Trả lời được</option>
                  <option value="all">Toàn bộ lịch sử</option>
                </select>
              </label>
            )}
            <Button variant="outline" disabled={busy} onClick={() => void perform(previewDelete)}>
              Xem trước
            </Button>
            {deleteDialog.count !== null && (
              <p className={styles.previewCount}>Sẽ xóa {number(deleteDialog.count)} tin nhắn.</p>
            )}
            {deleteDialog.requiresConfirmation && (
              <label>
                Gõ XOA để xác nhận
                <input
                  aria-label="Gõ XOA để xác nhận"
                  value={deleteDialog.confirmation}
                  autoComplete="off"
                  disabled={busy}
                  onChange={(event) =>
                    setDeleteDialog({ ...deleteDialog, confirmation: event.target.value })
                  }
                />
              </label>
            )}
            <div className={styles.dialogActions}>
              <Button variant="outline" disabled={busy} onClick={() => setDeleteDialog(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                disabled={
                  busy ||
                  !deleteDialog.count ||
                  Boolean(
                    deleteDialog.requiresConfirmation && deleteDialog.confirmation !== 'XOA',
                  )
                }
                onClick={() => void perform(submitDelete)}
              >
                Xóa lịch sử
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
