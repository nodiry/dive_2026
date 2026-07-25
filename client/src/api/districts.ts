import { client } from '@api/client';
import { DistrictBoundary, DistrictDensity, DistrictSupply } from '@shared';
import { z } from 'zod';

export const districtsAPI = {
  getBoundaries: async (): Promise<DistrictBoundary[]> => {
    const res = await client.get('/api/districts/boundaries');
    return z.array(DistrictBoundary).parse(res.data);
  },
  getDensity: async (): Promise<DistrictDensity[]> => {
    const res = await client.get('/api/districts/density');
    return z.array(DistrictDensity).parse(res.data);
  },
  getSupply: async (): Promise<DistrictSupply[]> => {
    const res = await client.get('/api/districts/supply');
    return z.array(DistrictSupply).parse(res.data);
  },
};
