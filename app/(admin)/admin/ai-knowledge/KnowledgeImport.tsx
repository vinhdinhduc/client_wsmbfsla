'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api/ai';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

type Row = {
  title: string;
  content: string;
  tags: string;
  status: 'active' | 'inactive';
  selected: boolean;
  duplicate: boolean;
  error: string;
  saveError: string;
  saved: boolean;
};
type RowFilter = 'all' | 'new' | 'duplicate' | 'review';

const normalize = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi-VN');
const placeholderKeywords = ['ĐIỀN', 'XÁC NHẬN', 'TODO', 'XXX'];
const placeholderSource = placeholderKeywords.join('|');
const placeholderPattern = new RegExp(`\\[(?:${placeholderSource})[^\\]]*\\]`, 'i');
const hasPlaceholder = (value: string) => placeholderPattern.test(value);

export function KnowledgeImport({ triggerOnly = false }: { triggerOnly?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closePreviewRef = useRef<() => void>(() => {});
  const dialog = useRef<HTMLElement>(null);
  const confirmationBack = useRef<HTMLButtonElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [phase, setPhase] = useState('');
  const [open, setOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const client = useQueryClient();
  const { showToast } = useToast();

  const filteredRows = useMemo(() => {
    const query = normalize(search);
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'new' && !row.duplicate && !row.error && !hasPlaceholder(row.content)) ||
          (filter === 'duplicate' && row.duplicate) ||
          (filter === 'review' && (hasPlaceholder(row.content) || !!row.error));
        const matchesSearch =
          !query || normalize(`${row.title} ${row.content} ${row.tags}`).includes(query);
        return matchesFilter && matchesSearch;
      });
  }, [filter, rows, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);
  const selectedCount = rows.filter((row) => row.selected && !row.error && !row.saved).length;
  const newCount = rows.filter(
    (row) => !row.duplicate && !row.error && !hasPlaceholder(row.content),
  ).length;
  const duplicateCount = rows.filter((row) => row.duplicate).length;
  const reviewCount = rows.filter((row) => hasPlaceholder(row.content) || !!row.error).length;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busy) closePreviewRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, open]);

  useEffect(() => {
    if (confirmCount) confirmationBack.current?.focus();
  }, [confirmCount]);

  function closePreview() {
    if (busy) return;
    setOpen(false);
    setConfirmCount(0);
    setRows([]);
    setEditingIndex(null);
    requestAnimationFrame(() => opener.current?.focus());
  }
  closePreviewRef.current = closePreview;

  async function template() {
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.aoa_to_sheet([
          ['Tiêu đề', 'Nội dung', 'Tags', 'Trạng thái'],
          [
            'Giờ làm việc',
            'Nhập thông tin giờ làm việc chính thức tại đây.',
            'cửa hàng,hỗ trợ',
            'active',
          ],
        ]),
        'Tri thức AI',
      );
      XLSX.writeFile(book, 'mau-tri-thuc-ai.xlsx');
    } catch {
      showToast('Không tạo được file mẫu.', 'error');
    }
  }

  async function read(file: File) {
    setBusy(true);
    setProgress(0);
    setPhase('Đang đọc file');
    setRows([]);
    setPage(0);
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Chỉ hỗ trợ file .csv hoặc .xlsx.');
      if (file.size > 10 * 1024 * 1024)
        throw new Error('File tối đa 10 MB. Vui lòng chia nhỏ file.');
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      setProgress(15);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const book = XLSX.read(buffer, { type: 'array', sheetRows: 10002 });
      const cells = XLSX.utils.sheet_to_json<string[]>(book.Sheets[book.SheetNames[0]], {
        header: 1,
        defval: '',
        raw: false,
      });
      if (cells.length > 10001) throw new Error('Mỗi lần nhập tối đa 10.000 dòng.');
      const header = (cells.shift() ?? []).map((cell) => normalize(String(cell)));
      const columns = ['Tiêu đề', 'Nội dung', 'Tags', 'Trạng thái'].map((name) =>
        header.indexOf(normalize(name)),
      );
      if (columns.some((index) => index < 0))
        throw new Error('File thiếu cột. Vui lòng dùng file mẫu.');
      const existing = await aiApi.listKnowledge();
      const titles = new Set(existing.map((item) => normalize(item.title)));
      const parsed: Row[] = [];
      setPhase('Đang kiểm tra dữ liệu');
      for (let i = 0; i < cells.length; i++) {
        const values = columns.map((index) => String(cells[i][index] ?? '').trim());
        if (!values.some(Boolean)) continue;
        const [title, content, tags, rawStatus] = values;
        const status = normalize(rawStatus);
        const validStatus = ['active', 'inactive', 'đang dùng', 'tạm tắt'].includes(status);
        const error =
          !title || !content
            ? 'Thiếu tiêu đề hoặc nội dung'
            : title.length > 255 || tags.length > 255
              ? 'Tiêu đề và Tags tối đa 255 ký tự'
              : !validStatus
                ? 'Trạng thái phải là active/inactive hoặc Đang dùng/Tạm tắt'
                : '';
        const duplicate = titles.has(normalize(title));
        titles.add(normalize(title));
        const review = hasPlaceholder(content);
        parsed.push({
          title,
          content,
          tags,
          status: ['inactive', 'tạm tắt'].includes(status) ? 'inactive' : 'active',
          error,
          saveError: '',
          duplicate,
          selected: !error && !duplicate && !review,
          saved: false,
        });
        if (i % 100 === 0) {
          setProgress(20 + Math.round((80 * (i + 1)) / cells.length));
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      if (!parsed.length) throw new Error('File không có dữ liệu.');
      setRows(parsed);
      setProgress(100);
      setOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không đọc được file.', 'error');
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  function toggleAll() {
    const allSelected = visibleRows.every(({ row }) => row.selected || row.error || row.saved);
    const visibleIndexes = new Set(visibleRows.map(({ index }) => index));
    setRows((previous) =>
      previous.map((row, index) =>
        visibleIndexes.has(index) && !row.error && !row.saved
          ? { ...row, selected: !allSelected }
          : row,
      ),
    );
  }

  function editRow(index: number, field: 'title' | 'content' | 'tags', value: string) {
    setRows((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === index
          ? (() => {
              const updated = { ...row, [field]: value };
              return {
                ...updated,
                error:
                  !updated.title.trim() || !updated.content.trim()
                    ? 'Thiếu tiêu đề hoặc nội dung'
                    : updated.title.length > 255 || updated.tags.length > 255
                      ? 'Tiêu đề và Tags tối đa 255 ký tự'
                      : '',
              };
            })()
          : row,
      ),
    );
  }

  async function save() {
    setConfirmCount(0);
    setBusy(true);
    setPhase('Đang lưu');
    setProgress(0);
    const selected = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.selected && !row.saved && !row.error);
    setTotalCount(selected.length);
    setDoneCount(0);
    const skippedDuplicates = rows.filter((row) => row.duplicate && !row.selected).length;
    let failed = 0;
    let added = 0;
    for (const { row, index } of selected) {
      try {
        await aiApi.createKnowledge({
          title: row.title,
          content: row.content,
          tags: row.tags,
          status: row.status,
        });
        added++;
        setRows((previous) =>
          previous.map((item, i) =>
            i === index ? { ...item, saved: true, selected: false, saveError: '' } : item,
          ),
        );
      } catch (error) {
        failed++;
        setRows((previous) =>
          previous.map((item, i) =>
            i === index
              ? {
                  ...item,
                  saveError: error instanceof Error ? error.message : 'Không lưu được dòng này.',
                }
              : item,
          ),
        );
      }
      const done = added + failed;
      setDoneCount(done);
      setProgress(Math.round((done / selected.length) * 100));
    }
    await client.invalidateQueries({ queryKey: ['ai-knowledge'] });
    setBusy(false);
    setPhase('');
    if (failed) {
      showToast(`Đã thêm ${added} dòng; ${failed} dòng lỗi vẫn được giữ để thử lại.`, 'error');
      return;
    }
    showToast(`Đã thêm ${added} tri thức (bỏ qua ${skippedDuplicates} dòng trùng)`, 'success');
    closePreview();
  }

  function requestSave() {
    const selectedPlaceholders = rows.filter(
      (row) => row.selected && !row.error && !row.saved && hasPlaceholder(row.content),
    ).length;
    if (selectedPlaceholders) {
      setConfirmCount(selectedPlaceholders);
      return;
    }
    void save();
  }

  function renderContent(content: string) {
    const highlightedPattern = new RegExp(`(\\[(?:${placeholderSource})[^\\]]*\\])`, 'gi');
    return content
      .split(highlightedPattern)
      .map((part, index) =>
        placeholderPattern.test(part) ? <mark key={index}>{part}</mark> : part,
      );
  }

  return (
    <>
      {!triggerOnly && (
        <Button type="button" variant="outline" disabled={busy} onClick={template}>
          <Download size={16} aria-hidden />
          Tải file mẫu
        </Button>
      )}
      <Button
        ref={opener}
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload size={16} aria-hidden />
        Nhập từ file
      </Button>
      <input
        ref={input}
        hidden
        type="file"
        accept=".csv,.xlsx"
        aria-label="File tri thức"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void read(file);
        }}
      />
      {busy && !open && (
        <span role="status">
          {phase}: {progress}%
        </span>
      )}
      {open &&
        createPortal(
          <div
            className={styles.importPreview}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !busy) closePreview();
            }}
          >
            <section
              ref={dialog}
              className={`${styles.importDialog} ${busy ? styles.importDialogBusy : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="knowledge-import-title"
              tabIndex={-1}
            >
              <header className={styles.dialogHeader}>
                <h2 id="knowledge-import-title">Xem trước import – {rows.length} dòng</h2>
                <div className={styles.summaryBadges} aria-label="Tóm tắt dữ liệu import">
                  <span className={styles.badge}>{rows.length} dòng</span>
                  <span className={`${styles.badge} ${styles.badgeNew}`}>{newCount} mới</span>
                  <span className={`${styles.badge} ${styles.badgeDuplicate}`}>
                    {duplicateCount} trùng tiêu đề
                  </span>
                  <span className={`${styles.badge} ${styles.badgeReview}`}>
                    {reviewCount} cần kiểm tra
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Đóng xem trước"
                  title="Đóng xem trước"
                  disabled={busy}
                  onClick={closePreview}
                >
                  <X size={18} aria-hidden />
                </Button>
              </header>
              {busy && (
                <div className={styles.progressText} role="status" aria-live="polite">
                  {phase} {doneCount}/{totalCount}…
                </div>
              )}
              <div className={styles.toolbar}>
                <input
                  type="search"
                  aria-label="Tìm trong bảng import"
                  placeholder="Tìm tiêu đề, nội dung, tags"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                />
                <div className={styles.filterGroup} role="group" aria-label="Lọc dòng import">
                  {(
                    [
                      ['all', 'Tất cả'],
                      ['new', 'Mới'],
                      ['duplicate', 'Trùng'],
                      ['review', 'Cần kiểm tra'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={filter === value ? styles.filterActive : undefined}
                      aria-pressed={filter === value}
                      onClick={() => {
                        setFilter(value);
                        setPage(0);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={toggleAll}
                >
                  {visibleRows.every(({ row }) => row.selected || row.error || row.saved)
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </Button>
                <label>
                  Dòng/trang{' '}
                  <select
                    aria-label="Số dòng mỗi trang"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(0);
                    }}
                  >
                    {[20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Chọn</th>
                      <th scope="col">Tiêu đề</th>
                      <th scope="col">Nội dung</th>
                      <th scope="col">Tags</th>
                      <th scope="col">Trạng thái import</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ row, index }) => {
                      const isExpanded = expanded.includes(index);
                      const tags = row.tags
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean);
                      return (
                        <FragmentRow
                          key={index}
                          row={row}
                          index={index}
                          expanded={isExpanded}
                          editing={editingIndex === index}
                          tags={tags}
                          onToggleExpand={() =>
                            setExpanded((current) =>
                              isExpanded
                                ? current.filter((item) => item !== index)
                                : [...current, index],
                            )
                          }
                          onSelect={(selected) =>
                            setRows((previous) =>
                              previous.map((item, rowIndex) =>
                                rowIndex === index ? { ...item, selected } : item,
                              ),
                            )
                          }
                          onEdit={() => setEditingIndex(editingIndex === index ? null : index)}
                          onChange={editRow}
                          renderContent={renderContent}
                        />
                      );
                    })}
                    {!visibleRows.length && (
                      <tr>
                        <td colSpan={5}>Không có dòng phù hợp.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className={styles.dialogFooter}>
                <div className={styles.pagination}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || page === 0}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Trước
                  </Button>
                  <span>
                    {page + 1}/{pageCount}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || page + 1 >= pageCount}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Sau
                  </Button>
                </div>
                <p className={styles.duplicateHelp}>
                  Dòng có tiêu đề trùng với dữ liệu đã có sẽ được bỏ chọn mặc định. Tick lại nếu
                  muốn thêm như một bản mới.
                </p>
                <div className={styles.footerActions}>
                  <Button type="button" variant="outline" disabled={busy} onClick={closePreview}>
                    Đóng xem trước
                  </Button>
                  <Button
                    type="button"
                    isLoading={busy}
                    disabled={!selectedCount || busy}
                    onClick={requestSave}
                  >
                    {busy
                      ? `Đang lưu ${doneCount}/${totalCount}…`
                      : `Lưu ${selectedCount} dòng đã chọn`}
                  </Button>
                </div>
              </footer>
              {confirmCount > 0 && (
                <div className={styles.confirmationOverlay}>
                  <section
                    className={styles.confirmation}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="placeholder-confirm-title"
                    aria-describedby="placeholder-confirm-description"
                  >
                    <h3 id="placeholder-confirm-title">Cần xác nhận nội dung</h3>
                    <p id="placeholder-confirm-description">
                      {confirmCount} dòng còn chứa nội dung [ĐIỀN]/[XÁC NHẬN]. Chatbot có thể trả
                      lời sai. Vẫn lưu?
                    </p>
                    <div className={styles.confirmationActions}>
                      <Button
                        ref={confirmationBack}
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmCount(0)}
                      >
                        Quay lại sửa
                      </Button>
                      <Button type="button" onClick={() => void save()}>
                        Vẫn lưu
                      </Button>
                    </div>
                  </section>
                </div>
              )}
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

function FragmentRow({
  row,
  index,
  expanded,
  editing,
  tags,
  onToggleExpand,
  onSelect,
  onEdit,
  onChange,
  renderContent,
}: {
  row: Row;
  index: number;
  expanded: boolean;
  editing: boolean;
  tags: string[];
  onToggleExpand: () => void;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onChange: (index: number, field: 'title' | 'content' | 'tags', value: string) => void;
  renderContent: (content: string) => React.ReactNode;
}) {
  const needsReview = hasPlaceholder(row.content);
  return (
    <>
      <tr>
        <td>
          <input
            type="checkbox"
            aria-label={`Chọn dòng ${index + 1}: ${row.title}`}
            checked={row.selected}
            disabled={!!row.error || row.saved}
            onChange={(event) => onSelect(event.target.checked)}
          />
        </td>
        <td>
          {row.title}
          <button type="button" className={styles.editButton} onClick={onEdit}>
            {editing ? 'Đóng sửa' : 'Sửa'}
          </button>
        </td>
        <td>
          <button
            type="button"
            className={`${styles.previewContent} ${expanded ? styles.previewContentExpanded : ''}`}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} nội dung dòng ${index + 1}`}
            onClick={onToggleExpand}
          >
            {renderContent(row.content)}
          </button>
        </td>
        <td>
          <div className={styles.tags}>
            {tags.slice(0, 3).map((tag, tagIndex) => (
              <span className={styles.tagChip} key={`${tag}-${tagIndex}`}>
                {tag}
              </span>
            ))}
            {tags.length > 3 && <span className={styles.tagChip}>+{tags.length - 3}</span>}
          </div>
        </td>
        <td>
          <div className={styles.statusCell}>
            {row.saved ? (
              <span className={styles.badge}>Đã lưu</span>
            ) : row.error ? (
              <span className={`${styles.badge} ${styles.badgeError}`}>{row.error}</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeNew}`}>
                {row.status === 'active' ? 'Đang dùng' : 'Tạm tắt'}
              </span>
            )}
            {row.duplicate && (
              <span className={`${styles.badge} ${styles.badgeDuplicate}`}>Trùng tiêu đề</span>
            )}
            {needsReview && (
              <span className={`${styles.badge} ${styles.badgeReview}`}>Cần kiểm tra</span>
            )}
            {row.saveError && (
              <span className={`${styles.badge} ${styles.badgeError}`}>{row.saveError}</span>
            )}
          </div>
        </td>
      </tr>
      {editing && (
        <tr className={styles.editRow}>
          <td colSpan={5}>
            <div className={styles.editRowFields}>
              <label>
                Tiêu đề
                <input
                  value={row.title}
                  onChange={(event) => onChange(index, 'title', event.target.value)}
                />
              </label>
              <label>
                Nội dung
                <textarea
                  rows={3}
                  value={row.content}
                  onChange={(event) => onChange(index, 'content', event.target.value)}
                />
              </label>
              <label>
                Tags
                <input
                  value={row.tags}
                  onChange={(event) => onChange(index, 'tags', event.target.value)}
                />
              </label>
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                Xong
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
