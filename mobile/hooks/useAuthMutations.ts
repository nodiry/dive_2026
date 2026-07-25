import { useMutation } from '@tanstack/react-query';

import { authAPI } from '@/api/auth';
import type { LoginRequest, SignupRequest } from '@/shared/schemas';

export function useLogin() {
  return useMutation({ mutationFn: (body: LoginRequest) => authAPI.login(body) });
}

export function useSignup() {
  return useMutation({ mutationFn: (body: SignupRequest) => authAPI.signup(body) });
}
