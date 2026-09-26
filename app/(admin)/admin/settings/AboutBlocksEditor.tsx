'use client';

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { TextField, TextareaField, CheckboxField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { FormCard, IconButton, EmptyState } from '@/components/ui/FormLayout';
import styles from '@/components/ui/FormLayout.module.scss';

type AboutBlock = {
  type: string;
  enabled: boolean;
  title: string;
  content: string;
};

export function AboutBlocksEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const blocks = useMemo<AboutBlock[]>(() => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [value]);

  const commit = (next: AboutBlock[]) => onChange(JSON.stringify(next));
  const update = (index: number, patch: Partial<AboutBlock>) =>
    commit(blocks.map((block, position) => (position === index ? { ...block, ...patch } : block)));
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  return (
    <FormCard
      title="Các khối trang Giới thiệu"
      description="Sắp xếp nội dung và chọn những khối hiển thị trên trang Giới thiệu."
    >
      {!blocks.length && (
        <EmptyState
          title="Chưa có khối nội dung nào"
          description="Thêm khối đầu tiên để bắt đầu giới thiệu chi nhánh."
        />
      )}
      {blocks.map((block, index) => (
        <section key={index} className={styles.block}>
          <div className={styles.header}>
            <div className={styles.stack}>
              <strong>Khối {index + 1}</strong>
              <span className={styles.badge}>{block.type || 'Chưa đặt loại'}</span>
            </div>
            <div className={styles.rowActions}>
              <IconButton
                type="button"
                label={`Đưa khối ${index + 1} lên`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={16} />
              </IconButton>
              <IconButton
                type="button"
                label={`Đưa khối ${index + 1} xuống`}
                disabled={index === blocks.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} />
              </IconButton>
              <IconButton
                type="button"
                label={`Xóa khối ${index + 1}`}
                onClick={() => {
                  if (window.confirm(`Xóa khối ${index + 1}?`))
                    commit(blocks.filter((_, position) => position !== index));
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
          <TextField
            label="Loại khối"
            value={block.type}
            onChange={(event) => update(index, { type: event.target.value })}
          />
          <TextField
            label="Tiêu đề"
            value={block.title}
            onChange={(event) => update(index, { title: event.target.value })}
          />
          <TextareaField
            label="Nội dung"
            rows={4}
            value={block.content}
            onChange={(event) => update(index, { content: event.target.value })}
          />
          <CheckboxField
            label="Hiển thị khối"
            checked={block.enabled}
            onChange={(event) => update(index, { enabled: event.target.checked })}
          />
        </section>
      ))}
      <Button
        variant="secondary"
        className={styles.addButton}
        type="button"
        onClick={() =>
          commit([...blocks, { type: 'section', enabled: true, title: 'Khối mới', content: '' }])
        }
      >
        <Plus size={16} /> Thêm khối
      </Button>
    </FormCard>
  );
}
