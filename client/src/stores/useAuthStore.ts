import type { User } from '@shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@api/queryClient';

type AuthStore = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

// Per-user server data cached under keys that don't encode which user they
// belong to (e.g. ['saved']) — must be dropped on every identity change
// (login, switching accounts, logout), or a second account signing in
// on the same browser would flash the first account's cached data.
function clearUserScopedCache() {
  queryClient.removeQueries({ queryKey: ['saved'] });
  queryClient.removeQueries({ queryKey: ['ai-conversations'] });
  queryClient.removeQueries({ queryKey: ['housing-alerts', 'me'] });
}

/**
 * Persists only the bearer token + profile, not any app data — saved
 * housing itself now lives server-side (see hooks/useSaved.ts), keyed off
 * this token via the axios interceptor in api/client.ts.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) =>
        set((state) => {
          if (state.user && state.user.id !== user.id) clearUserScopedCache();
          return { token, user };
        }),
      logout: () => {
        clearUserScopedCache();
        set({ token: null, user: null });
      },
    }),
    { name: 'dive2026-auth' },
  ),
);
