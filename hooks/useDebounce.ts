import { useEffect, useState } from 'react';

/** Debounce 1 gia tri (vd tu khoa go trong o tim kiem) - tranh goi API lien tuc theo tung ky tu go. */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
