'use client';
import { FilterBar } from '@/components/ui/FilterBar';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi, DashboardPoint } from '@/lib/api/dashboard';
import styles from './page.module.scss';

const vn = new Intl.NumberFormat('vi-VN');
const localDay = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
const shift = (days: number) => localDay(new Date(Date.now() + days * 86400000));

function Chart({ title, kind, data }: { title: string; kind: string; data: DashboardPoint[] }) {
  const max = Math.max(1, ...data.map((point) => Number(point.value)));
  const points = data
    .map(
      (point, index) =>
        `${data.length === 1 ? 0 : (index * 100) / (data.length - 1)},${100 - (Number(point.value) * 90) / max}`,
    )
    .join(' ');
  const download = () => {
    const csv = [
      'Nhãn,Giá trị',
      ...data.map(
        (point) =>
          `"${String(point.date || point.label || '').replaceAll('"', '""')}",${point.value}`,
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replaceAll(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className={styles.chart} aria-label={title}>
      <div className={styles.chartHeading}>
        <h2>{title}</h2>
        <button onClick={download} type="button">
          CSV
        </button>
      </div>
      {data.length === 0 || data.every((point) => Number(point.value) === 0) ? (
        <p className={styles.empty}>Chưa có dữ liệu trong kỳ này</p>
      ) : kind === 'line' ? (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={styles.line}
          role="img"
          aria-label={`${title}: ${data.map((p) => `${p.date} ${p.value}`).join(', ')}`}
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            points={points}
          />
        </svg>
      ) : kind === 'donut' ? (
        <div className={styles.donutWrap}>
          <svg viewBox="0 0 100 100" className={styles.donut} role="img" aria-label={title}>
            {data.map((point, index) => {
              const sum = data.reduce((acc, item) => acc + Number(item.value), 0);
              const start = data.slice(0, index).reduce((acc, item) => acc + Number(item.value), 0);
              const length = (Number(point.value) / sum) * 251.3;
              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={['#2374d9', '#f59e0b', '#28a775', '#a855f7', '#e85d75'][index % 5]}
                  strokeWidth="16"
                  strokeDasharray={`${length} ${251.3 - length}`}
                  strokeDashoffset={(-start / sum) * 251.3}
                  transform="rotate(-90 50 50)"
                />
              );
            })}
          </svg>
          <div>
            {data.map((point) => (
              <p key={point.label}>
                {point.label}: {vn.format(Number(point.value))}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.bars}>
          {data.map((point, index) => (
            <div
              key={`${point.label}-${index}`}
              className={styles.barRow}
              title={`${point.label}: ${vn.format(Number(point.value))}`}
            >
              <span>{point.label}</span>
              <div>
                <i style={{ width: `${(Number(point.value) * 100) / max}%` }} />
              </div>
              <strong>{vn.format(Number(point.value))}</strong>
            </div>
          ))}
        </div>
      )}
      {kind === 'line' && data.length > 0 && (
        <div className={styles.axis}>
          <span>{data[0].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>
      )}
    </section>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState(shift(-29));
  const [to, setTo] = useState(shift(0));
  const dashboard = useQuery({
    queryKey: ['dashboard', from, to],
    queryFn: () => dashboardApi.get(from, to),
    staleTime: 60_000,
  });
  const health = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: dashboardApi.health,
    refetchInterval: 60_000,
  });
  const selectPreset = (value: string) => {
    setPreset(value);
    if (value === 'today') {
      setFrom(shift(0));
      setTo(shift(0));
    }
    if (value === '7') {
      setFrom(shift(-6));
      setTo(shift(0));
    }
    if (value === '30') {
      setFrom(shift(-29));
      setTo(shift(0));
    }
    if (value === 'month') {
      const now = new Date();
      setFrom(localDay(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(shift(0));
    }
  };
  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <div>
          <h1 className={styles.title}>Bảng điều khiển</h1>
          <p className={styles.description}>Xin chào, {user?.full_name || 'quản trị viên'}.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            dashboard.refetch();
            health.refetch();
          }}
        >
          Làm mới
        </button>
      </div>
      <FilterBar label="Lọc thống kê">
        <label>
          Thời gian{' '}
          <select value={preset} onChange={(e) => selectPreset(e.target.value)}>
            <option value="today">Hôm nay</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chọn</option>
          </select>
        </label>
        {preset === 'custom' && (
          <>
            <label>
              Từ <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Đến <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </>
        )}
      </FilterBar>
      {dashboard.isLoading ? (
        <p>Đang tải số liệu…</p>
      ) : dashboard.isError ? (
        <p role="alert">{(dashboard.error as Error).message}</p>
      ) : (
        dashboard.data && (
          <>
            <p className={styles.description}>
              Cập nhật lúc {new Date(dashboard.data.updated_at).toLocaleTimeString('vi-VN')}
            </p>
            <div className={styles.grid}>
              {dashboard.data.kpis.map((item) => (
                <Link key={item.label} href={item.href} className={styles.kpi}>
                  <span>{item.label}</span>
                  <strong>{vn.format(item.value)}</strong>
                  <small>
                    {item.change === null
                      ? 'Chưa có kỳ trước'
                      : `${item.change >= 0 ? '+' : ''}${item.change}% so với kỳ trước`}
                  </small>
                  <svg viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      points={item.sparkline
                        .map(
                          (p, index) =>
                            `${item.sparkline.length === 1 ? 0 : (index * 100) / (item.sparkline.length - 1)},${24 - (Number(p.value) * 22) / Math.max(1, ...item.sparkline.map((v) => Number(v.value)))}`,
                        )
                        .join(' ')}
                    />
                  </svg>
                </Link>
              ))}
            </div>
            <div className={styles.charts}>
              {dashboard.data.charts.map((chart) => (
                <Chart key={chart.title} {...chart} />
              ))}
            </div>
            <div className={styles.charts}>
              <section className={styles.chart}>
                <h2>Cần xử lý ngay</h2>
                {dashboard.data.urgent.length ? (
                  dashboard.data.urgent.map((item) => (
                    <Link key={item.label} href={item.href} className={styles.row}>
                      {item.label}
                      <strong>{vn.format(item.count)}</strong>
                    </Link>
                  ))
                ) : (
                  <p>Không có mục cần xử lý</p>
                )}
              </section>
              {user?.role === 'admin' && (
                <section className={styles.chart}>
                  <h2>Hoạt động gần đây</h2>
                  {dashboard.data.activity.map((item, index) => (
                    <p key={index} className={styles.row}>
                      {item.module} · {item.action}
                      <span>{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                    </p>
                  ))}
                </section>
              )}
            </div>
          </>
        )
      )}
      {health.data && (
        <section className={styles.chart}>
          <h2>Sức khỏe hệ thống</h2>
          <div className={styles.health}>
            {Object.entries(health.data.services).map(([name, status]) => (
              <span
                key={name}
                title={health.data.checked_at}
                className={status === 'error' ? styles.bad : styles.good}
              >
                {name.toUpperCase()}:{' '}
                {status === 'ok' ? 'Hoạt động' : status === 'configured' ? 'Đã cấu hình' : 'Lỗi'}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
