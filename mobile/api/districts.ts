import { z } from 'zod';

import { client } from '@/api/client';
import { DistrictDensity, DistrictSupply } from '@/shared/schemas';

export const districtsAPI = {
  getDensity: async (): Promise<DistrictDensity[]> => {
    const res = await client.get('/api/districts/density');
    return z.array(DistrictDensity).parse(res.data);
  },
  getSupply: async (): Promise<DistrictSupply[]> => {
    const res = await client.get('/api/districts/supply');
    return z.array(DistrictSupply).parse(res.data);
  },
};
