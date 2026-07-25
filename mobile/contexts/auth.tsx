import * as SecureStore from 'expo-secure-store';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { onUnauthorized } from '@/api/client';
import { setAuthToken } from '@/lib/auth-token';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@/shared/schemas';

const STORAGE_KEY = 'dive2026-auth';

/**
 * The token is a credential, so on device it lives in the Keychain/Keystore.
 * SecureStore has no web implementation, and during static web rendering
 * there is no `localStorage` either, so both fall back safely.
 */
const storage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(STORAGE_KEY);
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  },
  set: async (value: string): Promise<void> => {
    if (Platform.OS !== 'web') return SecureStore.setItemAsync(STORAGE_KEY, value);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
  },
  clear: async (): Promise<void> => {
    if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(STORAGE_KEY);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  },
};

interface AuthValue {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  /** False until the persisted session has been read back from storage. */
  ready: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Per-user server data is cached under keys that don't encode whose data it
 * is (e.g. ['saved']), so it has to be dropped on every identity change or a
 * second account would briefly see the first one's results.
 */
function clearUserScopedCache() {
  queryClient.removeQueries({ queryKey: ['saved'] });
  queryClient.removeQueries({ queryKey: ['ai-conversations'] });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await storage.get();
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as { token: string; user: User };
        if (parsed?.token) {
          setAuthToken(parsed.token);
          setToken(parsed.token);
          setUser(parsed.user ?? null);
        }
      } catch {
        // A corrupt entry should just mean "signed out", not a crash on boot.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(() => {
    clearUserScopedCache();
    setAuthToken(null);
    setToken(null);
    setUser(null);
    void storage.clear();
  }, []);

  const signIn = useCallback(
    (nextToken: string, nextUser: User) => {
      if (user && user.id !== nextUser.id) clearUserScopedCache();
      setAuthToken(nextToken);
      setToken(nextToken);
      setUser(nextUser);
      void storage.set(JSON.stringify({ token: nextToken, user: nextUser }));
    },
    [user],
  );

  // A 401 anywhere means the session died server-side; mirror that locally.
  useEffect(() => onUnauthorized(signOut), [signOut]);

  const value = useMemo<AuthValue>(
    () => ({ token, user, isLoggedIn: token !== null, ready, signIn, signOut }),
    [token, user, ready, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
