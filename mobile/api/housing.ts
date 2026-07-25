import { z } from 'zod';

import { client } from '@/api/client';
import { HousingSummary, NeighborhoodProfile, type HousingSearchQuery } from '@/shared/schemas';

export const housingAPI = {
  search: async (query: HousingSearchQuery): Promise<HousingSummary[]> => {
    const res = await client.get('/api/housing', { params: query });
    return z.array(HousingSummary).parse(res.data);
  },
  detail: async (id: number): Promise<HousingSummary> => {
    const res = await client.get(`/api/housing/${id}`);
    return HousingSummary.parse(res.data);
  },
  neighborhood: async (id: number): Promise<NeighborhoodProfile> => {
    const res = await client.get(`/api/housing/${id}/neighborhood`);
    return NeighborhoodProfile.parse(res.data);
  },
};
