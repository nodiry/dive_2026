import { client } from '@/api/client';
import { AuthResponse, User, type LoginRequest, type SignupRequest } from '@/shared/schemas';

export const authAPI = {
  login: async (body: LoginRequest): Promise<AuthResponse> => {
    const res = await client.post('/api/auth/login', body);
    return AuthResponse.parse(res.data);
  },
  signup: async (body: SignupRequest): Promise<AuthResponse> => {
    const res = await client.post('/api/auth/signup', body);
    return AuthResponse.parse(res.data);
  },
  me: async (): Promise<User> => {
    const res = await client.get('/api/auth/me');
    return User.parse(res.data);
  },
  /** Invalidates the session server-side; clearing the local token is not enough. */
  logout: async (): Promise<void> => {
    await client.post('/api/auth/logout');
  },
};
