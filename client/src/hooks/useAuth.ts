import { authAPI } from '@api/auth';
import type { LoginRequest, SignupRequest } from '@shared';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@stores/useAuthStore';

export function useSignup() {
  return useMutation({ mutationFn: (body: SignupRequest) => authAPI.signup(body) });
}

export function useLogin() {
  return useMutation({ mutationFn: (body: LoginRequest) => authAPI.login(body) });
}

/**
 * Validates the persisted token once on load and refreshes the cached user
 * profile. A stale/invalid token 401s here, and the client.ts response
 * interceptor already clears the auth store on any 401 — no extra handling
 * needed in this hook for that case.
 */
export function useAuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  const query = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => authAPI.me(),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data && token) setAuth(token, query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setAuth is a stable zustand action
  }, [query.data, token]);
}
