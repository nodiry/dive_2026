import { client } from '@api/client';
import { AuthResponse, type LoginRequest, type SignupRequest, User } from '@shared';

export const authAPI = {
  signup: async (body: SignupRequest): Promise<AuthResponse> => {
    const res = await client.post('/api/auth/signup', body);
    return AuthResponse.parse(res.data);
  },
  login: async (body: LoginRequest): Promise<AuthResponse> => {
    const res = await client.post('/api/auth/login', body);
    return AuthResponse.parse(res.data);
  },
  me: async (): Promise<User> => {
    const res = await client.get('/api/auth/me');
    return User.parse(res.data);
  },
  logout: async (): Promise<void> => {
    await client.post('/api/auth/logout');
  },
};
