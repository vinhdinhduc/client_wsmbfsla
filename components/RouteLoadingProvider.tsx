'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import LoadingScreen from './LoadingScreen';

const RouteLoadingContext = createContext<{
  active: boolean;
  register: () => () => void;
} | null>(null);

/** Lives outside Suspense so the overlay can fade out after fallback removal. */
export function RouteLoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const register = useCallback(() => {
    setPending((count) => count + 1);
    return () => setPending((count) => count - 1);
  }, []);
  const active = pending > 0;
  const value = useMemo(() => ({ active, register }), [active, register]);

  return (
    <RouteLoadingContext.Provider value={value}>
      {children}
      <LoadingScreen visible={active} />
    </RouteLoadingContext.Provider>
  );
}

export function RouteLoadingFallback() {
  const context = useContext(RouteLoadingContext);
  const register = context?.register;

  useEffect(() => register?.(), [register]);

  // Render immediately during SSR, then hand over to the persistent overlay.
  return context?.active ? null : <LoadingScreen />;
}
