import { housingAPI } from '@api/housing';
import type { HousingSearchQuery } from '@shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useHousingSearch(query: HousingSearchQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['housing', 'search', query],
    queryFn: () => housingAPI.search(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useHousingDetail(id: number) {
  return useQuery({
    queryKey: ['housing', 'detail', id],
    queryFn: () => housingAPI.getById(id),
  });
}

export function useNeighborhood(id: number, enabled: boolean, radiusMeters = 500) {
  return useQuery({
    queryKey: ['housing', 'neighborhood', id, radiusMeters],
    queryFn: () => housingAPI.getNeighborhood(id, radiusMeters),
    enabled,
    staleTime: Infinity,
  });
}
