'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, AiKnowledgeEntry } from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { FilterBar } from '@/components/ui/FilterBar';
import { useToast } from '@/components/ui/Toast';
import { KnowledgeImport } from './KnowledgeImport';
import styles from './page.module.scss';

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
  const { data = [] } = useQuery({
    queryKey: ['ai-knowledge', search],
    queryFn: () => aiApi.listKnowledge(search.trim() || undefined),
  });
  const filtered = data.filter((item) => !status || item.status === status);
  const save = useMutation({
    mutationFn: () =>
      editing ? aiApi.updateKnowledge(editing.id, form) : aiApi.createKnowledge(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] });
      setEditing(null);
      setForm(empty);
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
            save.mutate();
          }}
        >
          <h2>{editing ? 'Sửa tri thức' : 'Thêm tri thức'}</h2>
          <input
            required
            aria-label="Tiêu đề tri thức"
            placeholder="Tiêu đề"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <textarea
            required
            aria-label="Nội dung tri thức"
            rows={12}
            placeholder="Nội dung trả lời đáng tin cậy..."
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
          <input
            aria-label="Thẻ tri thức"
            placeholder="Tags, phân cách bằng dấu phẩy"
            value={form.tags ?? ''}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
          />
          <select
            aria-label="Trạng thái của tri thức"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as 'active' | 'inactive' })
            }
          >
            <option value="active">Đang dùng</option>
            <option value="inactive">Tạm tắt</option>
          </select>
          <div className={styles.actions}>
            {!editing && <KnowledgeImport />}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
            >
              Xóa form
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              Lưu
            </Button>
          </div>
        </form>
        <section className={styles.panel}>
          <h2>Danh sách ({filtered.length})</h2>
          {!filtered.length && <p>Chưa có tri thức phù hợp với bộ lọc.</p>}
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
