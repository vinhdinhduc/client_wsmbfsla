'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, AiKnowledgeEntry } from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { FilterBar } from '@/components/ui/FilterBar';
import { useToast } from '@/components/ui/Toast';
import { KnowledgeImport } from './KnowledgeImport';
import styles from './page.module.scss';

const placeholderKeywords = ['ĐIỀN', 'XÁC NHẬN', 'TODO', 'XXX'];
const placeholderPattern = new RegExp(`\\[(?:${placeholderKeywords.join('|')})[^\\]]*\\]`, 'i');

const empty: { title: string; content: string; tags: string; status: 'active' | 'inactive' } = {
  title: '',
  content: '',
  tags: '',
  status: 'active',
};
export default function AiKnowledgePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<AiKnowledgeEntry | null>(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState<{ ids?: number[]; key?: string } | null>(null);
  const [requestedKnowledgeId, setRequestedKnowledgeId] = useState<number | null>(null);
  const openedKnowledge = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title') || params.get('question');
    if (title) setForm({ ...empty, title: title.slice(0, 255) });
    const rawIds = params.get('source_log_ids') || params.get('source_log_id') || '';
    const ids = [...new Set(rawIds.split(',').filter((value) => /^\d+$/.test(value)).map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 100);
    const key = params.get('source_question_key');
    if (key && /^[a-f0-9]{64}$/.test(key)) setSource({ key });
    else if (ids.length) setSource({ ids });
    const knowledgeId = Number(params.get('knowledge_id'));
    if (Number.isSafeInteger(knowledgeId) && knowledgeId > 0) setRequestedKnowledgeId(knowledgeId);
  }, []);
  const logCapabilities = useQuery({
    queryKey: ['ai-log-capabilities'],
    queryFn: ({ signal }) => aiApi.queryLogs({ page: 1, page_size: 10, mode: 'messages' }, signal),
    enabled: Boolean(source),
    staleTime: 60000,
  });
  const canLinkLogs = Boolean(logCapabilities.data && !Array.isArray(logCapabilities.data) && !logCapabilities.data.legacy);
  const { data = [], isLoading } = useQuery({
    queryKey: ['ai-knowledge', search],
    queryFn: () => aiApi.listKnowledge(search.trim() || undefined),
  });
  const filtered = data.filter((item) => !status || item.status === status);
  useEffect(() => {
    if (!requestedKnowledgeId || openedKnowledge.current || !data.length) return;
    const item = data.find((entry) => entry.id === requestedKnowledgeId);
    if (!item) return;
    openedKnowledge.current = true;
    setSource(null);
    setEditing(item);
    setForm({ title: item.title, content: item.content, tags: item.tags || '', status: item.status });
  }, [data, requestedKnowledgeId]);
  const hasFilters = Boolean(search.trim() || status);
  const save = useMutation({
    mutationFn: () =>
      editing ? aiApi.updateKnowledge(editing.id, form) : aiApi.createKnowledge({
        ...form,
        ...(canLinkLogs && source?.ids ? { source_log_ids: source.ids } : {}),
        ...(canLinkLogs && source?.key ? { source_question_key: source.key } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-logs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-log-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-log-thread'] });
      setEditing(null);
      setForm(empty);
      setSource(null);
      showToast('Đã lưu tri thức');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: number) => aiApi.deleteKnowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] });
      showToast('Đã xóa tri thức');
    },
  });
  function edit(item: AiKnowledgeEntry) {
    setSource(null);
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      tags: item.tags ?? '',
      status: item.status,
    });
  }
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dữ liệu tri thức AI</h1>
      <FilterBar
        label="Lọc dữ liệu tri thức"
        onReset={
          search || status
            ? () => {
                setSearch('');
                setStatus('');
              }
            : undefined
        }
      >
        <input
          type="search"
          aria-label="Tìm tri thức"
          placeholder="Tìm tiêu đề, nội dung hoặc thẻ"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Trạng thái tri thức"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang dùng</option>
          <option value="inactive">Tạm tắt</option>
        </select>
      </FilterBar>
      <div className={styles.layout}>
        <form
          className={styles.panel}
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.title.trim() || !form.content.trim() || (source && (logCapabilities.isPending || logCapabilities.isError))) return;
            if (
              placeholderPattern.test(form.content) &&
              !window.confirm(
                'Nội dung còn chứa placeholder [ĐIỀN]/[XÁC NHẬN]. Chatbot có thể trả lời sai. Vẫn lưu?',
              )
            ) {
              return;
            }
            save.mutate();
          }}
        >
          <h2>{editing ? 'Sửa tri thức' : 'Thêm tri thức'}</h2>
          {source && (
            <p className={styles.formWarning} role="status">
              Câu hỏi được lấy từ lịch sử hội thoại. Hãy nhập câu trả lời đã được xác nhận.
              {canLinkLogs && ' Sau khi lưu, các câu hỏi nguồn sẽ được liên kết và chuyển sang Đã xử lý.'}
            </p>
          )}
          {source && logCapabilities.isError && (
            <div className={styles.formWarning} role="alert">
              <p>Không xác minh được liên kết hội thoại.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => logCapabilities.refetch()}>Thử lại</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSource(null)}>Bỏ liên kết</Button>
            </div>
          )}
          <label htmlFor="knowledge-title">Tiêu đề</label>
          <input
            id="knowledge-title"
            required
            maxLength={255}
            aria-label="Tiêu đề tri thức"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <label htmlFor="knowledge-content">Nội dung trả lời</label>
          <textarea
            id="knowledge-content"
            required
            aria-label="Nội dung tri thức"
            rows={12}
            placeholder="Nhập nội dung trả lời đáng tin cậy..."
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
          {placeholderPattern.test(form.content) && (
            <p className={styles.formWarning} role="status">
              Nội dung có placeholder chưa xác nhận. Chatbot có thể trả lời sai nếu lưu nguyên.
            </p>
          )}
          <label htmlFor="knowledge-tags">Tags</label>
          <input
            id="knowledge-tags"
            aria-label="Thẻ tri thức"
            placeholder="Tags, phân cách bằng dấu phẩy"
            value={form.tags ?? ''}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
          />
          <label htmlFor="knowledge-status">Trạng thái</label>
          <select
            id="knowledge-status"
            aria-label="Trạng thái của tri thức"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as 'active' | 'inactive' })
            }
          >
            <option value="active">Đang dùng</option>
            <option value="inactive">Tạm tắt</option>
          </select>
          <div className={styles.formActions}>
            {!editing && <KnowledgeImport />}
            <div className={styles.formSubmitActions}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                  setSource(null);
                }}
              >
                Xóa form
              </Button>
              <Button
                type="submit"
                isLoading={save.isPending}
                disabled={!form.title.trim() || !form.content.trim() || Boolean(source && (logCapabilities.isPending || logCapabilities.isError))}
              >
                Lưu
              </Button>
            </div>
          </div>
        </form>
        <section className={styles.panel}>
          <h2>Danh sách ({filtered.length})</h2>
          {!isLoading && !filtered.length && (
            <div className={styles.emptyState}>
              <p>
                {hasFilters
                  ? 'Chưa có tri thức phù hợp với bộ lọc.'
                  : 'Chưa có tri thức nào. Thêm mới hoặc nhập từ file Excel/CSV.'}
              </p>
              {hasFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : (
                <KnowledgeImport triggerOnly />
              )}
            </div>
          )}
          {filtered.map((item) => (
            <article className={styles.item} key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.tags}</p>
                <small>{item.status === 'active' ? 'Đang dùng' : 'Tạm tắt'}</small>
              </div>
              <div className={styles.itemActions}>
                <Button size="sm" variant="outline" onClick={() => edit(item)}>
                  Sửa
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove.mutate(item.id)}>
                  Xóa
                </Button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
