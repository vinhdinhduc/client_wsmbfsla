'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stationsApi } from '@/lib/api/stations';
import {
  STATION_STATUSES,
  STATION_TYPES,
  type Station,
  type StationInput,
  type StationLocation,
  type StationStatus,
} from '@/types/station';
import { StationForm } from './StationForm';
import styles from './Stations.module.scss';

const StationMap = dynamic(() => import('./StationMap'), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}>Đang tải bản đồ…</div>,
});
const EMPTY_STATIONS: Station[] = [];

export default function StationDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statuses, setStatuses] = useState<StationStatus[]>([]);
  const [type, setType] = useState('');
  const [coverage, setCoverage] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [defaultRadius, setDefaultRadius] = useState(1500);
  const [viewportOnly, setViewportOnly] = useState(false);
  const [bbox, setBbox] = useState('');
  const [focus, setFocus] = useState<{ station: Station; sequence: number } | null>(null);
  const [location, setLocation] = useState<StationLocation | null>(null);
  const [address, setAddress] = useState('');
  const [form, setForm] = useState<{ station: Station | null } | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const formAnchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statuses.join(','),
      type,
      bbox: viewportOnly ? bbox : undefined,
    }),
    [debouncedSearch, statuses, type, viewportOnly, bbox],
  );
  const query = useQuery({
    queryKey: ['stations', 'list', filters],
    queryFn: () => stationsApi.list(filters),
    enabled: !viewportOnly || Boolean(bbox),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const stations = query.data ?? EMPTY_STATIONS;
  const nearest = useQuery({
    queryKey: ['stations', 'nearest', location],
    queryFn: () => stationsApi.nearest(location!),
    enabled: Boolean(location),
    refetchInterval: 30000,
  });
  const geocode = useMutation({
    mutationFn: stationsApi.geocode,
    onSuccess: (result) => {
      if (!result) {
        setActionError('Không tìm thấy địa chỉ. Thử địa chỉ đầy đủ hơn hoặc nhập vĩ độ, kinh độ.');
        return;
      }
      setLocation(result);
      setFocus(null);
      setActionError('');
    },
    onError: (error) => setActionError(error.message),
  });
  const save = useMutation({
    mutationFn: (input: StationInput) =>
      form?.station ? stationsApi.update(form.station.id, input) : stationsApi.create(input),
    onSuccess: async () => {
      setForm(null);
      setActionError('');
      setNotice('Đã lưu trạm.');
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
    onError: (error) => setActionError(error.message),
  });
  const remove = useMutation({
    mutationFn: stationsApi.remove,
    onSuccess: async (_result, id) => {
      if (focus?.station.id === id) setFocus(null);
      if (form?.station?.id === id) setForm(null);
      setActionError('');
      setNotice('Đã xóa trạm.');
      await queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
    onError: (error) => setActionError(error.message),
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);
  useEffect(() => {
    if (form) formAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [form]);

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatuses([]);
    setType('');
    setViewportOnly(false);
    setFocus(null);
  }
  function selectStation(station: Station, reset = false) {
    if (reset) resetFilters();
    setFocus({ station, sequence: Date.now() });
  }
  function findAddress(event: FormEvent) {
    event.preventDefault();
    if (geocode.isPending) return;
    setActionError('');
    const coordinates = address.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordinates) {
      const lat = Number(coordinates[1]);
      const lng = Number(coordinates[2]);
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        setActionError('Tọa độ nằm ngoài phạm vi hợp lệ.');
        return;
      }
      setLocation({ lat, lng, label: address.trim() });
      setFocus(null);
    } else {
      setLocation(null);
      geocode.mutate(address.trim());
    }
  }
  async function exportExcel() {
    setExporting(true);
    setActionError('');
    try {
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.json_to_sheet(
        stations.map((station) => ({
          ID: station.id,
          'Mã trạm': station.code,
          'Tên trạm': station.name,
          'Địa chỉ': station.address,
          'Vĩ độ': station.latitude,
          'Kinh độ': station.longitude,
          'Loại trạm': station.type,
          'Trạng thái': STATION_STATUSES[station.status].label,
          'Công suất (W)': station.power_watts,
          'Bán kính phủ sóng (m)': station.coverage_radius_m,
          'Ngày lắp đặt': station.installed_at,
          'Ghi chú': station.notes,
          'Ngày tạo': station.created_at,
          'Cập nhật lúc': station.updated_at,
        })),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Trạm BTS');
      XLSX.writeFile(workbook, `tram-bts-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      setActionError('Không xuất được Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }
  const pages = Math.max(1, Math.ceil(stations.length / 25));
  const currentPage = Math.min(page, pages);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1>Bản đồ trạm BTS</h1>
          <p>Quản lý hạ tầng mạng MobiFone Sơn La</p>
        </div>
        <div className={styles.actions}>
          <button
            disabled={save.isPending}
            onClick={() => {
              setForm({ station: null });
              setActionError('');
            }}
            className={styles.primary}
          >
            Thêm trạm
          </button>
          <button
            onClick={exportExcel}
            disabled={
              !stations.length ||
              query.isFetching ||
              query.isError ||
              search.trim() !== debouncedSearch ||
              exporting
            }
          >
            {exporting ? 'Đang xuất…' : 'Xuất Excel'}
          </button>
          <button
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['stations'] })}
            disabled={query.isFetching}
          >
            Làm mới
          </button>
        </div>
      </header>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}
      {query.isError && (
        <p className={styles.error} role="alert">
          Không tải được danh sách trạm: {query.error.message}{' '}
          <button onClick={() => void query.refetch()}>Thử lại</button>
        </p>
      )}
      <div className={styles.layout}>
        <aside className={styles.panel} aria-label="Bộ lọc và tìm trạm">
          <h2>Lọc trạm</h2>
          <label>
            Tìm tên hoặc mã trạm
            <input
              type="search"
              value={search}
              maxLength={200}
              onChange={(event) => {
                setSearch(event.target.value);
                setFocus(null);
              }}
              placeholder="Ví dụ: SL-001"
            />
          </label>
          <details className={styles.statusFilter}>
            <summary>Trạng thái {statuses.length ? `(${statuses.length})` : '(tất cả)'}</summary>
            {Object.entries(STATION_STATUSES).map(([status, info]) => (
              <label className={styles.check} key={status}>
                <input
                  type="checkbox"
                  checked={statuses.includes(status as StationStatus)}
                  onChange={(event) => {
                    setFocus(null);
                    setStatuses((old) =>
                      event.target.checked
                        ? [...old, status as StationStatus]
                        : old.filter((value) => value !== status),
                    );
                  }}
                />
                <span className={styles.swatch} style={{ background: info.color }} />
                {info.label}
              </label>
            ))}
          </details>
          <label>
            Loại trạm
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setFocus(null);
              }}
            >
              <option value="">Tất cả công nghệ</option>
              {STATION_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button onClick={resetFilters}>Xóa bộ lọc</button>
          <div className={styles.toggles}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={coverage}
                onChange={(event) => setCoverage(event.target.checked)}
              />
              Vùng phủ sóng ước tính
            </label>
            {coverage && (
              <>
                <label>
                  Bán kính mặc định (m)
                  <input
                    type="number"
                    value={defaultRadius}
                    min={1}
                    max={100000}
                    step={1}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isInteger(value) && value >= 1 && value <= 100000)
                        setDefaultRadius(value);
                    }}
                  />
                </label>
                <p className={styles.muted}>
                  Vòng tròn tham khảo, không thay thế đo kiểm vùng phủ.
                </p>
              </>
            )}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={heatmap}
                onChange={(event) => setHeatmap(event.target.checked)}
              />
              Heatmap mật độ trạm
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={viewportOnly}
                onChange={(event) => {
                  setViewportOnly(event.target.checked);
                  setFocus(null);
                }}
              />
              Chỉ tải trạm trong khung nhìn
            </label>
          </div>
          <p role="status" className={styles.muted}>
            {query.isFetching
              ? 'Đang tải trạm…'
              : `${stations.length} trạm khớp bộ lọc${viewportOnly ? ' trong khung nhìn' : ''}`}
          </p>
          {!query.isPending && !query.isError && !stations.length && <p>Không có trạm phù hợp.</p>}
          {debouncedSearch && (
            <ul className={styles.results} aria-label="Kết quả tìm trạm">
              {stations.slice(0, 20).map((station) => (
                <li key={station.id}>
                  <button onClick={() => selectStation(station)}>
                    {station.code} · {station.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h2>Trạm gần nhất</h2>
          <form onSubmit={findAddress} className={styles.addressForm}>
            <label>
              Địa chỉ hoặc vĩ độ, kinh độ
              <input
                required
                minLength={5}
                maxLength={200}
                value={address}
                disabled={geocode.isPending}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="21.3256, 103.9188"
              />
            </label>
            <button type="submit" disabled={geocode.isPending}>
              {geocode.isPending ? 'Đang tìm…' : 'Tìm vị trí'}
            </button>
          </form>
          <p className={styles.muted}>
            Tìm trong toàn bộ trạm, khoảng cách đường chim bay. Địa chỉ: © OpenStreetMap
            contributors.
          </p>
          {location && (
            <div>
              <p>{location.label}</p>
              <button
                onClick={() => {
                  setLocation(null);
                  setFocus(null);
                }}
              >
                Xóa vị trí tìm kiếm
              </button>
            </div>
          )}
          {location && nearest.isPending && <p role="status">Đang tìm trạm gần nhất…</p>}
          {nearest.isError && (
            <p role="alert" className={styles.error}>
              {nearest.error.message}
            </p>
          )}
          {location && nearest.data?.length === 0 && <p>Chưa có trạm để tính khoảng cách.</p>}
          {location && (
            <ol className={styles.results} aria-label="Trạm gần nhất">
              {nearest.data?.map((station) => (
                <li key={station.id}>
                  <button onClick={() => selectStation(station, true)}>
                    <strong>
                      {station.code} · {station.name}
                    </strong>
                    <span>
                      {station.distance_km.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>
        <section className={styles.mapSection} aria-label="Bản đồ BTS">
          <StationMap
            stations={stations}
            coverage={coverage}
            heatmap={heatmap}
            defaultRadius={defaultRadius}
            focus={focus}
            location={location}
            onBounds={setBbox}
          />
          <div className={styles.legend}>
            {Object.entries(STATION_STATUSES).map(([key, info]) => (
              <span key={key}>
                <i className={styles.swatch} style={{ background: info.color }} />
                {info.label}
              </span>
            ))}
          </div>
        </section>
      </div>
      <div ref={formAnchor} className={styles.formAnchor}>
        {form && (
          <StationForm
            key={form.station?.id ?? 'new'}
            station={form.station}
            pending={save.isPending}
            onSave={(input) => {
              setActionError('');
              save.mutate(input);
            }}
            onCancel={() => setForm(null)}
          />
        )}
      </div>
      <section className={styles.card} aria-labelledby="station-list-title">
        <h2 id="station-list-title">Danh sách trạm ({stations.length})</h2>
        <p className={styles.muted}>Dữ liệu tự làm mới mỗi 30 giây và sau khi thêm, sửa, xóa.</p>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Mã trạm</th>
                <th>Tên trạm</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Địa chỉ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {stations.slice((currentPage - 1) * 25, currentPage * 25).map((station) => (
                <tr key={station.id}>
                  <td>
                    <button className={styles.textButton} onClick={() => selectStation(station)}>
                      {station.code}
                    </button>
                  </td>
                  <td>{station.name}</td>
                  <td>{station.type}</td>
                  <td>
                    <span className={styles.status}>
                      <i
                        className={styles.swatch}
                        style={{ background: STATION_STATUSES[station.status].color }}
                      />
                      {STATION_STATUSES[station.status].label}
                    </span>
                  </td>
                  <td>{station.address}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        disabled={save.isPending || remove.isPending}
                        onClick={() => {
                          setForm({ station });
                          setActionError('');
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className={styles.danger}
                        disabled={save.isPending || remove.isPending}
                        onClick={() => {
                          if (window.confirm(`Xóa trạm ${station.code}?`))
                            remove.mutate(station.id);
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!stations.length && !query.isPending && <p>Chưa có trạm trong danh sách này.</p>}
        <div className={styles.pagination}>
          <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Trước
          </button>
          <span>
            Trang {currentPage} / {pages}
          </span>
          <button disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>
            Sau
          </button>
        </div>
      </section>
    </div>
  );
}
