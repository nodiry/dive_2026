import { useAuthStore } from '@stores/useAuthStore';
import { BASE_URL } from '@constants/api';
import axios, { type AxiosError } from 'axios';

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    if (error.response?.status === 401) {
      // A 401 means the stored session is gone/expired server-side — drop it
      // client-side too so the UI stops claiming the user is logged in.
      useAuthStore.getState().logout();
    }
    const message =
      error.response?.data?.error ??
      error.response?.data?.detail ??
      `request failed (${error.response?.status ?? 'network'})`;
    throw new Error(message);
  },
);
