'use client';
import { useEffect, useState } from 'react';
import { jobDeadline } from '@/lib/jobs-presentation';
import styles from './JobDetail.module.scss';
export function JobDeadlineBadge({
  deadline,
  status,
  now,
}: {
  deadline: string;
  status: string;
  now: number;
}) {
  const [clock, setClock] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const info = jobDeadline(deadline, status, clock);
  return (
    <span
      className={`${styles.badge} ${info.closed ? styles.closedBadge : info.days <= 3 ? styles.urgentBadge : styles.deadlineBadge}`}
    >
      {info.closed
        ? 'Đã ngừng nhận hồ sơ'
        : info.days === 0
          ? 'Hạn nộp hôm nay'
          : `Còn ${info.days} ngày`}
    </span>
  );
}
