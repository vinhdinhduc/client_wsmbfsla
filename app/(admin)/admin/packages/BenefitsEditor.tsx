'use client';
import { useState } from 'react';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import styles from './packages.module.scss';

export function BenefitsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rows = value ? value.split('\n') : [];
  const [dragged, setDragged] = useState<number | null>(null);
  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length) return;
    const result = [...rows];
    result.splice(to, 0, result.splice(from, 1)[0]);
    onChange(result.join('\n'));
  }
  return (
    <fieldset>
      <legend>Ưu đãi khác</legend>
      {rows.map((row, i) => (
        <div
          key={i}
          className={styles.benefit}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragged !== null) move(dragged, i);
            setDragged(null);
          }}
        >
          <button
            type="button"
            draggable
            title="Kéo để sắp xếp; dùng mũi tên lên/xuống"
            aria-label={`Sắp xếp ưu đãi ${i + 1}`}
            className={styles.handle}
            onDragStart={() => setDragged(i)}
            onDragEnd={() => setDragged(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, i + (e.key === 'ArrowUp' ? -1 : 1));
              }
            }}
          >
            ⠿
          </button>
          <TextField
            label={`Ưu đãi ${i + 1}`}
            value={row}
            maxLength={255}
            onChange={(e) =>
              onChange(rows.map((v, index) => (index === i ? e.target.value : v)).join('\n'))
            }
          />
          <Button
            type="button"
            variant="outline"
            aria-label={`Xóa ưu đãi ${i + 1}`}
            onClick={() => onChange(rows.filter((_, index) => index !== i).join('\n'))}
          >
            Xóa
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...rows, ' '].join('\n'))}>
        Thêm ưu đãi
      </Button>
    </fieldset>
  );
}
