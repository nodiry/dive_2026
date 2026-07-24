import { BASE_URL } from '@constants/api';
import axios, { type AxiosError } from 'axios';

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

client.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string }>) => {
    const message =
      error.response?.data?.error ?? `request failed (${error.response?.status ?? 'network'})`;
    throw new Error(message);
  },
);
