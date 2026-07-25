import { housingAPI } from '@api/housing';
import type { HousingSearchQuery } from '@shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useHousingSearch(query: HousingSearchQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['housing', 'search', query],
    queryFn: () => housingAPI.search(query),
    enabled,
    placeholderData: keepPreviousData,
    // The stock only changes when the DB is reseeded, so a tab-back must not
    // refetch 355 rows and re-fit the map out from under the user.
    staleTime: 5 * 60 * 1000,
  });
}

export function useHousingDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: ['housing', 'detail', id],
    queryFn: () => housingAPI.getById(id),
    enabled,
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
