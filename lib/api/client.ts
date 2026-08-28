import { env } from '@/lib/env';

export const AUTH_TOKEN_STORAGE_KEY = 'mfsl_auth_token';

interface BackendEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

/** Loi thong nhat duoc throw boi apiFetch - noi goi (react-query/try-catch) doc .message de hien Toast. */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** FormData thay vi JSON (vd: import Excel) - khong tu set Content-Type de trinh duyet tu gan boundary. */
  isFormData?: boolean;
  /** Token JWT tuong minh - dung khi goi tu Server Action/Route Handler. Bo trong o Client Component se tu doc localStorage. */
  token?: string;
  /** Chi dung cho Server Component: chien luoc cache/ISR cua Next.js fetch. */
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
  /** Query string params - undefined/null se tu dong bi bo qua. */
  params?: Record<string, string | number | boolean | undefined | null>;
};

function readTokenFromBrowser(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function buildUrl(path: string, params?: ApiFetchOptions['params']): string {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Tang goi API goc dung chung cho toan bo lib/api/*.ts (muc 5 dau bai).
 * Luon unwrap phan `data`, va throw 1 Error co message lay tu truong `message`
 * cua response khi success=false, de noi goi khong phai tu lap logic parse.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData, token, next, cache, params } = options;

  const headers: HeadersInit = {};
  const authToken = token ?? readTokenFromBrowser();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData) {
      requestBody = body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: requestBody,
      cache,
      next,
    });
  } catch {
    throw new ApiError('Khong the ket noi toi may chu, vui long kiem tra lai duong truyen mang', 0);
  }

  // File binary (vd export Excel) - tra ve truc tiep response, khong parse JSON.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError('Co loi xay ra khi tai file tu may chu', response.status);
    }
    return (await response.blob()) as unknown as T;
  }

  const payload = (await response.json()) as BackendEnvelope<T>;

  if (!payload.success) {
    throw new ApiError(payload.message || 'Da co loi xay ra, vui long thu lai', response.status);
  }

  return payload.data;
}
