import { client } from '@api/client';
import { HousingSearchQuery, HousingSummary, NeighborhoodProfile } from '@dive2026/shared';
import { z } from 'zod';

export const housingAPI = {
  search: async (query: HousingSearchQuery): Promise<HousingSummary[]> => {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value != null && value !== ''),
    );
    const res = await client.get('/api/housing', { params });
    return z.array(HousingSummary).parse(res.data);
  },
  getById: async (id: number): Promise<HousingSummary> => {
    const res = await client.get(`/api/housing/${id}`);
    return HousingSummary.parse(res.data);
  },
  getNeighborhood: async (id: number, radiusMeters = 500): Promise<NeighborhoodProfile> => {
    const res = await client.get(`/api/housing/${id}/neighborhood`, { params: { radiusMeters } });
    return NeighborhoodProfile.parse(res.data);
  },
};
