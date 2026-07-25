import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@constants/path';
import { useAuthStore } from '@stores/useAuthStore';

/** Gate for logged-in-only pages (AI search) — redirects guests to login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return (
      <Navigate
        to={ROUTES.Login}
        replace
      />
    );
  }
  return children;
}
