import { z } from 'zod';

import { client } from '@/api/client';
import {
  LifestyleRecommendationResult,
  type LifestyleRecommendationRequest,
} from '@/shared/schemas';

export const recommendationAPI = {
  lifestyle: async (
    body: LifestyleRecommendationRequest,
  ): Promise<LifestyleRecommendationResult[]> => {
    const res = await client.post('/api/recommendations/lifestyle', body);
    return z.array(LifestyleRecommendationResult).parse(res.data);
  },
};
