/**
 * Client-Side Authentication & Session Manager
 * Enforces real server-side admin token authorization
 */

export interface AdminUser {
  name: string;
  email: string;
  username: string;
  role: 'ADMIN';
}

const ADMIN_TOKEN_KEY = 'cbt_admin_token';
const ADMIN_USER_KEY = 'cbt_admin_user';

export const getAdminToken = (): string | null => {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminSession = (token: string, user: AdminUser) => {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearAdminSession = () => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const getCachedAdminUser = (): AdminUser | null => {
  try {
    const raw = sessionStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Validates admin session against server
 */
export const verifyAdminSessionOnServer = async (): Promise<{ valid: boolean; user?: AdminUser }> => {
  const token = getAdminToken();
  if (!token) return { valid: false };

  try {
    const res = await fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (res.ok && data.status === 'success' && data.data?.valid) {
      return { valid: true, user: data.data };
    }
    clearAdminSession();
    return { valid: false };
  } catch (err) {
    console.error('Verify admin session failed:', err);
    return { valid: false };
  }
};

/**
 * Helper to get authorization headers for admin requests
 */
export const getAdminAuthHeaders = (): Record<string, string> => {
  const token = getAdminToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Safe fetch helper for admin API requests
 */
export const adminFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = getAdminToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
};

