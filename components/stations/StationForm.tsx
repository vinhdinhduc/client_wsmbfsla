'use client';

import { useState, type FormEvent } from 'react';
import { STATION_STATUSES, STATION_TYPES, type Station, type StationInput } from '@/types/station';
import styles from './Stations.module.scss';

export function StationForm({
  station,
  pending,
  onSave,
  onCancel,
}: {
  station: Station | null;
  pending: boolean;
  onSave: (input: StationInput) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();
    const optionalNumber = (key: string) => (value(key) === '' ? null : Number(value(key)));
    const installedAt = value('installed_at') || null;
    if (
      installedAt &&
      (!Number.isFinite(Date.parse(installedAt)) ||
        new Date(installedAt).toISOString().slice(0, 10) !== installedAt)
    ) {
      setError('Ngày lắp đặt không hợp lệ');
      return;
    }
    setError('');
    onSave({
      code: value('code'),
      name: value('name'),
      address: value('address'),
      latitude: Number(value('latitude')),
      longitude: Number(value('longitude')),
      type: value('type') as StationInput['type'],
      status: value('status') as StationInput['status'],
      power_watts: optionalNumber('power_watts'),
      coverage_radius_m: optionalNumber('coverage_radius_m'),
      installed_at: installedAt,
      notes: value('notes') || null,
    });
  }
  return (
    <section className={styles.card} aria-labelledby="station-form-title">
      <h2 id="station-form-title">{station ? `Chỉnh sửa ${station.code}` : 'Thêm trạm BTS'}</h2>
      <form onSubmit={submit} className={styles.form}>
        <fieldset disabled={pending} className={styles.fields}>
          <label>
            Mã trạm
            <input
              name="code"
              required
              maxLength={80}
              pattern="[A-Za-z0-9_.\-]+"
              defaultValue={station?.code}
            />
          </label>
          <label>
            Tên trạm
            <input name="name" required maxLength={200} defaultValue={station?.name} />
          </label>
          <label className={styles.wide}>
            Địa chỉ
            <input name="address" required maxLength={500} defaultValue={station?.address} />
          </label>
          <label>
            Vĩ độ
            <input
              name="latitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              required
              defaultValue={station?.latitude}
            />
          </label>
          <label>
            Kinh độ
            <input
              name="longitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              required
              defaultValue={station?.longitude}
            />
          </label>
          <label>
            Loại trạm
            <select name="type" defaultValue={station?.type ?? '4G'}>
              {STATION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue={station?.status ?? 'active'}>
              {Object.entries(STATION_STATUSES).map(([status, info]) => (
                <option key={status} value={status}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Công suất (W)
            <input
              name="power_watts"
              type="number"
              step="any"
              min={0}
              max={1000000}
              defaultValue={station?.power_watts ?? ''}
            />
          </label>
          <label>
            Bán kính phủ sóng (m)
            <input
              name="coverage_radius_m"
              type="number"
              min={1}
              max={100000}
              step={1}
              placeholder="Dùng bán kính mặc định nếu bỏ trống"
              defaultValue={station?.coverage_radius_m ?? ''}
            />
          </label>
          <label>
            Ngày lắp đặt
            <input name="installed_at" type="date" defaultValue={station?.installed_at ?? ''} />
          </label>
          <label className={styles.wide}>
            Ghi chú
            <textarea name="notes" rows={3} maxLength={10000} defaultValue={station?.notes ?? ''} />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="submit" disabled={pending} className={styles.primary}>
            {pending ? 'Đang lưu…' : 'Lưu trạm'}
          </button>
          <button type="button" onClick={onCancel} disabled={pending}>
            Hủy
          </button>
        </div>
      </form>
    </section>
  );
}
