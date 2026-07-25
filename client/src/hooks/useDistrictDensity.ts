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

export function useDistrictSupply() {
  return useQuery({
    queryKey: ['districts', 'supply'],
    queryFn: districtsAPI.getSupply,
    staleTime: Infinity,
  });
}
