/**
 * HTTP-клиент для работы с backend API.
 *
 * Особенности:
 * - Автоматический Authorization header
 * - Автоматический refresh при 401
 * - Типизированные ответы
 * - Единая обработка ошибок
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  error?: { code: string; message: string; statusCode: number };
}

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Отправляет httpOnly cookie
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data.accessToken) {
      accessToken = data.data.accessToken;
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Не ставим Content-Type для FormData (браузер сам поставит с boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // 401 → пробуем refresh
  if (res.status === 401 && accessToken) {
    // Один refresh на все параллельные запросы
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  const json = await res.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Ошибка сети', statusCode: res.status },
  }));

  if (!json.success && json.error) {
    throw json.error as ApiError;
  }

  return json as ApiResponse<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url),

  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(url: string) =>
    request<T>(url, { method: 'DELETE' }),

  /** Upload файла через FormData */
  upload: <T>(url: string, formData: FormData) =>
    request<T>(url, {
      method: 'POST',
      body: formData,
      // Content-Type не ставим — браузер сам добавит multipart/form-data
    }),
};

export type { ApiResponse, ApiError };
