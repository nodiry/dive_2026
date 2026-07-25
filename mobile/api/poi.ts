import { z } from 'zod';

import { client } from '@/api/client';
import { PoiCategorySummary } from '@/shared/schemas';

export const poiAPI = {
  getCategories: async (): Promise<PoiCategorySummary[]> => {
    const res = await client.get('/api/poi/categories');
    return z.array(PoiCategorySummary).parse(res.data);
  },
};
