import { recommendationAPI } from '@api/recommendation';
import type { LifestyleRecommendationRequest } from '@dive2026/shared';
import { useMutation } from '@tanstack/react-query';

export function useLifestyleRecommendation() {
  return useMutation({
    mutationFn: (body: LifestyleRecommendationRequest) => recommendationAPI.lifestyle(body),
  });
}
