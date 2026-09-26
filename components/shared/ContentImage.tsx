'use client';

import { useState, type CSSProperties } from 'react';
import { ImageOff } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import styles from './ContentImage.module.scss';

export function ContentImage({
  src,
  alt,
  className,
  style,
  width,
  height,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
}) {
  const url = assetUrl(src);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || url === failedUrl)
    return (
      <span
        className={`${styles.placeholder} ${className ?? ''}`}
        style={{ width, height, ...style }}
        role="img"
        aria-label={url ? `Không tải được ảnh: ${alt}` : 'Chưa có ảnh'}
        title={url ? 'Ảnh không tồn tại hoặc không thể tải. Vui lòng cập nhật ảnh.' : 'Chưa có ảnh'}
      >
        <ImageOff size={22} aria-hidden="true" />
      </span>
    );
  // Uploaded images may be served by a separate API or CDN host.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={() => setFailedUrl(url)}
    />
  );
}
