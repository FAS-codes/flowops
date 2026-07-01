import axios, { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * The access token lives in memory only (never localStorage) to reduce XSS
 * exposure. The refresh token is an httpOnly cookie the browser sends
 * automatically to /api/auth/refresh.
 */
let accessToken: string | null = null;
let activeOrgId: string | null = localStorage.getItem('flowops.orgId');

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function setActiveOrg(orgId: string | null) {
  activeOrgId = orgId;
  if (orgId) localStorage.setItem('flowops.orgId', orgId);
  else localStorage.removeItem('flowops.orgId');
}
export function getActiveOrg() {
  return activeOrgId;
}

/**
 * In dev, requests go to `/api` and Vite proxies them to the backend. In prod
 * the SPA is served from a different origin than the API, so VITE_API_URL points
 * at the deployed backend (e.g. https://flowops-api.onrender.com/api).
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (activeOrgId) config.headers['X-Organization-Id'] = activeOrgId;
  return config;
});

// --- transparent refresh-on-401 -------------------------------------------
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${API_BASE}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    accessToken = null;
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    const isAuthCall = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

/** Normalizes API error messages for toasts. */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error ?? fallback;
  }
  return fallback;
}
