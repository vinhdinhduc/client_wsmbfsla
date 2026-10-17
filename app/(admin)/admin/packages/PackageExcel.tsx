'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { packagesApi, PackageFormValues } from '@/lib/api/packages';
import type { Package } from '@/types/product';
import { packageData } from '@/lib/package-display';
import styles from './packages.module.scss';

const headers = [
  'Mã gói',
  'Tên gói',
  'Nhóm',
  'Giá',
  'Chu kỳ',
  'Đơn vị chu kỳ',
  'Data',
  'Thoại',
  'SMS',
  'Cú pháp đăng ký',
  'Trạng thái',
  'Thứ tự',
];
const groups = { hot: 'Hot', tra_truoc: 'Trả trước', tra_sau: 'Trả sau', wifi_5g: 'Wifi 5G' };
const statuses = { active: 'Đang bán', inactive: 'Ngừng bán', hidden: 'Ẩn' };
type PreviewRow = { row: number; dto?: PackageFormValues; error?: string; existingId?: number };
const unsafe = (value: unknown) => /^[\s]*[=+\-@]/.test(String(value ?? ''));
const slugify = (code: string) => code.toLowerCase().replace(/_/g, '-');

export function PackageExcel({
  packages,
  filtered,
  disabled,
  onDone,
}: {
  packages: Package[];
  filtered: Package[];
  disabled?: boolean;
  onDone: () => void;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [mode, setMode] = useState('skip');
  const [busy, setBusy] = useState(false);
  async function download(template = false) {
    try {
      const XLSX = await import('xlsx');
      const data = template
        ? [headers]
        : [
            headers,
            ...filtered.map((p) =>
              [
                p.code,
                p.name,
                groups[p.group_type],
                Number(p.price),
                p.duration_value,
                p.duration_unit === 'thang' ? 'Tháng' : 'Ngày',
                packageData(p),
                p.call_desc || '',
                p.sms_desc || '',
                p.sms_syntax || '',
                statuses[p.status],
                p.display_order,
              ].map((v) => (typeof v === 'string' && unsafe(v) ? `'${v}` : v)),
            ),
          ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data), 'Gói cước');
      XLSX.writeFile(workbook, template ? 'mau-goi-cuoc.xlsx' : 'goi-cuoc.xlsx');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  }
  async function preview(file?: File) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      showToast('Chọn file .xlsx tối đa 5 MB', 'error');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      if (!headers.every((h, i) => data[0]?.[i] === h))
        throw new Error('Tiêu đề cột không khớp. Hãy dùng file mẫu.');
      if (data.length > 1001) throw new Error('Mỗi lần nhập tối đa 1.000 gói.');
      const seen = new Set<string>();
      const result = data.slice(1).map((cells, index): PreviewRow => {
        try {
          if (
            cells.some(
              (v, i) => unsafe(v) || !!sheet[XLSX.utils.encode_cell({ r: index + 1, c: i })]?.f,
            )
          )
            throw new Error('Nội dung hoặc công thức Excel không an toàn (= + - @).');
          const [
            rawCode,
            rawName,
            rawGroup,
            rawPrice,
            rawDuration,
            rawUnit,
            data,
            call,
            sms,
            syntax,
            rawStatus,
            rawOrder,
          ] = cells;
          const code = String(rawCode).trim().toUpperCase(),
            name = String(rawName).trim();
          if (!/^[A-Z0-9_-]{1,20}$/.test(code)) throw new Error('Mã gói không hợp lệ');
          if (seen.has(code)) throw new Error('Mã bị trùng trong file');
          seen.add(code);
          if (!name || name.length > 100) throw new Error('Tên gói phải từ 1–100 ký tự');
          const group = Object.entries(groups).find(
            ([key, label]) => rawGroup === key || rawGroup === label,
          )?.[0] as Package['group_type'] | undefined;
          const status = Object.entries(statuses).find(
            ([key, label]) => rawStatus === key || rawStatus === label,
          )?.[0] as Package['status'] | undefined;
          if (!group || !status) throw new Error('Nhóm hoặc trạng thái không hợp lệ');
          const price = Number(rawPrice),
            duration = Number(rawDuration),
            order = Number(rawOrder);
          if (
            rawPrice === '' ||
            !Number.isFinite(price) ||
            price < 0 ||
            rawDuration === '' ||
            !Number.isInteger(duration) ||
            duration <= 0 ||
            !Number.isInteger(order)
          )
            throw new Error('Giá, chu kỳ hoặc thứ tự không hợp lệ');
          if (![data, call, sms, syntax].every((v) => String(v).length <= 255))
            throw new Error('Ưu đãi/cú pháp tối đa 255 ký tự');
          if (!['Ngày', 'Tháng', 'ngay', 'thang'].includes(String(rawUnit)))
            throw new Error('Đơn vị chu kỳ phải là Ngày hoặc Tháng');
          const existing = packages.find((p) => p.code.toUpperCase() === code);
          const slug = existing?.slug || slugify(code);
          if (packages.some((p) => p.slug === slug && p.id !== existing?.id))
            throw new Error('Slug tạo từ mã đã tồn tại');
          return {
            row: index + 2,
            existingId: existing?.id,
            dto: {
              code,
              name,
              slug,
              group_type: group,
              price,
              duration_value: duration,
              duration_unit: rawUnit === 'Tháng' || rawUnit === 'thang' ? 'thang' : 'ngay',
              data_desc: String(data) || null,
              call_desc: String(call) || null,
              sms_desc: String(sms) || null,
              sms_syntax: String(syntax) || null,
              status,
              display_order: order,
            },
          };
        } catch (err) {
          return { row: index + 2, error: (err as Error).message };
        }
      });
      setMode('skip');
      setRows(result);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  }
  async function commit() {
    if (!rows) return;
    setBusy(true);
    let completed = 0;
    try {
      for (const row of rows) {
        if (!row.dto || (row.existingId && mode === 'skip')) continue;
        if (row.existingId) await packagesApi.update(row.existingId, row.dto);
        else await packagesApi.create(row.dto);
        completed++;
      }
      showToast(`Đã nhập ${completed} gói. Hãy rà soát nội dung tri thức liên quan.`);
      setRows(null);
    } catch (err) {
      showToast(
        `Đã nhập ${completed} gói; dừng do lỗi: ${(err as Error).message}. Xem trước lại trước khi thử tiếp.`,
        'error',
      );
      setRows(null);
    } finally {
      setBusy(false);
      onDone();
    }
  }
  return (
    <>
      <div className={styles.toolbar}>
        <Button variant="outline" disabled={disabled} onClick={() => download()}>
          Xuất Excel · Xuất {filtered.length} gói
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => download(true)}>
          Tải file mẫu
        </Button>
        <label>
          Nhập từ file{' '}
          <input
            type="file"
            accept=".xlsx"
            disabled={disabled || busy}
            onChange={(e) => {
              preview(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <Modal
        isOpen={rows !== null}
        onClose={() => !busy && setRows(null)}
        title="Xem trước nhập gói cước"
      >
        <p>
          {rows?.length ?? 0} dòng · {rows?.filter((r) => r.existingId).length ?? 0} mã đã tồn tại ·{' '}
          {rows?.filter((r) => r.error).length ?? 0} dòng lỗi
        </p>
        <label>
          Xử lý mã trùng{' '}
          <select disabled={busy} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="skip">Bỏ qua</option>
            <option value="update">Cập nhật các cột trong file</option>
          </select>
        </label>
        <ol className={styles.previewList}>
          {rows?.map((r) => (
            <li key={r.row}>
              Dòng {r.row}:{' '}
              {r.error ||
                `${r.dto?.code} · ${r.dto?.name} · ${r.dto?.price}đ${r.existingId ? ' · Mã đã tồn tại' : ' · Thêm mới'}`}
            </li>
          ))}
        </ol>
        <p>
          Chỉ nhập khi toàn bộ dòng hợp lệ. Các trường không có trong file của gói hiện có được giữ
          nguyên.
        </p>
        <Button
          disabled={
            !rows?.length ||
            rows.some((r) => r.error) ||
            rows.every((r) => r.existingId && mode === 'skip')
          }
          isLoading={busy}
          onClick={commit}
        >
          Xác nhận nhập
        </Button>
      </Modal>
    </>
  );
}
