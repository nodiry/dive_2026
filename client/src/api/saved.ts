import { client } from '@api/client';
import { HousingSummary } from '@shared';
import { z } from 'zod';

export const savedAPI = {
  list: async (): Promise<HousingSummary[]> => {
    const res = await client.get('/api/saved');
    return z.array(HousingSummary).parse(res.data);
  },
  save: async (housingId: number): Promise<void> => {
    await client.post(`/api/saved/${housingId}`);
  },
  unsave: async (housingId: number): Promise<void> => {
    await client.delete(`/api/saved/${housingId}`);
  },
};
