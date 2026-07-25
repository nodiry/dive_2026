import { useQuery } from '@tanstack/react-query';

import { housingAPI } from '@/api/housing';
import type { HousingSearchQuery } from '@/shared/schemas';

export function useHousingSearch(query: HousingSearchQuery) {
  return useQuery({ queryKey: ['housing', query], queryFn: () => housingAPI.search(query) });
}

export function useHousingDetail(id: number) {
  return useQuery({
    queryKey: ['housing', 'detail', id],
    queryFn: () => housingAPI.detail(id),
    enabled: Number.isFinite(id),
  });
}

export function useNeighborhood(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['housing', 'neighborhood', id],
    queryFn: () => housingAPI.neighborhood(id),
    enabled: enabled && Number.isFinite(id),
  });
}
