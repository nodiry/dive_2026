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
