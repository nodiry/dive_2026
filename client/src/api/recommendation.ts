import { client } from '@api/client';
import { LifestyleRecommendationRequest, LifestyleRecommendationResult } from '@shared';
import { z } from 'zod';

export const recommendationAPI = {
  lifestyle: async (
    body: LifestyleRecommendationRequest,
  ): Promise<LifestyleRecommendationResult[]> => {
    const res = await client.post('/api/recommendations/lifestyle', body);
    return z.array(LifestyleRecommendationResult).parse(res.data);
  },
};
