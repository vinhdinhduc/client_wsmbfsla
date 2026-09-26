'use client';

import { useRef, useState } from 'react';
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
  saved: boolean;
};
const normalize = (value: string) => value.normalize('NFC').trim().toLocaleLowerCase('vi-VN');

export function KnowledgeImport() {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [page, setPage] = useState(0);
  const client = useQueryClient();
  const { showToast } = useToast();

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
        parsed.push({
          title,
          content,
          tags,
          status: ['inactive', 'tạm tắt'].includes(status) ? 'inactive' : 'active',
          error,
          duplicate,
          selected: !error && !duplicate,
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
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không đọc được file.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setPhase('Đang lưu tri thức');
    setProgress(0);
    const selected = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.selected && !row.saved && !row.error);
    let done = 0;
    let failed = 0;
    for (const { row, index } of selected) {
      try {
        await aiApi.createKnowledge({
          title: row.title,
          content: row.content,
          tags: row.tags,
          status: row.status,
        });
        setRows((previous) =>
          previous.map((item, i) =>
            i === index ? { ...item, saved: true, selected: false } : item,
          ),
        );
      } catch {
        failed++;
      }
      setProgress(Math.round((++done / selected.length) * 100));
    }
    await client.invalidateQueries({ queryKey: ['ai-knowledge'] });
    setBusy(false);
    showToast(
      `Đã lưu ${done - failed}/${done} dòng.${failed ? ' Các dòng chưa lưu vẫn được chọn để thử lại.' : ''}`,
      failed ? 'error' : 'success',
    );
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={busy} onClick={template}>
        Tải file mẫu
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
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
      {(busy || rows.length > 0) && (
        <section className={styles.importPreview} aria-label="Xem trước nhập tri thức">
          {busy && (
            <div role="status">
              {phase}: {progress}%<progress max={100} value={progress} />
            </div>
          )}
          {rows.length > 0 && (
            <>
              <h3>Xem trước ({rows.length} dòng)</h3>
              <p>
                Tiêu đề trùng với dữ liệu đã có hoặc trong file được bỏ chọn mặc định. Có thể chọn
                lại để thêm bản mới.
              </p>
              <div className={styles.previewTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Chọn</th>
                      <th>Tiêu đề</th>
                      <th>Nội dung</th>
                      <th>Tags</th>
                      <th>Trạng thái / Kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(page * 50, (page + 1) * 50).map((row, offset) => (
                      <tr key={page * 50 + offset}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Chọn dòng ${page * 50 + offset + 1}: ${row.title}`}
                            checked={row.selected}
                            disabled={busy || !!row.error || row.saved}
                            onChange={(event) =>
                              setRows((previous) =>
                                previous.map((item, i) =>
                                  i === page * 50 + offset
                                    ? { ...item, selected: event.target.checked }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>{row.title}</td>
                        <td>
                          <div className={styles.previewContent}>{row.content}</div>
                        </td>
                        <td>{row.tags}</td>
                        <td>
                          {row.saved
                            ? 'Đã lưu'
                            : row.error ||
                              `${row.status === 'active' ? 'Đang dùng' : 'Tạm tắt'}${row.duplicate ? ' · Trùng tiêu đề' : ''}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </Button>
                <span>
                  {page + 1}/{Math.ceil(rows.length / 50)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || (page + 1) * 50 >= rows.length}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setRows([])}>
                  Đóng xem trước
                </Button>
                <Button
                  type="button"
                  isLoading={busy}
                  disabled={!rows.some((row) => row.selected && !row.error && !row.saved)}
                  onClick={save}
                >
                  Lưu {rows.filter((row) => row.selected).length} dòng đã chọn
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
