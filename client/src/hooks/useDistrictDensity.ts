import { districtsAPI } from '@api/districts';
import { useQuery } from '@tanstack/react-query';

export function useDistrictBoundaries(enabled: boolean) {
  return useQuery({
    queryKey: ['districts', 'boundaries'],
    queryFn: districtsAPI.getBoundaries,
    enabled,
    staleTime: Infinity,
  });
}

export function useDistrictDensity(enabled: boolean) {
  return useQuery({
    queryKey: ['districts', 'density'],
    queryFn: districtsAPI.getDensity,
    enabled,
    staleTime: Infinity,
  });
}

/**
 * Gated by default: this one aggregates the 100m 선도소프트 grid per 법정동, so
 * it is the most expensive query the app makes. Only ask for it on the screens
 * that actually paint it.
 */
export function useDistrictSupply(enabled = true) {
  return useQuery({
    queryKey: ['districts', 'supply'],
    queryFn: districtsAPI.getSupply,
    enabled,
    staleTime: Infinity,
  });
}
