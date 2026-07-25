import { useMutation } from '@tanstack/react-query';

import { recommendationAPI } from '@/api/recommendation';
import type { LifestyleRecommendationRequest } from '@/shared/schemas';

export function useLifestyleRecommendation() {
  return useMutation({
    mutationFn: (body: LifestyleRecommendationRequest) => recommendationAPI.lifestyle(body),
  });
}
