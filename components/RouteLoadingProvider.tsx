'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import LoadingScreen from './LoadingScreen';
import InitialPageLoader from './InitialPageLoader';

const RouteLoadingContext = createContext<{
  active: boolean;
  register: () => () => void;
} | null>(null);

/** The initial curtain stays outside Suspense; route fallbacks stay inline. */
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
      <InitialPageLoader routeLoading={active} />
      {children}
    </RouteLoadingContext.Provider>
  );
}

export function RouteLoadingFallback() {
  const context = useContext(RouteLoadingContext);
  const register = context?.register;

  useEffect(() => register?.(), [register]);

  return <LoadingScreen fullScreen={false} />;
}
