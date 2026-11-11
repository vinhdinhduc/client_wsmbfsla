import { ChangeEvent, useEffect, useState } from 'react';
import styles from '@/app/(admin)/admin/admin-shared.module.scss';
import { assetUrl } from '@/lib/assets';

interface ImageUploadFieldProps {
  id: string;
  label: string;
  hint?: string;
  value?: string | null;
  isUploading?: boolean;
  onChange: (file: File | null) => void;
}

export function ImageUploadField({
  id,
  label,
  hint,
  value,
  isUploading = false,
  onChange,
}: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveImageUrl(value));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [hasUnsupportedAspectRatio, setHasUnsupportedAspectRatio] = useState(false);

  useEffect(() => {
    setPreviewUrl(resolveImageUrl(value));
  }, [value]);

  useEffect(() => {
    setHasUnsupportedAspectRatio(false);
  }, [previewUrl]);

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onChange(file);
    if (!file) {
      setObjectUrl(null);
      setPreviewUrl(resolveImageUrl(value));
      return;
    }
    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setPreviewUrl(nextObjectUrl);
  }

  return (
    <div className={styles.fileField}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={isUploading}
        onChange={handleChange}
      />
      {previewUrl && (
        <div className={styles.imagePreviewBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Ảnh xem trước"
            className={styles.imagePreview}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              const ratio = naturalWidth / naturalHeight;
              setHasUnsupportedAspectRatio(Math.abs(ratio - 4 / 3) > (4 / 3) * 0.05);
            }}
          />
        </div>
      )}
      {previewUrl && (
        <p className={styles.imagePreviewCaption}>Xem trước trong khung ảnh card (4:3)</p>
      )}
      {hasUnsupportedAspectRatio && (
        <p className={styles.imagePreviewError} role="status">
          Ảnh không đúng tỷ lệ 4:3. Ảnh vẫn hiển thị đầy đủ nhưng có thể xuất hiện khoảng trống;
          nên chỉnh về 1200×900.
        </p>
      )}
      <p className={styles.muted}>
        {isUploading ? 'Đang tải ảnh lên…' : 'JPG, PNG, WEBP hoặc GIF, tối đa 5MB.'}
      </p>
      {hint && <p className={styles.muted}>{hint}</p>}
    </div>
  );
}

function resolveImageUrl(imageUrl?: string | null) {
  return assetUrl(imageUrl);
}
