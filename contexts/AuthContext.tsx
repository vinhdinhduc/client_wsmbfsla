'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { AUTH_TOKEN_STORAGE_KEY } from '@/lib/api/client';
import { AuthUser } from '@/types/user';

const AUTH_USER_STORAGE_KEY = 'mfsl_auth_user';
/**
 * Cookie (khong httpOnly) chi luu de middleware.ts (chay o Edge, khong doc duoc
 * localStorage) co the doc payload role va chan truy cap URL truc tiep cho UX -
 * KHONG phai lop bao mat that su (backend van tu xac thuc JWT tren moi request).
 */
const AUTH_COOKIE_NAME = 'mfsl_token';
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 ngay, khop mac dinh JWT_EXPIRES_IN cua backend

function setAuthCookie(token: string) {
  document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** true trong khi dang khoi tao (doc localStorage + xac thuc lai token voi /auth/me) */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khoi tao: doc token/user da luu, xac thuc lai voi /auth/me de dam bao token
  // chua het han truoc khi coi la da dang nhap.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      const storedUserRaw = localStorage.getItem(AUTH_USER_STORAGE_KEY);

      if (!storedToken || !storedUserRaw) {
        setIsLoading(false);
        return;
      }

      try {
        const freshUser = await authApi.me();
        if (!cancelled) {
          setAuthCookie(storedToken);
          setToken(storedToken);
          setUser(freshUser);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(result.user));
    setAuthCookie(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      clearAuthCookie();
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, isAuthenticated: Boolean(user && token), login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext phai duoc dung ben trong <AuthProvider>');
  return ctx;
}
