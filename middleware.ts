import { NextRequest, NextResponse } from 'next/server';
import { isRouteAllowedForRole } from '@/lib/rbac';
import type { UserRole } from '@/types/user';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/403'];

interface DecodedJwtPayload {
  role?: UserRole;
  exp?: number;
}

/**
 * Giai ma phan payload JWT (KHONG verify chu ky - frontend khong duoc giu
 * JWT_SECRET). Chi dung de doc role phuc vu an/hien route cho UX, khong phai
 * lop bao mat that su - bao mat that nam o backend (moi request van gui kem
 * Bearer token va backend tu xac thuc/loc du lieu theo role, muc 4 dau bai).
 */
function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const token = request.cookies.get('mfsl_token')?.value;

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  const isExpired = payload?.exp !== undefined && payload.exp * 1000 < Date.now();

  if (!payload?.role || isExpired) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isRouteAllowedForRole(pathname, payload.role)) {
    return NextResponse.redirect(new URL('/admin/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
