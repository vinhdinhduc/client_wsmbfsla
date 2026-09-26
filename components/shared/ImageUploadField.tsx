import { ChangeEvent, useEffect, useState } from 'react';
import styles from '@/app/(admin)/admin/admin-shared.module.scss';
import { assetUrl } from '@/lib/assets';

interface ImageUploadFieldProps {
  id: string;
  label: string;
  value?: string | null;
  onChange: (file: File | null) => void;
}

export function ImageUploadField({ id, label, value, onChange }: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveImageUrl(value));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(resolveImageUrl(value));
  }, [value]);

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
        onChange={handleChange}
      />
      {previewUrl && (
        <div className={styles.imagePreviewBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Ảnh xem trước" className={styles.imagePreview} />
          <p className={styles.imagePreviewCaption}>Ảnh xem trước</p>
        </div>
      )}
      <p className={styles.muted}>JPG, PNG, WEBP hoặc GIF, tối đa 5MB.</p>
    </div>
  );
}

function resolveImageUrl(imageUrl?: string | null) {
  return assetUrl(imageUrl);
}
