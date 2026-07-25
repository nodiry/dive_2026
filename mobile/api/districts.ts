import { z } from 'zod';

import { client } from '@/api/client';
import { DistrictDensity } from '@/shared/schemas';

export const districtsAPI = {
  getDensity: async (): Promise<DistrictDensity[]> => {
    const res = await client.get('/api/districts/density');
    return z.array(DistrictDensity).parse(res.data);
  },
};
