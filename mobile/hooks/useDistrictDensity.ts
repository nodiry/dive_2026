import { useQuery } from '@tanstack/react-query';

import { districtsAPI } from '@/api/districts';

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
