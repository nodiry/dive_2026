import { client } from '@api/client';
import { GameSession, GameSummary } from '@shared';
import { z } from 'zod';

export const gameAPI = {
  create: async (body: { theme?: string; conversationId?: string }): Promise<GameSession> => {
    const res = await client.post('/api/games', body);
    return GameSession.parse(res.data);
  },
  list: async (): Promise<GameSummary[]> => {
    const res = await client.get('/api/games');
    return z.array(GameSummary).parse(res.data);
  },
  get: async (id: string): Promise<GameSession> => {
    const res = await client.get(`/api/games/${id}`);
    return GameSession.parse(res.data);
  },
  saveProgress: async (id: string, answers: Record<string, string>): Promise<GameSession> => {
    const res = await client.patch(`/api/games/${id}/answers`, { answers });
    return GameSession.parse(res.data);
  },
  answer: async (id: string, answers: Record<string, string>): Promise<GameSession> => {
    const res = await client.post(`/api/games/${id}/answers`, { answers });
    return GameSession.parse(res.data);
  },
};
