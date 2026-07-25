import { client } from '@api/client';
import { DistrictDensity } from '@shared';
import { z } from 'zod';

export const districtsAPI = {
  getDensity: async (): Promise<DistrictDensity[]> => {
    const res = await client.get('/api/districts/density');
    return z.array(DistrictDensity).parse(res.data);
  },
};
