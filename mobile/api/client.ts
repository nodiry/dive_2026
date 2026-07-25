import axios, { type AxiosError } from 'axios';

import { BASE_URL } from '@/constants/api';
import { getAuthToken, setAuthToken } from '@/lib/auth-token';

export const client = axios.create({ baseURL: BASE_URL, timeout: 60_000 });

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Listeners let the auth provider react to a session being rejected server-side. */
const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

client.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    if (error.response?.status === 401) {
      // The stored session is gone server-side, so drop it here too rather
      // than leaving the UI claiming the user is signed in.
      setAuthToken(null);
      unauthorizedListeners.forEach((listener) => listener());
    }
    const message =
      error.response?.data?.error ??
      error.response?.data?.detail ??
      `요청에 실패했습니다 (${error.response?.status ?? 'network'})`;
    throw new Error(message);
  },
);
