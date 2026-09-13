'use client';

import { useEffect, useState } from 'react';
import styles from '../page.module.scss';

interface Ward {
  code: number;
  name: string;
}

interface District {
  code: number;
  name: string;
  wards: Ward[];
}

const SON_LA_API = 'https://provinces.open-api.vn/api/p/14?depth=2';

export function SonLaAddressFields() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(SON_LA_API)
      .then((response) => {
        if (!response.ok) throw new Error('Không thể tải địa giới Sơn La');
        return response.json() as Promise<{ districts: District[] }>;
      })
      .then((data) => {
        if (!cancelled) setDistricts(data.districts ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const wards = districts.find((district) => district.name === districtName)?.wards ?? [];

  return (
    <div className={styles.addressFields}>
      <div className={styles.addressGrid}>
        <input type="hidden" name="province" value="Sơn La" />
        <label className={styles.addressField}>
          <span>Tỉnh/Thành phố</span>
          <select name="province" value="Sơn La" disabled>
            <option value="Sơn La">Sơn La</option>
          </select>
        </label>
        <label className={styles.addressField}>
          <span>Quận/Huyện/Thị xã</span>
          <select
            name="district"
            value={districtName}
            required
            disabled={loading || districts.length === 0}
            onChange={(event) => {
              setDistrictName(event.target.value);
              setWardName('');
            }}
          >
            <option value="">{loading ? 'Đang tải...' : 'Chọn huyện/thị xã'}</option>
            {districts.map((district) => (
              <option key={district.code} value={district.name}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={styles.addressField}>
        <span>Xã/Phường/Thị trấn</span>
        <select
          name="ward"
          value={wardName}
          required
          disabled={!districtName || wards.length === 0}
          onChange={(event) => setWardName(event.target.value)}
        >
          <option value="">Chọn xã/phường</option>
          {wards.map((ward) => (
            <option key={ward.code} value={ward.name}>
              {ward.name}
            </option>
          ))}
        </select>
      </label>
      {loadError && <p className={styles.addressError}>Không thể tải danh sách địa giới Sơn La.</p>}
    </div>
  );
}
