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

/**
 * Gated by default: this aggregates the 100m 선도소프트 grid per 법정동 and is the
 * most expensive query the app makes, so only ask for it on a screen that
 * actually paints it.
 */
export function useDistrictSupply(enabled = true) {
  return useQuery({
    queryKey: ['districts', 'supply'],
    queryFn: districtsAPI.getSupply,
    enabled,
    staleTime: Infinity,
  });
}
