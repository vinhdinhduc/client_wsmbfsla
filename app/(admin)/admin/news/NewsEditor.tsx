'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Eye,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Search,
  Send,
  Tag,
} from 'lucide-react';
import { newsApi, NewsFormValues } from '@/lib/api/news';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { useToast } from '@/components/ui/Toast';
import styles from './NewsEditor.module.scss';

const empty: NewsFormValues = {
  title: '',
  slug: '',
  category: 'thong_bao',
  summary: '',
  content: '<p></p>',
  status: 'draft',
  is_featured: false,
  is_pinned: false,
  tags: [],
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function NewsEditor({ id }: { id?: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<NewsFormValues>(empty);
  const [dirty, setDirty] = useState(false);
  const query = useQuery({
    queryKey: ['news-editor', id],
    queryFn: () => newsApi.getById(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (query.data) {
      setForm({ ...query.data, tags: query.data.tags || [] });
      setDirty(false);
    }
  }, [query.data]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    addEventListener('beforeunload', handler);
    return () => removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    if (!id || !dirty) return;
    const timer = setInterval(() => void newsApi.autosave(id, form.content), 30000);
    return () => clearInterval(timer);
  }, [id, dirty, form.content]);

  const set = <K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () => (id ? newsApi.update(id, form) : newsApi.create(form)),
    onSuccess: () => {
      setDirty(false);
      showToast('Đã lưu tin tức');
      router.push('/admin/news');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  if (id && query.isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.notice}>
          <LoaderCircle className={styles.spinner} aria-hidden />
          Đang tải nội dung tin tức...
        </div>
      </main>
    );
  }

  if (id && query.isError) {
    return (
      <main className={styles.page}>
        <div className={styles.errorNotice} role="alert">
          <p>Không thể tải tin tức. Vui lòng thử lại.</p>
          <button type="button" onClick={() => void query.refetch()}>
            Thử tải lại
          </button>
        </div>
      </main>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Link href="/admin/news" className={styles.backLink}>
            <ArrowLeft aria-hidden />
            Danh sách tin tức
          </Link>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon}>
              <FileText aria-hidden />
            </span>
            <div>
              <h1>{id ? 'Chỉnh sửa tin tức' : 'Tạo tin tức mới'}</h1>
              <p>
                {id
                  ? 'Cập nhật nội dung và thông tin bài viết của bạn.'
                  : 'Soạn nội dung và thiết lập thông tin trước khi đăng bài.'}
              </p>
            </div>
          </div>
        </div>
        {query.data?.preview_token && (
          <a
            href={`/tin-tuc/xem-truoc/${query.data.preview_token}`}
            target="_blank"
            rel="noreferrer"
            className={styles.previewButton}
          >
            <Eye aria-hidden />
            Xem trước
          </a>
        )}
      </header>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.columns}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.cardIcon}><FileText aria-hidden /></div>
                <div>
                  <h2>Nội dung bài viết</h2>
                  <p>Thông tin chính sẽ hiển thị trên trang tin tức.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Tiêu đề <b>*</b></span>
                  <input
                    required
                    maxLength={255}
                    placeholder="Nhập tiêu đề bài viết"
                    value={form.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      set('title', title);
                      if (!id) set('slug', slugify(title));
                    }}
                  />
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Đường dẫn (slug) <b>*</b></span>
                  <div className={styles.slugInput}>
                    <span>/tin-tuc/</span>
                    <input
                      required
                      maxLength={255}
                      placeholder="duong-dan-bai-viet"
                      value={form.slug}
                      onChange={(event) => set('slug', event.target.value)}
                    />
                  </div>
                  <small>Đường dẫn được tạo tự động từ tiêu đề, bạn có thể chỉnh sửa.</small>
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Tóm tắt</span>
                  <textarea
                    maxLength={300}
                    rows={3}
                    placeholder="Viết phần giới thiệu ngắn cho bài viết..."
                    value={form.summary || ''}
                    onChange={(event) => set('summary', event.target.value)}
                  />
                  <small className={styles.counter}>{form.summary?.length || 0}/300 ký tự</small>
                </label>
              </div>
            </section>

            <section className={`${styles.card} ${styles.contentCard}`}>
              <div className={styles.cardHeading}>
                <div className={styles.cardIcon}><FileText aria-hidden /></div>
                <div>
                  <h2>Chi tiết bài viết</h2>
                  <p>Định dạng nội dung để bài viết dễ đọc và thu hút hơn.</p>
                </div>
              </div>
              <RichTextEditor
                label="Nội dung"
                value={form.content}
                onChange={(html) => set('content', html)}
                minHeight="25rem"
              />
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.cardIcon}><Search aria-hidden /></div>
                <div>
                  <h2>Tối ưu tìm kiếm (SEO)</h2>
                  <p>Tùy chỉnh thông tin hiển thị trên công cụ tìm kiếm.</p>
                </div>
              </div>
              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Tiêu đề SEO</span>
                  <input
                    maxLength={60}
                    placeholder="Tiêu đề hiển thị trên Google"
                    value={form.seo_title || ''}
                    onChange={(event) => set('seo_title', event.target.value)}
                  />
                  <small className={styles.counter}>{form.seo_title?.length || 0}/60 ký tự</small>
                </label>
                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Mô tả SEO</span>
                  <textarea
                    maxLength={160}
                    rows={3}
                    placeholder="Mô tả ngắn gọn nội dung bài viết..."
                    value={form.seo_description || ''}
                    onChange={(event) => set('seo_description', event.target.value)}
                  />
                  <small className={styles.counter}>
                    {form.seo_description?.length || 0}/160 ký tự
                  </small>
                </label>
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.cardIcon}><Send aria-hidden /></div>
                <div>
                  <h2>Đăng bài</h2>
                  <p>Thiết lập trạng thái và thời gian đăng.</p>
                </div>
              </div>
              <div className={styles.fieldStack}>
                <label className={styles.field}>
                  <span>Trạng thái</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      set('status', event.target.value as NewsFormValues['status'])
                    }
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="scheduled">Lên lịch</option>
                    <option value="published">Đã đăng</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.labelWithIcon}><CalendarDays aria-hidden /> Ngày đăng</span>
                  <input
                    type="datetime-local"
                    value={form.published_at?.slice(0, 16) || ''}
                    onChange={(event) =>
                      set(
                        'published_at',
                        event.target.value ? new Date(event.target.value).toISOString() : null,
                      )
                    }
                  />
                  <small>Để trống để sử dụng thời điểm đăng hiện tại.</small>
                </label>
              </div>
              <div className={styles.checkList}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_featured)}
                    onChange={(event) => set('is_featured', event.target.checked)}
                  />
                  <span>
                    <strong>Tin nổi bật</strong>
                    <small>Ưu tiên hiển thị trong mục nổi bật.</small>
                  </span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_pinned)}
                    onChange={(event) => set('is_pinned', event.target.checked)}
                  />
                  <span>
                    <strong>Ghim đầu trang</strong>
                    <small>Giữ bài viết ở vị trí ưu tiên.</small>
                  </span>
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.cardIcon}><ImageIcon aria-hidden /></div>
                <div>
                  <h2>Ảnh đại diện</h2>
                  <p>Thêm ảnh cover cho bài viết.</p>
                </div>
              </div>
              <div className={styles.fieldStack}>
                <label className={styles.field}>
                  <span>URL ảnh cover</span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.cover_url || ''}
                    onChange={(event) => set('cover_url', event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Mô tả ảnh (alt)</span>
                  <input
                    maxLength={255}
                    placeholder="Mô tả ngắn về hình ảnh"
                    value={form.cover_alt || ''}
                    onChange={(event) => set('cover_alt', event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.cardIcon}><Tag aria-hidden /></div>
                <div>
                  <h2>Phân loại</h2>
                  <p>Giúp độc giả tìm đúng chủ đề.</p>
                </div>
              </div>
              <div className={styles.fieldStack}>
                <label className={styles.field}>
                  <span>Danh mục</span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      set('category', event.target.value as NewsFormValues['category'])
                    }
                  >
                    <option value="thong_bao">Thông báo</option>
                    <option value="khuyen_mai">Khuyến mãi</option>
                    <option value="su_kien">Sự kiện</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Tags</span>
                  <input
                    placeholder="Ví dụ: MobiFone, khuyến mãi"
                    value={(form.tags || []).join(', ')}
                    onChange={(event) =>
                      set(
                        'tags',
                        event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                      )
                    }
                  />
                  <small>Phân cách các thẻ bằng dấu phẩy.</small>
                </label>
              </div>
            </section>
          </aside>
        </div>

        <footer className={styles.formFooter}>
          <p>{dirty ? 'Bạn có thay đổi chưa lưu.' : 'Các thay đổi sẽ được lưu khi nhấn nút bên dưới.'}</p>
          <div className={styles.footerActions}>
            <Link href="/admin/news" className={styles.cancelButton}>Hủy</Link>
            <button type="submit" className={styles.saveButton} disabled={save.isPending}>
              {save.isPending ? (
                <LoaderCircle className={styles.spinner} aria-hidden />
              ) : (
                <Check aria-hidden />
              )}
              {save.isPending ? 'Đang lưu...' : 'Lưu tin tức'}
            </button>
          </div>
        </footer>
      </form>
    </main>
  );
}
